import NDK, { NDKEvent, NDKKind, type NDKFilter } from "@nostr-dev-kit/ndk";
import { nip05, nip19 } from "nostr-tools";
import {
  APP_TAG,
  KIND_DEV_PROFILE,
  KIND_GIFT_WRAP,
  KIND_METADATA,
  KIND_ZAP_RECEIPT,
  PROFILE_D_TAG,
} from "@/lib/constants";
import {
  markSeen,
  upsertInvite,
  upsertProfile,
  upsertZap,
  updateInviteStatus,
} from "@/lib/db/schema";
import type { DevProfile, DevProfileContent, Invite } from "@/lib/types";
import { safeJsonParse } from "@/lib/utils";
import { parseInvitePayload, unwrapGift } from "./gift-wrap";
import { ingestEventCache } from "./lru";

const METADATA_KIND = KIND_METADATA as NDKKind;
const PROFILE_KIND = KIND_DEV_PROFILE as NDKKind;
const WRAP_KIND = KIND_GIFT_WRAP as NDKKind;
const ZAP_KIND = KIND_ZAP_RECEIPT as NDKKind;

let profilesStarted = false;
let inboxPubkey: string | null = null;
const pendingNip05 = new Set<string>();

function tagValues(event: NDKEvent, name: string): string[] {
  return event.tags.filter((tag) => tag[0] === name && tag[1]).map((tag) => tag[1] as string);
}

function firstTag(event: NDKEvent, name: string): string | undefined {
  return tagValues(event, name)[0];
}

export function profileFromEvent(
  event: NDKEvent,
  extras: Partial<DevProfile> = {},
): DevProfile | null {
  if (!event.pubkey || event.kind !== KIND_DEV_PROFILE) return null;
  if (firstTag(event, "d") !== PROFILE_D_TAG) return null;

  const content = safeJsonParse<DevProfileContent>(event.content, {
    headline: "",
    bio: "",
    github: "",
    project_ideas: [],
    interests: [],
  });

  return {
    pubkey: event.pubkey,
    eventId: event.id,
    headline: content.headline ?? "",
    bio: content.bio ?? "",
    github: content.github ?? "",
    projectIdeas: content.project_ideas ?? [],
    interests: content.interests ?? [],
    tech: tagValues(event, "tech"),
    pairStyle: firstTag(event, "pair_style") ?? "driver-navigator",
    experience: firstTag(event, "experience") ?? "mid",
    npub: extras.npub ?? nip19.npubEncode(event.pubkey),
    createdAt: event.created_at ?? Math.floor(Date.now() / 1000),
    updatedAt: event.created_at ?? Math.floor(Date.now() / 1000),
    ...extras,
  };
}

async function verifyNip05(pubkey: string, address: string): Promise<boolean> {
  try {
    const profile = await nip05.queryProfile(address);
    return profile?.pubkey === pubkey;
  } catch {
    return false;
  }
}

async function hydrateKind0(ndk: NDK, profile: DevProfile): Promise<DevProfile> {
  try {
    const user = ndk.getUser({ pubkey: profile.pubkey });
    await user.fetchProfile();
    const meta = user.profile;
    if (!meta) return profile;

    const next: DevProfile = {
      ...profile,
      name: meta.name ?? meta.displayName ?? profile.name,
      picture: meta.picture ?? meta.image ?? profile.picture,
      about: meta.about ?? profile.about,
      nip05: meta.nip05 ?? profile.nip05,
      lud16: meta.lud16 ?? profile.lud16,
      npub: user.npub ?? profile.npub,
    };

    if (next.nip05 && !pendingNip05.has(next.pubkey)) {
      pendingNip05.add(next.pubkey);
      next.nip05Valid = await verifyNip05(next.pubkey, next.nip05);
    }

    return next;
  } catch {
    return profile;
  }
}

async function ingestProfile(ndk: NDK, event: NDKEvent): Promise<void> {
  if (ingestEventCache.touch(event.id)) return;
  const fresh = await markSeen(event.id, event.kind ?? KIND_DEV_PROFILE);
  if (!fresh) return;

  const parsed = profileFromEvent(event);
  if (!parsed) return;

  const hydrated = await hydrateKind0(ndk, parsed);
  await upsertProfile(hydrated);
}

async function ingestInvite(ndk: NDK, event: NDKEvent, selfPubkey: string): Promise<void> {
  if (ingestEventCache.touch(event.id)) return;
  if (!ndk.signer) return;

  try {
    const rumor = await unwrapGift(event, ndk.signer);
    const payload = parseInvitePayload(rumor.content);
    if (!payload) return;

    const fromPubkey = rumor.pubkey;
    const toPubkey =
      rumor.tags.find((tag) => tag[0] === "p")?.[1] ??
      event.tags.find((tag) => tag[0] === "p")?.[1] ??
      selfPubkey;

    if (payload.type === "DATE_INVITE") {
      const invite: Invite = {
        id: event.id,
        rumorId: rumor.id,
        direction: fromPubkey === selfPubkey ? "outgoing" : "incoming",
        fromPubkey,
        toPubkey,
        proposalId: payload.proposal_id,
        title: payload.title,
        description: payload.description,
        scheduledAt: payload.scheduled_at,
        repoUrl: payload.repo_url,
        roomId: payload.room_id,
        status: "pending",
        createdAt: rumor.created_at ?? event.created_at ?? Math.floor(Date.now() / 1000),
      };
      await upsertInvite(invite);
      return;
    }

    await updateInviteStatus(payload.proposal_id, payload.status);
  } catch {
    // Gift wraps addressed to other people (or old NIP-04 only signers) are ignored.
  }
}

function zapAmount(event: NDKEvent): number {
  const description = firstTag(event, "description");
  if (description) {
    const request = safeJsonParse<{ tags?: string[][] }>(description, {});
    const amountTag = request.tags?.find((tag) => tag[0] === "amount")?.[1];
    if (amountTag) return Math.round(Number(amountTag) / 1000);
  }
  const bolt11 = firstTag(event, "bolt11") ?? "";
  const match = bolt11.match(/lnbc(\d+)([munp]?)/i);
  if (!match) return 0;
  const value = Number(match[1]);
  const unit = match[2];
  if (unit === "m") return Math.round(value * 100_000);
  if (unit === "u") return Math.round(value * 100);
  if (unit === "n") return Math.round(value / 10);
  if (unit === "p") return Math.round(value / 10_000);
  return value;
}

async function ingestZap(event: NDKEvent): Promise<void> {
  if (ingestEventCache.touch(event.id)) return;
  const fresh = await markSeen(event.id, KIND_ZAP_RECEIPT);
  if (!fresh) return;

  const roomId = firstTag(event, "d") ?? firstTag(event, "e");
  await upsertZap({
    id: event.id,
    roomId,
    fromPubkey: firstTag(event, "P") ?? event.pubkey,
    toPubkey: firstTag(event, "p"),
    amountSats: zapAmount(event),
    comment: event.content || undefined,
    createdAt: event.created_at ?? Math.floor(Date.now() / 1000),
  });
}

export function startEventIngest(ndk: NDK, selfPubkey?: string): void {
  if (!profilesStarted) {
    profilesStarted = true;

    const profileFilter: NDKFilter = {
      kinds: [PROFILE_KIND],
      "#t": [APP_TAG],
      "#d": [PROFILE_D_TAG],
    };

    const profileSub = ndk.subscribe(profileFilter, {
      closeOnEose: false,
      groupable: true,
    });
    profileSub.on("event", (event: NDKEvent) => {
      void ingestProfile(ndk, event);
    });

    const metadataSub = ndk.subscribe({ kinds: [METADATA_KIND] }, { closeOnEose: false });
    metadataSub.on("event", (event: NDKEvent) => {
      if (!event.pubkey) return;
      void (async () => {
        const { db } = await import("@/lib/db/schema");
        const existing = await db?.devProfiles.get(event.pubkey);
        if (!existing) return;
        const hydrated = await hydrateKind0(ndk, existing);
        await upsertProfile(hydrated);
      })();
    });
  }

  if (selfPubkey && inboxPubkey !== selfPubkey) {
    inboxPubkey = selfPubkey;
    const inboxSub = ndk.subscribe(
      { kinds: [WRAP_KIND], "#p": [selfPubkey] },
      { closeOnEose: false },
    );
    inboxSub.on("event", (event: NDKEvent) => {
      void ingestInvite(ndk, event, selfPubkey);
    });

    const zapSub = ndk.subscribe(
      { kinds: [ZAP_KIND], "#p": [selfPubkey] },
      { closeOnEose: false },
    );
    zapSub.on("event", (event: NDKEvent) => {
      void ingestZap(event);
    });
  }
}

export function resetIngestFlag(): void {
  profilesStarted = false;
  inboxPubkey = null;
}
