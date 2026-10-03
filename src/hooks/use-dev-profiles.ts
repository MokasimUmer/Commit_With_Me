"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useMemo } from "react";
import { db } from "@/lib/db/schema";
import type { DevProfile } from "@/lib/types";

interface ProfileFilters {
  tech?: string;
  pairStyle?: string;
  experience?: string;
  search?: string;
}

function matches(profile: DevProfile, filters: ProfileFilters): boolean {
  if (filters.tech && !profile.tech.includes(filters.tech)) return false;
  if (filters.pairStyle && profile.pairStyle !== filters.pairStyle) return false;
  if (filters.experience && profile.experience !== filters.experience) return false;
  if (filters.search) {
    const haystack = [
      profile.headline,
      profile.bio,
      profile.name,
      profile.github,
      profile.tech.join(" "),
      profile.interests.join(" "),
      profile.projectIdeas.join(" "),
    ]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(filters.search.toLowerCase())) return false;
  }
  return true;
}

export function useDevProfiles(filters: ProfileFilters = {}) {
  const rows = useLiveQuery(async () => {
    if (!db) return [];
    return db.devProfiles.orderBy("updatedAt").reverse().toArray();
  }, []);

  const profiles = useMemo(
    () => (rows ?? []).filter((profile) => matches(profile, filters)),
    [rows, filters],
  );

  return {
    profiles,
    loading: rows === undefined,
    total: rows?.length ?? 0,
  };
}

export function useOwnProfile(pubkey?: string | null) {
  return useLiveQuery(async () => {
    if (!db || !pubkey) return undefined;
    return db.devProfiles.get(pubkey);
  }, [pubkey]);
}
