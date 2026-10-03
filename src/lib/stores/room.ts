import { create } from "zustand";
import type { RemoteCursor, RoomMessage, RoomPeer } from "@/lib/types";

interface RoomState {
  roomId: string | null;
  file: string;
  language: string;
  code: string;
  revision: number;
  cursors: Record<string, RemoteCursor>;
  peers: Record<string, RoomPeer>;
  typing: Record<string, number>;
  messages: RoomMessage[];
  setDocument: (patch: Partial<Pick<RoomState, "file" | "language" | "code" | "revision">>) => void;
  setCursor: (cursor: RemoteCursor) => void;
  setPeer: (peer: RoomPeer) => void;
  setTyping: (pubkey: string, at: number) => void;
  addMessage: (message: RoomMessage) => void;
  reset: (roomId: string) => void;
}

const PEER_TTL_MS = 20_000;
const TYPING_TTL_MS = 4_000;
const MAX_MESSAGES = 200;

export const useRoomStore = create<RoomState>((set) => ({
  roomId: null,
  file: "index.ts",
  language: "typescript",
  code: "",
  revision: 0,
  cursors: {},
  peers: {},
  typing: {},
  messages: [],
  setDocument: (patch) =>
    set((state) => ({
      ...state,
      ...patch,
    })),
  setCursor: (cursor) =>
    set((state) => ({
      cursors: { ...state.cursors, [cursor.pubkey]: cursor },
    })),
  setPeer: (peer) =>
    set((state) => ({
      peers: { ...state.peers, [peer.pubkey]: peer },
    })),
  setTyping: (pubkey, at) =>
    set((state) => ({
      typing: { ...state.typing, [pubkey]: at },
    })),
  addMessage: (message) =>
    set((state) => {
      if (state.messages.some((item) => item.id === message.id)) return state;
      return {
        messages: [...state.messages, message].slice(-MAX_MESSAGES),
      };
    }),
  reset: (roomId) =>
    set({
      roomId,
      file: "index.ts",
      language: "typescript",
      code: "",
      revision: 0,
      cursors: {},
      peers: {},
      typing: {},
      messages: [],
    }),
}));

export function pruneRoomEphemera(): void {
  const now = Date.now();
  useRoomStore.setState((state) => {
    const peers = Object.fromEntries(
      Object.entries(state.peers).filter(([, peer]) => now - peer.lastSeen < PEER_TTL_MS),
    );
    const typing = Object.fromEntries(
      Object.entries(state.typing).filter(([, at]) => now - at < TYPING_TTL_MS),
    );
    const cursors = Object.fromEntries(
      Object.entries(state.cursors).filter(([, cursor]) => now - cursor.updatedAt < PEER_TTL_MS),
    );
    return { peers, typing, cursors };
  });
}
