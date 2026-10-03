"use client";

import { NDKEvent } from "@nostr-dev-kit/ndk";
import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import { db, updateInviteStatus, upsertInvite, upsertSession } from "@/lib/db/schema";
import { wrapInvite } from "@/lib/nostr/gift-wrap";
import type { DateInvitePayload, Invite } from "@/lib/types";
import { useNDK } from "./use-ndk";
import { useSessionStore } from "@/lib/stores/session";

export function useInvites() {
  const { ndk } = useNDK();
  const pubkey = useSessionStore((state) => state.pubkey);

  const invites = useLiveQuery(async () => {
    if (!db || !pubkey) return [];
    return db.invites.orderBy("createdAt").reverse().toArray();
  }, [pubkey]);

  const incoming = (invites ?? []).filter((invite) => invite.direction === "incoming");
  const outgoing = (invites ?? []).filter((invite) => invite.direction === "outgoing");
  const pendingCount = incoming.filter((invite) => invite.status === "pending").length;

  async function sendInvite(input: {
    recipientPubkey: string;
    title: string;
    description: string;
    scheduledAt: number;
    repoUrl: string;
  }): Promise<string> {
    if (!ndk?.signer || !pubkey) {
      throw new Error("Connect a NIP-07 signer before sending invites.");
    }

    const payload: DateInvitePayload = {
      type: "DATE_INVITE",
      proposal_id: crypto.randomUUID(),
      title: input.title,
      description: input.description,
      scheduled_at: input.scheduledAt,
      repo_url: input.repoUrl,
      room_id: `cwm-${crypto.randomUUID()}`,
    };

    const { recipientWrap, selfWrap } = await wrapInvite({
      payload,
      recipientPubkey: input.recipientPubkey,
      senderPubkey: pubkey,
      signer: ndk.signer,
    });

    await Promise.all([
      recipientWrap.publish(),
      selfWrap.publish(),
    ]);

    await upsertInvite({
      id: selfWrap.id || payload.proposal_id,
      rumorId: payload.proposal_id,
      direction: "outgoing",
      fromPubkey: pubkey,
      toPubkey: input.recipientPubkey,
      proposalId: payload.proposal_id,
      title: payload.title,
      description: payload.description,
      scheduledAt: payload.scheduled_at,
      repoUrl: payload.repo_url,
      roomId: payload.room_id,
      status: "pending",
      createdAt: Math.floor(Date.now() / 1000),
    });

    toast.success("Date invite gift-wrapped and published.");
    return payload.room_id;
  }

  async function respond(invite: Invite, status: "accepted" | "declined", note?: string) {
    if (!ndk?.signer || !pubkey) {
      throw new Error("Connect a NIP-07 signer first.");
    }

    const { recipientWrap, selfWrap } = await wrapInvite({
      payload: {
        type: "DATE_RESPONSE",
        proposal_id: invite.proposalId,
        status,
        room_id: invite.roomId,
        note,
      },
      recipientPubkey: invite.fromPubkey,
      senderPubkey: pubkey,
      signer: ndk.signer,
    });

    await Promise.all([recipientWrap.publish(), selfWrap.publish()]);
    await updateInviteStatus(invite.proposalId, status);

    if (status === "accepted") {
      await upsertSession({
        roomId: invite.roomId,
        title: invite.title,
        description: invite.description,
        partnerPubkey: invite.fromPubkey,
        repoUrl: invite.repoUrl,
        startedAt: Math.floor(Date.now() / 1000),
      });
    }

    toast.success(status === "accepted" ? "You accepted the pairing date." : "Invite declined.");
  }

  async function publishEphemeralAck(roomId: string) {
    if (!ndk?.signer) return;
    const event = new NDKEvent(ndk);
    event.kind = 28283;
    event.content = JSON.stringify({ status: "online" });
    event.tags = [
      ["d", roomId],
      ["action", "presence"],
    ];
    await event.publish();
  }

  return {
    incoming,
    outgoing,
    pendingCount,
    loading: invites === undefined,
    sendInvite,
    respond,
    publishEphemeralAck,
  };
}
