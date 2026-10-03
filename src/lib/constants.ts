export const APP_NAME = "Commit-with-Me";
export const APP_TAG = "nostr-dating";
export const PROFILE_D_TAG = "profile";

export const KIND_METADATA = 0;
export const KIND_SEAL = 13;
export const KIND_PRIVATE_DM = 14;
export const KIND_GIFT_WRAP = 1059;
export const KIND_ZAP_REQUEST = 9734;
export const KIND_ZAP_RECEIPT = 9735;
export const KIND_APP_DATA = 30078;
export const KIND_DEV_PROFILE = 31990;
export const KIND_CURSOR_SYNC = 28282;
export const KIND_PRESENCE = 28283;
export const KIND_TYPING = 28284;
export const KIND_CODE_SYNC = 28285;
export const KIND_ROOM_CHAT = 28286;

export const TECH_OPTIONS = [
  "typescript",
  "javascript",
  "react",
  "nextjs",
  "rust",
  "go",
  "python",
  "nostr",
  "solidity",
  "zig",
  "elixir",
  "haskell",
  "c",
  "cpp",
  "java",
  "kotlin",
  "swift",
  "ruby",
  "php",
  "nix",
  "wasm",
  "crdt",
  "zk",
  "bitcoin",
  "lightning",
] as const;

export const PAIR_STYLES = [
  "driver-navigator",
  "ping-pong",
  "mob",
] as const;

export const EXPERIENCE_LEVELS = [
  "junior",
  "mid",
  "senior",
  "staff",
] as const;

export const INTEREST_SUGGESTIONS = [
  "Coffee",
  "Vim",
  "Neovim",
  "Emacs",
  "Open Source",
  "Mechanical Keyboards",
  "CLI tools",
  "Local-first",
  "CRDTs",
  "Zero-knowledge",
  "Retro computing",
  "Synth music",
];

export type TechOption = (typeof TECH_OPTIONS)[number];
export type PairStyle = (typeof PAIR_STYLES)[number];
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];
