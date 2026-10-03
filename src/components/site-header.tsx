"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useInvites } from "@/hooks/use-invites";
import { cn, truncateMiddle } from "@/lib/utils";
import { Button } from "./ui/button";

const links = [
  { href: "/discover", label: "Discover" },
  { href: "/invites", label: "Invites" },
  { href: "/profile", label: "Profile" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { pubkey, npub, connected, login, logout, hasExtension, relays } = useAuth();
  const { pendingCount } = useInvites();
  const liveRelays = relays.filter((relay) => relay.status === "connected").length;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <div className="mx-auto flex h-12 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-2 font-mono text-sm">
          <span className="flex h-6 w-6 items-center justify-center bg-primary text-[10px] text-primary-foreground">
            +
          </span>
          <span>cwm</span>
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-muted-foreground hover:text-foreground",
                pathname.startsWith(link.href) && "text-foreground",
              )}
            >
              {link.label}
              {link.href === "/invites" && pendingCount > 0 ? (
                <span className="ml-1 font-mono text-[11px] text-destructive">{pendingCount}</span>
              ) : null}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <span className="hidden font-mono text-[11px] text-muted-foreground sm:inline">
            {liveRelays}/{relays.length || 6} relays
          </span>
          {connected && pubkey ? (
            <>
              <span className="hidden font-mono text-[11px] text-muted-foreground lg:inline">
                {truncateMiddle(npub ?? pubkey, 10, 6)}
              </span>
              <Button variant="outline" size="sm" onClick={logout}>
                Sign out
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={login} disabled={!hasExtension}>
              {hasExtension ? "Connect signer" : "Install NIP-07"}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
