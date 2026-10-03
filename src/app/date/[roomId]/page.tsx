"use client";

import { useLiveQuery } from "dexie-react-hooks";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const CollaborativeEditor = dynamic(
  () =>
    import("@/components/editor/collaborative-editor").then(
      (module) => module.CollaborativeEditor,
    ),
  { ssr: false },
);
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/use-auth";
import { useDateRoom } from "@/hooks/use-date-room";
import { db } from "@/lib/db/schema";
import { createZapInvoice, payInvoice } from "@/lib/nostr/zaps";
import { formatClock, truncateMiddle } from "@/lib/utils";

export default function DateRoomPage() {
  const params = useParams<{ roomId: string }>();
  const roomId = params.roomId;
  const { pubkey, connected, login } = useAuth();
  const room = useDateRoom(roomId);
  const [chat, setChat] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [zapAmount, setZapAmount] = useState("2100");
  const [zapping, setZapping] = useState(false);

  const session = useLiveQuery(async () => db?.sessions.get(roomId), [roomId]);
  const zaps = useLiveQuery(async () => {
    if (!db) return [];
    return db.zaps.where("roomId").equals(roomId).toArray();
  }, [roomId]);
  const partner = useLiveQuery(async () => {
    if (!db || !session?.partnerPubkey) return undefined;
    return db.devProfiles.get(session.partnerPubkey);
  }, [session?.partnerPubkey]);

  useEffect(() => {
    const started = session?.startedAt ?? Math.floor(Date.now() / 1000);
    const tick = window.setInterval(() => {
      setElapsed(Math.max(0, Math.floor(Date.now() / 1000) - started));
    }, 1000);
    return () => window.clearInterval(tick);
  }, [session?.startedAt]);

  const partnerLabel =
    partner?.name ?? (session?.partnerPubkey ? truncateMiddle(session.partnerPubkey) : "pair");
  const zapTotal = useMemo(
    () => (zaps ?? []).reduce((sum, zap) => sum + zap.amountSats, 0),
    [zaps],
  );

  async function onZap() {
    if (!partner?.lud16 || !session?.partnerPubkey) {
      toast.error("Your pair has not published a lightning address.");
      return;
    }
    setZapping(true);
    try {
      const invoice = await createZapInvoice({
        recipientPubkey: session.partnerPubkey,
        lud16: partner.lud16,
        amountSats: Number(zapAmount),
        comment: `Shipped in ${roomId}`,
        roomId,
      });
      try {
        await payInvoice(invoice);
        toast.success(`Zapped ${zapAmount} sats.`);
      } catch (error) {
        await navigator.clipboard.writeText(invoice);
        toast.message(
          error instanceof Error
            ? `${error.message} Invoice copied.`
            : "Invoice copied to clipboard.",
        );
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create zap.");
    } finally {
      setZapping(false);
    }
  }

  if (!connected) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <h1 className="text-2xl font-semibold">This room needs a signer</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Presence and the buffer are ephemeral signed events.
        </p>
        <Button className="mt-6" onClick={login}>
          Connect
        </Button>
      </div>
    );
  }

  return (
    <div className="grid min-h-[calc(100vh-3rem)] lg:grid-cols-[minmax(0,1fr)_280px]">
      <section className="flex min-h-[70vh] flex-col">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-2">
          <div className="min-w-0">
            <p className="truncate font-mono text-[11px] text-muted-foreground">{roomId}</p>
            <h1 className="truncate text-sm font-semibold">
              {session?.title ?? "Open pairing session"}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] text-muted-foreground">
            <span>{formatClock(elapsed)}</span>
            <span>{room.peers.length + 1} live</span>
            <span>{zapTotal} sats</span>
          </div>
        </div>
        <div className="min-h-0 flex-1">
          <CollaborativeEditor
            value={room.code}
            language={room.language}
            file={room.file}
            cursors={room.cursors}
            onChange={room.updateCode}
            onCursor={room.updateCursor}
          />
        </div>
      </section>

      <aside className="flex flex-col border-t border-border lg:border-l lg:border-t-0">
        <div className="border-b border-border p-4">
          <h2 className="text-sm font-semibold">{partnerLabel}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {session?.description || "Pick a file. Finish something small."}
          </p>
          {session?.repoUrl ? (
            <a
              href={session.repoUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 block truncate font-mono text-[11px] hover:underline"
            >
              {session.repoUrl}
            </a>
          ) : null}
        </div>

        <div className="flex min-h-0 flex-1 flex-col border-b border-border p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Chat</h3>
            {room.typingPubkeys.length > 0 ? (
              <span className="font-mono text-[11px] text-muted-foreground">typing</span>
            ) : null}
          </div>
          <ScrollArea className="mt-3 h-56">
            <div className="space-y-3 pr-2">
              {room.messages.map((message) => (
                <div key={message.id} className="text-sm">
                  <p className="font-mono text-[10px] text-muted-foreground">
                    {message.pubkey === pubkey ? "you" : truncateMiddle(message.pubkey, 6, 4)}
                  </p>
                  <p>{message.text}</p>
                </div>
              ))}
            </div>
          </ScrollArea>
          <form
            className="mt-3 flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              room.sendChat(chat);
              setChat("");
            }}
          >
            <Input
              value={chat}
              onChange={(event) => {
                setChat(event.target.value);
                room.markTyping();
              }}
              placeholder="Message"
            />
            <Button type="submit" size="sm">
              Send
            </Button>
          </form>
        </div>

        <div className="p-4">
          <h3 className="text-sm font-medium">Zap</h3>
          <p className="mt-1 text-xs text-muted-foreground">NIP-57 when you ship.</p>
          <div className="mt-3 flex gap-2">
            <Input
              value={zapAmount}
              onChange={(event) => setZapAmount(event.target.value)}
              type="number"
              min={1}
            />
            <Button onClick={onZap} disabled={zapping}>
              {zapping ? "…" : "Zap"}
            </Button>
          </div>
        </div>
      </aside>
    </div>
  );
}
