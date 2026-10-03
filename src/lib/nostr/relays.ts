export const BOOTSTRAP_RELAYS = [
  "wss://relay.damus.io",
  "wss://nos.lol",
  "wss://relay.primal.net",
  "wss://nostr.wine",
  "wss://relay.nostr.band",
  "wss://purplepag.es",
] as const;

export const WRITE_RELAYS = [
  "wss://relay.damus.io",
  "wss://nos.lol",
  "wss://relay.primal.net",
] as const;

export type RelayHealth = {
  url: string;
  status: "connecting" | "connected" | "disconnected" | "error" | "unknown";
  lastError?: string;
};

type RelayLike = {
  url?: string;
  connectivity?: { status?: string | number };
  status?: string | number;
  connected?: boolean;
};

export function describeRelay(relay: RelayLike): RelayHealth {
  const url = relay.url ?? "unknown";
  if (relay.connected) {
    return { url, status: "connected" };
  }

  const raw = relay.connectivity?.status ?? relay.status;
  const numeric = typeof raw === "number" ? raw : Number(raw);
  if (numeric >= 5) return { url, status: "connected" };
  if (numeric === 4 || numeric === 2) return { url, status: "connecting" };
  if (numeric === 0 || numeric === 1 || numeric === 3) return { url, status: "disconnected" };

  const label = String(raw ?? "").toLowerCase();
  if (label.includes("auth") || (label.includes("connect") && !label.includes("disconnect"))) {
    return { url, status: "connected" };
  }
  if (label.includes("error")) return { url, status: "error" };
  if (label.includes("disconnect") || label.includes("close")) {
    return { url, status: "disconnected" };
  }
  return { url, status: label ? "unknown" : "connecting" };
}
