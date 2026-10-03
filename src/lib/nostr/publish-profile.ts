import { NDKEvent } from "@nostr-dev-kit/ndk";
import {
  APP_TAG,
  KIND_DEV_PROFILE,
  KIND_METADATA,
  PROFILE_D_TAG,
} from "@/lib/constants";
import { upsertProfile } from "@/lib/db/schema";
import type { DevProfileContent, ProfileDraft } from "@/lib/types";
import { getNDK } from "./ndk";

export async function publishDeveloperProfile(pubkey: string, draft: ProfileDraft) {
  const ndk = getNDK();
  if (!ndk.signer) throw new Error("Connect a NIP-07 signer first.");

  const content: DevProfileContent = {
    headline: draft.headline.trim(),
    bio: draft.bio.trim(),
    github: draft.github.trim(),
    project_ideas: draft.projectIdeas
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
    interests: draft.interests
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  };

  const profileEvent = new NDKEvent(ndk);
  profileEvent.kind = KIND_DEV_PROFILE;
  profileEvent.content = JSON.stringify(content);
  profileEvent.tags = [
    ["d", PROFILE_D_TAG],
    ["t", APP_TAG],
    ["pair_style", draft.pairStyle],
    ["experience", draft.experience],
    ...draft.tech.map((tech) => ["tech", tech]),
  ];
  await profileEvent.publish();

  if (draft.name || draft.picture || draft.nip05 || draft.lud16 || draft.bio) {
    const metadata = new NDKEvent(ndk);
    metadata.kind = KIND_METADATA;
    metadata.content = JSON.stringify({
      name: draft.name || undefined,
      about: draft.bio || undefined,
      picture: draft.picture || undefined,
      nip05: draft.nip05 || undefined,
      lud16: draft.lud16 || undefined,
    });
    await metadata.publish();
  }

  await upsertProfile({
    pubkey,
    eventId: profileEvent.id,
    headline: content.headline,
    bio: content.bio,
    github: content.github,
    projectIdeas: content.project_ideas,
    interests: content.interests,
    tech: draft.tech,
    pairStyle: draft.pairStyle,
    experience: draft.experience,
    name: draft.name || undefined,
    picture: draft.picture || undefined,
    nip05: draft.nip05 || undefined,
    lud16: draft.lud16 || undefined,
    npub: "",
    createdAt: profileEvent.created_at ?? Math.floor(Date.now() / 1000),
    updatedAt: profileEvent.created_at ?? Math.floor(Date.now() / 1000),
  });
}
