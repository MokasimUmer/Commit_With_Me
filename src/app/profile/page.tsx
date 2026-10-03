"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useOwnProfile } from "@/hooks/use-dev-profiles";
import {
  EXPERIENCE_LEVELS,
  INTEREST_SUGGESTIONS,
  PAIR_STYLES,
  TECH_OPTIONS,
} from "@/lib/constants";
import { publishDeveloperProfile } from "@/lib/nostr/publish-profile";
import type { ExperienceLevel, PairStyle } from "@/lib/constants";
import type { ProfileDraft } from "@/lib/types";
import { cn } from "@/lib/utils";

const emptyDraft: ProfileDraft = {
  headline: "",
  bio: "",
  github: "",
  projectIdeas: "",
  interests: "",
  tech: ["typescript", "nostr"],
  pairStyle: "driver-navigator",
  experience: "mid",
  name: "",
  picture: "",
  nip05: "",
  lud16: "",
};

export default function ProfilePage() {
  const { pubkey, connected, login, hasExtension } = useAuth();
  const existing = useOwnProfile(pubkey);
  const [draft, setDraft] = useState<ProfileDraft>(emptyDraft);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!existing) return;
    setDraft({
      headline: existing.headline,
      bio: existing.bio,
      github: existing.github,
      projectIdeas: existing.projectIdeas.join("\n"),
      interests: existing.interests.join(", "),
      tech: existing.tech,
      pairStyle: (existing.pairStyle as PairStyle) || "driver-navigator",
      experience: (existing.experience as ExperienceLevel) || "mid",
      name: existing.name ?? "",
      picture: existing.picture ?? "",
      nip05: existing.nip05 ?? "",
      lud16: existing.lud16 ?? "",
    });
  }, [existing]);

  function toggleTech(tech: string) {
    setDraft((current) => ({
      ...current,
      tech: current.tech.includes(tech)
        ? current.tech.filter((item) => item !== tech)
        : [...current.tech, tech],
    }));
  }

  async function onSave() {
    if (!connected) {
      await login();
      return;
    }
    if (!pubkey) return;
    setPending(true);
    try {
      await publishDeveloperProfile(pubkey, draft);
      toast.success("Profile published as a replaceable kind 31990 event.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Publish failed.");
    } finally {
      setPending(false);
    }
  }

  if (!connected) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <h1 className="text-2xl font-semibold">Publish a profile</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Kind 31990, signed locally. Nothing is stored on a server.
        </p>
        <Button className="mt-6" onClick={login} disabled={!hasExtension}>
          {hasExtension ? "Connect signer" : "Install Alby or nos2x"}
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="border-b border-border pb-4">
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Kind 0 for name, NIP-05, and lightning. Kind 31990 for stack, pair style, and ideas.
        </p>
      </div>

      <div className="mt-8 grid gap-5">
        <Field label="Display name">
          <Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
        </Field>
        <Field label="Headline">
          <Input
            value={draft.headline}
            onChange={(event) => setDraft({ ...draft, headline: event.target.value })}
            placeholder="Systems engineer looking for a frontend foil"
          />
        </Field>
        <Field label="Bio">
          <Textarea
            value={draft.bio}
            onChange={(event) => setDraft({ ...draft, bio: event.target.value })}
            rows={5}
          />
        </Field>
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="GitHub">
            <Input
              value={draft.github}
              onChange={(event) => setDraft({ ...draft, github: event.target.value })}
              placeholder="https://github.com/you"
            />
          </Field>
          <Field label="Avatar URL">
            <Input
              value={draft.picture}
              onChange={(event) => setDraft({ ...draft, picture: event.target.value })}
            />
          </Field>
          <Field label="NIP-05">
            <Input
              value={draft.nip05}
              onChange={(event) => setDraft({ ...draft, nip05: event.target.value })}
              placeholder="you@domain.com"
            />
          </Field>
          <Field label="Lightning address">
            <Input
              value={draft.lud16}
              onChange={(event) => setDraft({ ...draft, lud16: event.target.value })}
              placeholder="you@getalby.com"
            />
          </Field>
        </div>
        <Field label="Project ideas (one per line)">
          <Textarea
            value={draft.projectIdeas}
            onChange={(event) => setDraft({ ...draft, projectIdeas: event.target.value })}
            rows={4}
          />
        </Field>
        <Field label="Interests (comma separated)">
          <Input
            value={draft.interests}
            onChange={(event) => setDraft({ ...draft, interests: event.target.value })}
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {INTEREST_SUGGESTIONS.map((interest) => (
              <button
                key={interest}
                type="button"
                className="rounded-sm border border-border px-2 py-0.5 font-mono text-[11px] text-muted-foreground hover:text-foreground"
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    interests: current.interests
                      ? `${current.interests}, ${interest}`
                      : interest,
                  }))
                }
              >
                {interest}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Tech stack">
          <div className="flex flex-wrap gap-1.5">
            {TECH_OPTIONS.map((tech) => (
              <button key={tech} type="button" onClick={() => toggleTech(tech)}>
                <Badge variant={draft.tech.includes(tech) ? "default" : "outline"}>{tech}</Badge>
              </button>
            ))}
          </div>
        </Field>
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Pair style">
            <div className="flex flex-wrap gap-2">
              {PAIR_STYLES.map((style) => (
                <Button
                  key={style}
                  type="button"
                  size="sm"
                  variant={draft.pairStyle === style ? "default" : "outline"}
                  onClick={() => setDraft({ ...draft, pairStyle: style })}
                >
                  {style}
                </Button>
              ))}
            </div>
          </Field>
          <Field label="Experience">
            <div className="flex flex-wrap gap-2">
              {EXPERIENCE_LEVELS.map((level) => (
                <Button
                  key={level}
                  type="button"
                  size="sm"
                  variant={draft.experience === level ? "default" : "outline"}
                  className={cn(draft.experience === level && "capitalize")}
                  onClick={() => setDraft({ ...draft, experience: level })}
                >
                  {level}
                </Button>
              ))}
            </div>
          </Field>
        </div>
        <Button onClick={onSave} disabled={pending || !draft.headline.trim()}>
          {pending ? "Signing…" : "Publish"}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
