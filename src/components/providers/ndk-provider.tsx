"use client";

import type NDK from "@nostr-dev-kit/ndk";
import { createContext, useEffect, useMemo, useRef, useState } from "react";
import { attachNip07Signer, connectNDK, getNDK } from "@/lib/nostr/ndk";
import { startEventIngest } from "@/lib/nostr/ingest";
import { describeRelay } from "@/lib/nostr/relays";
import { useSessionStore } from "@/lib/stores/session";

interface NdkContextValue {
  ndk: NDK | null;
  ready: boolean;
  startInbox: (pubkey: string) => void;
}

export const NdkContext = createContext<NdkContextValue | null>(null);

export function NDKProvider({ children }: { children: React.ReactNode }) {
  const [ndk, setNdk] = useState<NDK | null>(null);
  const [ready, setReady] = useState(false);
  const inboxStarted = useRef<string | null>(null);
  const pubkey = useSessionStore((state) => state.pubkey);
  const setRelays = useSessionStore((state) => state.setRelays);
  const setSession = useSessionStore((state) => state.setSession);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        const instance = await connectNDK();
        if (cancelled) return;
        setNdk(instance);
        startEventIngest(instance, pubkey ?? undefined);
        setReady(true);

        const relays = Array.from(instance.pool.relays.values()).map((relay) =>
          describeRelay({
            url: relay.url,
            connectivity: { status: String(relay.status) },
            connected: relay.connected,
          }),
        );
        setRelays(relays);

        if (pubkey && window.nostr) {
          const attached = await attachNip07Signer();
          if (!cancelled) {
            setSession(attached.pubkey, useSessionStore.getState().npub ?? "");
            startEventIngest(attached.ndk, attached.pubkey);
            inboxStarted.current = attached.pubkey;
          }
        }
      } catch {
        if (!cancelled) {
          setNdk(getNDK());
          setReady(true);
        }
      }
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, [pubkey, setRelays, setSession]);

  const value = useMemo<NdkContextValue>(
    () => ({
      ndk,
      ready,
      startInbox: (nextPubkey: string) => {
        if (!ndk || inboxStarted.current === nextPubkey) return;
        startEventIngest(ndk, nextPubkey);
        inboxStarted.current = nextPubkey;
      },
    }),
    [ndk, ready],
  );

  return <NdkContext.Provider value={value}>{children}</NdkContext.Provider>;
}
