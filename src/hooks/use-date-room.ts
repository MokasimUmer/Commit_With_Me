"use client";

import NDK, { NDKEvent, NDKKind, type NDKFilter } from "@nostr-dev-kit/ndk";
import { useEffect, useMemo, useRef } from "react";
import {
  KIND_CODE_SYNC,
  KIND_CURSOR_SYNC,
  KIND_PRESENCE,
  KIND_ROOM_CHAT,
  KIND_TYPING,
} from "@/lib/constants";
import { upsertSession } from "@/lib/db/schema";
import { transientEventCache } from "@/lib/nostr/lru";
import { pruneRoomEphemera, useRoomStore } from "@/lib/stores/room";
import { useSessionStore } from "@/lib/stores/session";
import type {
  CodeSyncContent,
  CursorSyncContent,
  PresenceContent,
  RoomChatContent,
} from "@/lib/types";
import { safeJsonParse } from "@/lib/utils";
import { useNDK } from "./use-ndk";

const STARTER_CODE = `// shared buffer — ephemeral (kinds 28282–28286)
// last write wins on revision

export {}
`;

function publishEphemeral(
  ndk: NDK,
  kind: number,
  roomId: string,
  action: string,
  content: unknown,
) {
  const event = new NDKEvent(ndk);
  event.kind = kind;
  event.content = JSON.stringify(content);
  event.tags = [
    ["d", roomId],
    ["action", action],
    ["t", "nostr-dating"],
  ];
  void event.publish().catch(() => {
    // Relays may drop ephemeral events; the local LRU still has the latest state.
  });
}

export function useDateRoom(roomId: string) {
  const { ndk, ready } = useNDK();
  const pubkey = useSessionStore((state) => state.pubkey);
  const room = useRoomStore();
  const lastCodePublish = useRef(0);
  const lastCursorPublish = useRef(0);

  useEffect(() => {
    useRoomStore.getState().reset(roomId);
    if (!useRoomStore.getState().code) {
      useRoomStore.getState().setDocument({
        code: STARTER_CODE,
        file: "index.ts",
        language: "typescript",
        revision: 1,
      });
    }
  }, [roomId]);

  useEffect(() => {
    if (!ndk || !ready) return;

    const filter: NDKFilter = {
      kinds: [
        KIND_CURSOR_SYNC,
        KIND_PRESENCE,
        KIND_TYPING,
        KIND_CODE_SYNC,
        KIND_ROOM_CHAT,
      ] as unknown as NDKKind[],
      "#d": [roomId],
    };

    const sub = ndk.subscribe(filter, { closeOnEose: false });
    sub.on("event", (event: NDKEvent) => {
      if (!event.id || transientEventCache.touch(event.id)) return;
      if (event.pubkey === pubkey) return;

      if (event.kind === KIND_CURSOR_SYNC) {
        const payload = safeJsonParse<CursorSyncContent>(event.content, {
          file: "index.ts",
          line: 0,
          col: 0,
        });
        useRoomStore.getState().setCursor({
          pubkey: event.pubkey,
          file: payload.file,
          line: payload.line,
          col: payload.col,
          selection: payload.selection,
          updatedAt: Date.now(),
        });
        return;
      }

      if (event.kind === KIND_PRESENCE) {
        const payload = safeJsonParse<PresenceContent>(event.content, { status: "online" });
        useRoomStore.getState().setPeer({
          pubkey: event.pubkey,
          displayName: payload.displayName,
          status: payload.status,
          lastSeen: Date.now(),
        });
        return;
      }

      if (event.kind === KIND_TYPING) {
        useRoomStore.getState().setTyping(event.pubkey, Date.now());
        return;
      }

      if (event.kind === KIND_CODE_SYNC) {
        const payload = safeJsonParse<CodeSyncContent>(event.content, {
          file: "index.ts",
          language: "typescript",
          content: "",
          revision: 0,
        });
        const current = useRoomStore.getState();
        if (payload.revision < current.revision) return;
        useRoomStore.getState().setDocument({
          file: payload.file,
          language: payload.language,
          code: payload.content,
          revision: payload.revision,
        });
        void upsertSession({
          roomId,
          title: "Pairing session",
          description: "",
          partnerPubkey: event.pubkey,
          startedAt: Math.floor(Date.now() / 1000),
          lastCode: payload.content,
          lastFile: payload.file,
          lastLanguage: payload.language,
        });
        return;
      }

      if (event.kind === KIND_ROOM_CHAT) {
        const payload = safeJsonParse<RoomChatContent>(event.content, { text: "" });
        if (!payload.text) return;
        useRoomStore.getState().addMessage({
          id: event.id,
          pubkey: event.pubkey,
          text: payload.text,
          createdAt: (event.created_at ?? Math.floor(Date.now() / 1000)) * 1000,
        });
      }
    });

    return () => sub.stop();
  }, [ndk, ready, roomId, pubkey]);

  useEffect(() => {
    if (!ndk || !ready || !pubkey) return;

    publishEphemeral(ndk, KIND_PRESENCE, roomId, "presence", {
      status: "online",
    });

    const heartbeat = window.setInterval(() => {
      publishEphemeral(ndk, KIND_PRESENCE, roomId, "presence", { status: "online" });
      pruneRoomEphemera();
    }, 8_000);

    return () => window.clearInterval(heartbeat);
  }, [ndk, ready, pubkey, roomId]);

  const peers = useMemo(() => Object.values(room.peers), [room.peers]);
  const cursors = useMemo(() => Object.values(room.cursors), [room.cursors]);
  const typingPubkeys = useMemo(
    () => Object.keys(room.typing).filter((key) => key !== pubkey),
    [room.typing, pubkey],
  );

  function updateCode(code: string) {
    const revision = useRoomStore.getState().revision + 1;
    useRoomStore.getState().setDocument({ code, revision });
    if (!ndk) return;
    const now = Date.now();
    if (now - lastCodePublish.current < 400) return;
    lastCodePublish.current = now;
    publishEphemeral(ndk, KIND_CODE_SYNC, roomId, "code_sync", {
      file: useRoomStore.getState().file,
      language: useRoomStore.getState().language,
      content: code,
      revision,
    } satisfies CodeSyncContent);
  }

  function updateCursor(cursor: CursorSyncContent) {
    if (!ndk || !pubkey) return;
    const now = Date.now();
    if (now - lastCursorPublish.current < 80) return;
    lastCursorPublish.current = now;
    publishEphemeral(ndk, KIND_CURSOR_SYNC, roomId, "cursor_sync", cursor);
  }

  function sendChat(text: string) {
    const trimmed = text.trim();
    if (!trimmed || !ndk || !pubkey) return;
    useRoomStore.getState().addMessage({
      id: crypto.randomUUID(),
      pubkey,
      text: trimmed,
      createdAt: Date.now(),
    });
    publishEphemeral(ndk, KIND_ROOM_CHAT, roomId, "chat", { text: trimmed });
  }

  function markTyping() {
    if (!ndk) return;
    publishEphemeral(ndk, KIND_TYPING, roomId, "typing", { at: Date.now() });
  }

  return {
    ...room,
    peers,
    cursors,
    typingPubkeys,
    updateCode,
    updateCursor,
    sendChat,
    markTyping,
  };
}
