"use client";

import { BadgeCheck } from "lucide-react";
import type { DevProfile } from "@/lib/types";
import { truncateMiddle } from "@/lib/utils";
import { InviteModal } from "./modals/invite-modal";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";

export function DevCard({ profile }: { profile: DevProfile }) {
  const initials = (profile.name ?? profile.headline ?? profile.npub).slice(0, 2).toUpperCase();

  return (
    <article className="grid gap-4 border-b border-border px-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 border border-border">
            <AvatarImage src={profile.picture} alt={profile.name ?? profile.npub} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">{profile.name ?? truncateMiddle(profile.npub)}</p>
              {profile.nip05Valid ? <BadgeCheck className="h-3.5 w-3.5" /> : null}
              <span className="font-mono text-[11px] text-muted-foreground">{profile.experience}</span>
            </div>
            <p className="font-mono text-[11px] text-muted-foreground">
              {profile.nip05 ?? truncateMiddle(profile.npub)}
            </p>
          </div>
        </div>
        <h3 className="mt-3 text-[15px] font-medium leading-snug">
          {profile.headline || "Looking for a pairing partner"}
        </h3>
        {profile.bio ? (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{profile.bio}</p>
        ) : null}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {profile.tech.slice(0, 6).map((tech) => (
            <Badge key={tech}>{tech}</Badge>
          ))}
          <span className="font-mono text-[11px] text-muted-foreground">{profile.pairStyle}</span>
        </div>
        {profile.projectIdeas[0] ? (
          <p className="mt-2 text-sm">
            <span className="text-muted-foreground">Next: </span>
            {profile.projectIdeas[0]}
          </p>
        ) : null}
        <div className="mt-2 flex gap-3 font-mono text-[11px] text-muted-foreground">
          {profile.github ? (
            <a href={profile.github} target="_blank" rel="noreferrer" className="hover:text-foreground">
              github
            </a>
          ) : null}
          {profile.lud16 ? <span>{profile.lud16}</span> : null}
        </div>
      </div>
      <div className="sm:pt-1">
        <InviteModal profile={profile} />
      </div>
    </article>
  );
}
