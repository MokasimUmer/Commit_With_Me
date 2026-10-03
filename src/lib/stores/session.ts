import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { RelayHealth } from "@/lib/nostr/relays";

interface SessionState {
  pubkey: string | null;
  npub: string | null;
  connecting: boolean;
  connected: boolean;
  error: string | null;
  relays: RelayHealth[];
  setConnecting: (connecting: boolean) => void;
  setSession: (pubkey: string, npub: string) => void;
  setError: (error: string | null) => void;
  setRelays: (relays: RelayHealth[]) => void;
  clearSession: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      pubkey: null,
      npub: null,
      connecting: false,
      connected: false,
      error: null,
      relays: [],
      setConnecting: (connecting) => set({ connecting, error: null }),
      setSession: (pubkey, npub) =>
        set({ pubkey, npub, connected: true, connecting: false, error: null }),
      setError: (error) => set({ error, connecting: false }),
      setRelays: (relays) => set({ relays }),
      clearSession: () =>
        set({
          pubkey: null,
          npub: null,
          connected: false,
          connecting: false,
          error: null,
        }),
    }),
    {
      name: "cwm-session",
      partialize: (state) => ({
        pubkey: state.pubkey,
        npub: state.npub,
      }),
    },
  ),
);
