import {
  giftUnwrap,
  giftWrap,
  NDKEvent,
  NDKUser,
  type NDKSigner,
} from "@nostr-dev-kit/ndk";
import { KIND_PRIVATE_DM } from "@/lib/constants";
import type { InvitePayload } from "@/lib/types";
import { getNDK } from "./ndk";

export async function wrapInvite(options: {
  payload: InvitePayload;
  recipientPubkey: string;
  senderPubkey: string;
  signer: NDKSigner;
}): Promise<{ recipientWrap: NDKEvent; selfWrap: NDKEvent; rumor: NDKEvent }> {
  const ndk = getNDK();
  const recipient = new NDKUser({ pubkey: options.recipientPubkey });
  recipient.ndk = ndk;
  const sender = new NDKUser({ pubkey: options.senderPubkey });
  sender.ndk = ndk;

  const rumor = new NDKEvent(ndk);
  rumor.kind = KIND_PRIVATE_DM;
  rumor.created_at = Math.floor(Date.now() / 1000);
  rumor.pubkey = options.senderPubkey;
  rumor.content = JSON.stringify(options.payload);
  rumor.tags = [
    ["p", options.recipientPubkey],
    ["t", "nostr-dating"],
    ["l", options.payload.type],
    ["e", options.payload.proposal_id, "", "proposal"],
  ];

  const recipientWrap = await giftWrap(rumor, recipient, options.signer, {
    scheme: "nip44",
    wrapTags: [
      ["t", "nostr-dating"],
      ["l", options.payload.type],
    ],
  });
  const selfWrap = await giftWrap(rumor, sender, options.signer, {
    scheme: "nip44",
    wrapTags: [
      ["t", "nostr-dating"],
      ["l", options.payload.type],
    ],
  });

  return { recipientWrap, selfWrap, rumor };
}

export async function unwrapGift(
  wrapped: NDKEvent,
  signer: NDKSigner,
): Promise<NDKEvent> {
  return giftUnwrap(wrapped, undefined, signer, "nip44");
}

export function parseInvitePayload(content: string): InvitePayload | null {
  try {
    const parsed = JSON.parse(content) as InvitePayload;
    if (parsed?.type === "DATE_INVITE" || parsed?.type === "DATE_RESPONSE") {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}
