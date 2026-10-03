"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

const steps = [
  {
    n: "01",
    title: "Read the bench",
    body: "Kind 31990 profiles land in Dexie. Filters run locally.",
  },
  {
    n: "02",
    title: "Send a sealed invite",
    body: "NIP-44 + gift wrap. Relays never see the project or the room.",
  },
  {
    n: "03",
    title: "Share a buffer",
    body: "Kinds 28282–28286 for cursors, presence, and the file. Then they vanish.",
  },
];

export default function LandingPage() {
  const router = useRouter();
  const { login, connected, hasExtension, connecting, mounted } = useAuth();

  async function onEnter() {
    if (!connected) {
      await login();
    }
    router.push("/discover");
  }

  return (
    <div>
      <section className="border-b border-border">
        <div className="mx-auto grid max-w-6xl lg:grid-cols-2">
          <div className="flex flex-col justify-between border-border px-4 py-14 lg:border-r lg:py-20">
            <div>
              <p className="font-mono text-xs text-muted-foreground">nostr · no server · no db</p>
              <h1 className="mt-3 max-w-md text-4xl font-semibold leading-[1.05] sm:text-5xl">
                Find a pair.
                <br />
                Build for an hour.
              </h1>
              <p className="mt-5 max-w-md text-[15px] leading-6 text-muted-foreground">
                Match on stack and pair style, then spend the date in a shared editor. Events are
                signed. State lives in your browser.
              </p>
            </div>
            <div className="mt-10">
              <div className="flex flex-wrap gap-2">
                <Button size="lg" onClick={onEnter} disabled={connecting || !mounted}>
                  {connected ? "Open discover" : hasExtension ? "Connect signer" : "Browse discover"}
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/discover">Skip login</Link>
                </Button>
              </div>
              <p className="mt-4 max-w-md text-xs leading-5 text-muted-foreground">
                {hasExtension
                  ? "If nos2x has no key, generate or paste an nsec in the extension — never on this page."
                  : "Install Alby or nos2x to publish. Discover works without a signer."}
              </p>
            </div>
          </div>

          <div className="bg-[#161513] px-4 py-8 font-mono text-[12px] leading-6 text-[#d7d1c3] lg:px-6 lg:py-12">
            <div className="mb-4 flex justify-between text-[11px] text-[#8a8476]">
              <span>EVENT</span>
              <span>kind 31990</span>
            </div>
            <pre className="overflow-x-auto">
              <code>{`{
  "tags": [
    ["d", "profile"],
    ["t", "nostr-dating"],
    ["tech", "rust", "go"],
    ["pair_style", "ping-pong"],
    ["experience", "mid"]
  ],
  "content": {
    "headline": "CLI tools, weekends",
    "github": "https://github.com/you"
  }
}`}</code>
            </pre>
            <dl className="mt-8 grid grid-cols-3 gap-px bg-[#3a372f] text-[11px] text-[#a39c8d]">
              <div className="bg-[#161513] p-3">
                <dt>invite</dt>
                <dd className="mt-1 text-[#d7d1c3]">kind 1059</dd>
              </div>
              <div className="bg-[#161513] p-3">
                <dt>cache</dt>
                <dd className="mt-1 text-[#d7d1c3]">dexie</dd>
              </div>
              <div className="bg-[#161513] p-3">
                <dt>tip</dt>
                <dd className="mt-1 text-[#d7d1c3]">nip-57</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl">
        {steps.map((step) => (
          <div
            key={step.n}
            className="grid gap-2 border-b border-border px-4 py-5 sm:grid-cols-[4rem_14rem_1fr] sm:items-baseline"
          >
            <span className="font-mono text-xs text-muted-foreground">{step.n}</span>
            <h2 className="font-medium">{step.title}</h2>
            <p className="text-sm text-muted-foreground">{step.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
