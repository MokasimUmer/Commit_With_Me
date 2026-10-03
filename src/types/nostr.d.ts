export {};

interface Nip07Extension {
  getPublicKey(): Promise<string>;
  signEvent(event: unknown): Promise<unknown>;
  getRelays?(): Promise<Record<string, { read: boolean; write: boolean }>>;
  nip04?: {
    encrypt(pubkey: string, value: string): Promise<string>;
    decrypt(pubkey: string, value: string): Promise<string>;
  };
  nip44?: {
    encrypt(pubkey: string, value: string): Promise<string>;
    decrypt(pubkey: string, value: string): Promise<string>;
  };
}

interface WebLN {
  enable(): Promise<void>;
  sendPayment(paymentRequest: string): Promise<{ preimage: string }>;
}

declare global {
  interface Window {
    nostr?: Nip07Extension;
    webln?: WebLN;
  }
}
