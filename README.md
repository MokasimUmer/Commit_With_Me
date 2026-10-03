# Commit-with-Me

A developer dating lounge that lives entirely on Nostr. There is no application server and no database. Profiles, encrypted date invites, lightning zaps, and the pairing room all travel as signed events. The browser materializes its own views in IndexedDB.

## How it works

- **NIP-07 login** through Alby or nos2x. The app never sees an `nsec`.
- **Kind 31990** parameterized replaceable profiles (`d=profile`, `t=nostr-dating`) plus Kind 0 metadata / NIP-05.
- Incoming relay traffic is written to Dexie (`@nostr-dev-kit/cache-dexie`, the NDK 3 Dexie adapter formerly published as `ndk-cache-dexie`, plus a local materialized-view database). UI binds with `useLiveQuery`. Events are never dumped into React state.
- Date invites are **NIP-44 + NIP-59 gift wraps** (kinds 14 / 13 / 1059).
- The date workspace syncs cursors, presence, typing, chat, and the shared buffer over **ephemeral kinds 28282–28286**.
- Completion tips use **NIP-57 zaps**.

## Run it

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), connect a NIP-07 signer, publish a profile, and ask someone on a date.

## Routes

| Path | What it is |
| --- | --- |
| `/` | Landing + signer connect |
| `/discover` | Live matching feed from IndexedDB |
| `/profile` | Publish / replace your pairing card |
| `/invites` | Decrypt NIP-59 inbox |
| `/date/[roomId]` | Monaco pairing room |

## Relays

Bootstrap list lives in `src/lib/nostr/relays.ts`. Relays are dumb stores. Filtering, NIP-05 checks, gift-wrap decryption, and dedupe all happen in the client.
