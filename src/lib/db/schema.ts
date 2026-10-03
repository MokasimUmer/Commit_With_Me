import Dexie, { type Table } from "dexie";
import type { DateSession, DevProfile, Invite, ZapRecord } from "@/lib/types";

export interface SeenEvent {
  id: string;
  kind: number;
  seenAt: number;
}

export class CommitWithMeDB extends Dexie {
  devProfiles!: Table<DevProfile, string>;
  invites!: Table<Invite, string>;
  sessions!: Table<DateSession, string>;
  zaps!: Table<ZapRecord, string>;
  seenEvents!: Table<SeenEvent, string>;

  constructor() {
    super("commit-with-me-views");

    this.version(1).stores({
      devProfiles: "pubkey, updatedAt, experience, pairStyle, *tech, nip05Valid",
      invites: "id, proposalId, roomId, direction, status, fromPubkey, toPubkey, createdAt",
      sessions: "roomId, partnerPubkey, startedAt",
      zaps: "id, roomId, fromPubkey, createdAt",
      seenEvents: "id, kind, seenAt",
    });
  }
}

function createDb() {
  if (typeof window === "undefined") {
    return null;
  }
  return new CommitWithMeDB();
}

export const db = createDb();

export function requireDb(): CommitWithMeDB {
  if (!db) {
    throw new Error("IndexedDB is only available in the browser.");
  }
  return db;
}

export async function markSeen(id: string, kind: number): Promise<boolean> {
  const local = requireDb();
  const existing = await local.seenEvents.get(id);
  if (existing) return false;
  await local.seenEvents.put({ id, kind, seenAt: Date.now() });
  return true;
}

export async function upsertProfile(profile: DevProfile): Promise<void> {
  const local = requireDb();
  const current = await local.devProfiles.get(profile.pubkey);
  if (current && current.updatedAt > profile.updatedAt) return;
  await local.devProfiles.put(profile);
}

export async function upsertInvite(invite: Invite): Promise<void> {
  const local = requireDb();
  const current = await local.invites
    .where("proposalId")
    .equals(invite.proposalId)
    .first();

  if (!current) {
    await local.invites.put(invite);
    return;
  }

  const merged: Invite = {
    ...current,
    ...invite,
    id: current.id,
    status:
      current.status !== "pending" && invite.status === "pending"
        ? current.status
        : invite.status,
    title: invite.title || current.title,
    description: invite.description || current.description,
    roomId: invite.roomId || current.roomId,
  };
  await local.invites.put(merged);
}

export async function updateInviteStatus(
  proposalId: string,
  status: Invite["status"],
): Promise<void> {
  const local = requireDb();
  const matches = await local.invites.where("proposalId").equals(proposalId).toArray();
  await Promise.all(
    matches.map((invite) => local.invites.update(invite.id, { status })),
  );
}

export async function upsertSession(session: DateSession): Promise<void> {
  const local = requireDb();
  const current = await local.sessions.get(session.roomId);
  await local.sessions.put({ ...current, ...session });
}

export async function upsertZap(zap: ZapRecord): Promise<void> {
  const local = requireDb();
  await local.zaps.put(zap);
}
