"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useInvites } from "@/hooks/use-invites";
import type { Invite } from "@/lib/types";
import { formatRelativeTime, truncateMiddle } from "@/lib/utils";

export default function InvitesPage() {
  const router = useRouter();
  const { connected, login, hasExtension } = useAuth();
  const { incoming, outgoing, respond, loading } = useInvites();

  if (!connected) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <h1 className="text-2xl font-semibold">Invites</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Kind 1059 wraps are decrypted in this browser. The signer needs NIP-44.
        </p>
        <Button className="mt-6" onClick={login} disabled={!hasExtension}>
          {hasExtension ? "Open inbox" : "Install a NIP-07 signer"}
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="border-b border-border pb-4">
        <h1 className="text-2xl font-semibold">Invites</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Accept writes a session to IndexedDB and opens the room.
        </p>
      </div>

      <Tabs defaultValue="incoming" className="mt-8">
        <TabsList>
          <TabsTrigger value="incoming">Incoming ({incoming.length})</TabsTrigger>
          <TabsTrigger value="outgoing">Outgoing ({outgoing.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="incoming">
          <InviteList
            invites={incoming}
            empty="No sealed invites yet. When someone asks you out, it lands here."
            loading={loading}
            onAccept={async (invite) => {
              await respond(invite, "accepted");
              router.push(`/date/${invite.roomId}`);
            }}
            onDecline={(invite) => respond(invite, "declined")}
          />
        </TabsContent>
        <TabsContent value="outgoing">
          <InviteList
            invites={outgoing}
            empty="You haven't sent a pairing invite yet."
            loading={loading}
            onOpen={(invite) => {
              if (invite.status === "accepted") router.push(`/date/${invite.roomId}`);
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InviteList({
  invites,
  empty,
  loading,
  onAccept,
  onDecline,
  onOpen,
}: {
  invites: Invite[];
  empty: string;
  loading: boolean;
  onAccept?: (invite: Invite) => void;
  onDecline?: (invite: Invite) => void;
  onOpen?: (invite: Invite) => void;
}) {
  if (loading) {
    return <p className="mt-8 text-sm text-muted-foreground">Decrypting gift wraps…</p>;
  }
  if (invites.length === 0) {
    return <p className="border-b border-border py-8 text-sm text-muted-foreground">{empty}</p>;
  }

  return (
    <div>
      {invites.map((invite) => (
        <div key={invite.id} className="border-b border-border py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[11px] text-muted-foreground">{invite.status}</p>
              <h2 className="text-base font-semibold">{invite.title}</h2>
            </div>
            <p className="font-mono text-xs text-muted-foreground">
              {formatRelativeTime(invite.createdAt)}
            </p>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{invite.description}</p>
          <p className="mt-2 font-mono text-xs text-muted-foreground">
            {truncateMiddle(invite.fromPubkey)} → {truncateMiddle(invite.toPubkey)}
          </p>
          {invite.repoUrl ? (
            <a
              href={invite.repoUrl}
              className="mt-1 block truncate text-sm hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              {invite.repoUrl}
            </a>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            {invite.status === "pending" && onAccept ? (
              <>
                <Button size="sm" onClick={() => onAccept(invite)}>
                  Accept
                </Button>
                <Button size="sm" variant="outline" onClick={() => onDecline?.(invite)}>
                  Decline
                </Button>
              </>
            ) : null}
            {invite.status === "accepted" && onOpen ? (
              <Button size="sm" onClick={() => onOpen(invite)}>
                Rejoin
              </Button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
