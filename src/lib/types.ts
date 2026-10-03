import type { ExperienceLevel, PairStyle } from "./constants";

export interface DevProfileContent {
  headline: string;
  bio: string;
  github: string;
  project_ideas: string[];
  interests: string[];
}

export interface DateInvitePayload {
  type: "DATE_INVITE";
  proposal_id: string;
  title: string;
  description: string;
  scheduled_at: number;
  repo_url: string;
  room_id: string;
}

export interface DateResponsePayload {
  type: "DATE_RESPONSE";
  proposal_id: string;
  status: "accepted" | "declined";
  room_id: string;
  note?: string;
}

export type InvitePayload = DateInvitePayload | DateResponsePayload;

export interface CursorSyncContent {
  file: string;
  line: number;
  col: number;
  selection?: string;
}

export interface CodeSyncContent {
  file: string;
  language: string;
  content: string;
  revision: number;
}

export interface PresenceContent {
  status: "online" | "away";
  displayName?: string;
}

export interface RoomChatContent {
  text: string;
}

export interface DevProfile {
  pubkey: string;
  eventId: string;
  headline: string;
  bio: string;
  github: string;
  projectIdeas: string[];
  interests: string[];
  tech: string[];
  pairStyle: PairStyle | string;
  experience: ExperienceLevel | string;
  name?: string;
  picture?: string;
  about?: string;
  nip05?: string;
  nip05Valid?: boolean;
  lud16?: string;
  npub: string;
  createdAt: number;
  updatedAt: number;
}

export interface Invite {
  id: string;
  rumorId: string;
  direction: "incoming" | "outgoing";
  fromPubkey: string;
  toPubkey: string;
  proposalId: string;
  title: string;
  description: string;
  scheduledAt: number;
  repoUrl: string;
  roomId: string;
  status: "pending" | "accepted" | "declined";
  createdAt: number;
  note?: string;
}

export interface DateSession {
  roomId: string;
  title: string;
  description: string;
  partnerPubkey: string;
  repoUrl?: string;
  startedAt: number;
  lastCode?: string;
  lastFile?: string;
  lastLanguage?: string;
}

export interface ZapRecord {
  id: string;
  roomId?: string;
  fromPubkey: string;
  toPubkey?: string;
  amountSats: number;
  comment?: string;
  createdAt: number;
}

export interface RemoteCursor {
  pubkey: string;
  file: string;
  line: number;
  col: number;
  selection?: string;
  updatedAt: number;
}

export interface RoomPeer {
  pubkey: string;
  displayName?: string;
  status: "online" | "away";
  lastSeen: number;
}

export interface RoomMessage {
  id: string;
  pubkey: string;
  text: string;
  createdAt: number;
}

export interface ProfileDraft {
  headline: string;
  bio: string;
  github: string;
  projectIdeas: string;
  interests: string;
  tech: string[];
  pairStyle: PairStyle;
  experience: ExperienceLevel;
  name: string;
  picture: string;
  nip05: string;
  lud16: string;
}
