"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useInvites } from "@/hooks/use-invites";
import type { DevProfile } from "@/lib/types";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";

export function InviteModal({ profile }: { profile: DevProfile }) {
  const { connected, login } = useAuth();
  const { sendInvite } = useInvites();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [title, setTitle] = useState(profile.projectIdeas[0] ?? "Weekend pairing session");
  const [description, setDescription] = useState(
    `Let's spend an hour building together. Pair style: ${profile.pairStyle}.`,
  );
  const [repoUrl, setRepoUrl] = useState("");
  const [when, setWhen] = useState("");

  async function onSubmit() {
    if (!connected) {
      await login();
      return;
    }
    setPending(true);
    try {
      const scheduledAt = when
        ? Math.floor(new Date(when).getTime() / 1000)
        : Math.floor(Date.now() / 1000) + 3600;
      await sendInvite({
        recipientPubkey: profile.pubkey,
        title,
        description,
        scheduledAt,
        repoUrl,
      });
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not gift-wrap the invite.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Ask to pair</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite {profile.name ?? "this dev"} to pair</DialogTitle>
          <DialogDescription>
            The proposal is sealed with NIP-44 and gift-wrapped (kind 1059) so relays never see the
            project title, time, or room id.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="title">Project title</Label>
            <Input id="title" value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="description">What you want to build</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="repo">Starter repo</Label>
            <Input
              id="repo"
              placeholder="https://github.com/example/starter-template"
              value={repoUrl}
              onChange={(event) => setRepoUrl(event.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="when">When</Label>
            <Input
              id="when"
              type="datetime-local"
              value={when}
              onChange={(event) => setWhen(event.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onSubmit} disabled={pending || !title.trim()}>
            {pending ? "Wrapping…" : "Send encrypted invite"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
