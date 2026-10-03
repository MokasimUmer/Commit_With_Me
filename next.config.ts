import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@nostr-dev-kit/ndk",
    "@nostr-dev-kit/cache-dexie",
    "@nostr-dev-kit/ndk-cache-dexie",
  ],
};

export default nextConfig;
