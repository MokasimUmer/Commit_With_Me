import { NDKEvent, NDKUser } from "@nostr-dev-kit/ndk";
import { KIND_ZAP_REQUEST } from "@/lib/constants";
import { safeJsonParse } from "@/lib/utils";
import { getNDK } from "./ndk";

interface LnurlPayResponse {
  callback: string;
  minSendable: number;
  maxSendable: number;
  allowsNostr?: boolean;
  nostrPubkey?: string;
  commentAllowed?: number;
}

function lud16ToUrl(lud16: string): string {
  const [name, domain] = lud16.trim().split("@");
  if (!name || !domain) {
    throw new Error("Lightning address is invalid.");
  }
  return `https://${domain}/.well-known/lnurlp/${encodeURIComponent(name)}`;
}

async function fetchLnurl(lud16: string): Promise<LnurlPayResponse> {
  const response = await fetch(lud16ToUrl(lud16));
  if (!response.ok) {
    throw new Error("Could not reach the recipient lightning address.");
  }
  return (await response.json()) as LnurlPayResponse;
}

export async function createZapInvoice(options: {
  recipientPubkey: string;
  lud16: string;
  amountSats: number;
  comment?: string;
  roomId?: string;
}): Promise<string> {
  const ndk = getNDK();
  const signer = ndk.signer;
  if (!signer) throw new Error("Connect a NIP-07 signer before sending zaps.");

  const lnurl = await fetchLnurl(options.lud16);
  const amountMsats = options.amountSats * 1000;
  if (amountMsats < lnurl.minSendable || amountMsats > lnurl.maxSendable) {
    throw new Error(
      `Amount must be between ${Math.ceil(lnurl.minSendable / 1000)} and ${Math.floor(lnurl.maxSendable / 1000)} sats.`,
    );
  }

  const recipient = new NDKUser({ pubkey: options.recipientPubkey });
  recipient.ndk = ndk;

  const zapRequest = new NDKEvent(ndk);
  zapRequest.kind = KIND_ZAP_REQUEST;
  zapRequest.content = options.comment ?? "";
  zapRequest.tags = [
    ["p", options.recipientPubkey],
    ["amount", String(amountMsats)],
    ["relays", ...Array.from(ndk.pool.relays.keys()).slice(0, 4)],
    ["lnurl", options.lud16],
  ];
  if (options.roomId) {
    zapRequest.tags.push(["e", options.roomId]);
    zapRequest.tags.push(["d", options.roomId]);
  }
  await zapRequest.sign(signer);

  const callback = new URL(lnurl.callback);
  callback.searchParams.set("amount", String(amountMsats));
  if (lnurl.allowsNostr) {
    callback.searchParams.set("nostr", JSON.stringify(zapRequest.rawEvent()));
  }
  if (options.comment && lnurl.commentAllowed) {
    callback.searchParams.set("comment", options.comment.slice(0, lnurl.commentAllowed));
  }

  const invoiceResponse = await fetch(callback.toString());
  if (!invoiceResponse.ok) {
    throw new Error("Lightning service did not return an invoice.");
  }
  const body = (await invoiceResponse.json()) as { pr?: string; reason?: string };
  if (!body.pr) {
    throw new Error(body.reason || "No invoice in LNURL response.");
  }
  return body.pr;
}

export async function payInvoice(invoice: string): Promise<void> {
  const webln = window.webln;
  if (!webln) {
    throw new Error("No WebLN wallet found. Copy the invoice into a lightning wallet.");
  }
  await webln.enable();
  await webln.sendPayment(invoice);
}

export function parseLud16FromProfile(content: string): string | undefined {
  const parsed = safeJsonParse<{ lud16?: string; lud06?: string }>(content, {});
  return parsed.lud16;
}
