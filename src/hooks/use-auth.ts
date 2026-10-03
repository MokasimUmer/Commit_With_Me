"use client";

import { nip19 } from "nostr-tools";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { attachNip07Signer, explainSignerError, resetNDKSigner } from "@/lib/nostr/ndk";
import { describeRelay } from "@/lib/nostr/relays";
import { useSessionStore } from "@/lib/stores/session";
import { useNDK } from "./use-ndk";

export function useAuth() {
  const { ndk, ready, startInbox } = useNDK();
  const session = useSessionStore();
  const [mounted, setMounted] = useState(false);
  const [hasExtension, setHasExtension] = useState(false);

  useEffect(() => {
    setMounted(true);
    setHasExtension(Boolean(window.nostr));
  }, []);

  async function login() {
    session.setConnecting(true);
    try {
      const { pubkey } = await attachNip07Signer();
      const npub = nip19.npubEncode(pubkey);
      session.setSession(pubkey, npub);
      startInbox(pubkey);
      refreshRelays();
      toast.success("Signer connected. Welcome to the pairing lounge.");
    } catch (error) {
      const message = explainSignerError(error);
      session.setError(message);
      toast.error(message);
    }
  }

  function logout() {
    resetNDKSigner();
    session.clearSession();
    toast.message("Signed out of this browser. Relays still hold your public profile.");
  }

  function refreshRelays() {
    if (!ndk) return;
    const relays = Array.from(ndk.pool.relays.values()).map((relay) =>
      describeRelay({
        url: relay.url,
        connectivity: { status: String(relay.status) },
        connected: relay.connected,
      }),
    );
    session.setRelays(relays);
  }

  return {
    ...session,
    ready,
    mounted,
    login,
    logout,
    refreshRelays,
    hasExtension,
    connected: mounted && session.connected,
    pubkey: mounted ? session.pubkey : null,
    npub: mounted ? session.npub : null,
  };
}
