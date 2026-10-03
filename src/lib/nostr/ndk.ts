import NDK, { NDKNip07Signer, type NDKSigner } from "@nostr-dev-kit/ndk";
// NDK 3 publishes the Dexie adapter as @nostr-dev-kit/cache-dexie
// (the older @nostr-dev-kit/ndk-cache-dexie package tracks NDK 2).
import NDKCacheAdapterDexie from "@nostr-dev-kit/cache-dexie";
import { BOOTSTRAP_RELAYS } from "./relays";

let ndkSingleton: NDK | null = null;
let connectPromise: Promise<void> | null = null;

function createCacheAdapter() {
  return new NDKCacheAdapterDexie({
    dbName: "commit-with-me-ndk",
  });
}

export function getNDK(): NDK {
  if (typeof window === "undefined") {
    throw new Error("NDK is a browser-only singleton.");
  }

  if (!ndkSingleton) {
    ndkSingleton = new NDK({
      explicitRelayUrls: [...BOOTSTRAP_RELAYS],
      cacheAdapter: createCacheAdapter(),
      autoConnectUserRelays: true,
      clientName: "commit-with-me",
    });
  }

  return ndkSingleton;
}

export async function connectNDK(): Promise<NDK> {
  const ndk = getNDK();
  if (!connectPromise) {
    connectPromise = ndk.connect(6_000).then(() => undefined);
  }
  await connectPromise;
  return ndk;
}

export async function attachNip07Signer(): Promise<{
  ndk: NDK;
  signer: NDKNip07Signer;
  pubkey: string;
}> {
  if (typeof window === "undefined" || !window.nostr) {
    throw new Error("No NIP-07 extension found. Install Alby or nos2x.");
  }

  const ndk = await connectNDK();
  const signer = new NDKNip07Signer();
  ndk.signer = signer;
  try {
    const user = await signer.user();
    if (!user.pubkey) {
      throw new Error("NIP-07 extension did not return a public key.");
    }
    ndk.activeUser = user;
    return { ndk, signer, pubkey: user.pubkey };
  } catch (error) {
    throw new Error(explainSignerError(error));
  }
}

export function explainSignerError(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Could not connect NIP-07 signer.";
  const message = raw.toLowerCase();

  if (message.includes("no private key") || message.includes("private key found")) {
    return "nos2x has no key yet. Open the nos2x extension, generate or paste an nsec, save, then reload this tab.";
  }
  if (message.includes("user rejected") || message.includes("denied") || message.includes("reject")) {
    return "The signer prompt was dismissed. Click Connect signer again and approve it in the extension.";
  }
  return raw;
}

export function getActiveSigner(): NDKSigner | undefined {
  return ndkSingleton?.signer;
}

export function resetNDKSigner(): void {
  if (ndkSingleton) {
    ndkSingleton.signer = undefined;
    ndkSingleton.activeUser = undefined;
  }
}
