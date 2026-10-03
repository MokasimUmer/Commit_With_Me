"use client";

import { useMemo, useState } from "react";
import { DevCard } from "@/components/dev-card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDevProfiles } from "@/hooks/use-dev-profiles";
import { EXPERIENCE_LEVELS, PAIR_STYLES, TECH_OPTIONS } from "@/lib/constants";

export default function DiscoverPage() {
  const [tech, setTech] = useState<string>("all");
  const [pairStyle, setPairStyle] = useState<string>("all");
  const [experience, setExperience] = useState<string>("all");
  const [search, setSearch] = useState("");

  const filters = useMemo(
    () => ({
      tech: tech === "all" ? undefined : tech,
      pairStyle: pairStyle === "all" ? undefined : pairStyle,
      experience: experience === "all" ? undefined : experience,
      search: search.trim() || undefined,
    }),
    [tech, pairStyle, experience, search],
  );

  const { profiles, loading, total } = useDevProfiles(filters);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-semibold">Discover</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Kind 31990, materialized in IndexedDB. Filters never hit the relay twice.
          </p>
        </div>
        <p className="font-mono text-xs text-muted-foreground">
          {loading ? "hydrating…" : `${profiles.length}/${total}`}
        </p>
      </div>

      <div className="grid gap-2 border-b border-border py-4 md:grid-cols-4">
        <Input
          placeholder="Search headline, stack…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Select value={tech} onValueChange={setTech}>
          <SelectTrigger>
            <SelectValue placeholder="Tech" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any stack</SelectItem>
            {TECH_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={pairStyle} onValueChange={setPairStyle}>
          <SelectTrigger>
            <SelectValue placeholder="Pair style" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any pair style</SelectItem>
            {PAIR_STYLES.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={experience} onValueChange={setExperience}>
          <SelectTrigger>
            <SelectValue placeholder="Experience" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any experience</SelectItem>
            {EXPERIENCE_LEVELS.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="py-10 text-sm text-muted-foreground">Folding relay events into Dexie…</p>
      ) : profiles.length === 0 ? (
        <div className="py-10">
          <h2 className="text-lg font-semibold">No profiles in cache yet</h2>
          <p className="mt-2 max-w-lg text-sm text-muted-foreground">
            Publish from Profile. Events tagged <code className="font-mono">nostr-dating</code> show
            up here as they arrive.
          </p>
        </div>
      ) : (
        <div>
          {profiles.map((profile) => (
            <DevCard key={profile.pubkey} profile={profile} />
          ))}
        </div>
      )}
    </div>
  );
}
