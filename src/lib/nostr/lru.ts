/**
 * In-memory LRU used for transient / high-churn events.
 * Persistent application state still lives in Dexie; this only
 * drops duplicate WebSocket deliveries before they hit the UI path.
 */
export class EventLRU {
  private readonly map = new Map<string, number>();

  constructor(private readonly maxSize = 8_000) {}

  has(id: string): boolean {
    return this.map.has(id);
  }

  /**
   * @returns true if the id was already present (duplicate)
   */
  touch(id: string): boolean {
    const exists = this.map.has(id);
    if (exists) this.map.delete(id);
    this.map.set(id, Date.now());
    this.evict();
    return exists;
  }

  evict(): void {
    while (this.map.size > this.maxSize) {
      const oldest = this.map.keys().next().value;
      if (!oldest) break;
      this.map.delete(oldest);
    }
  }

  size(): number {
    return this.map.size;
  }

  clear(): void {
    this.map.clear();
  }
}

export const transientEventCache = new EventLRU(4_000);
export const ingestEventCache = new EventLRU(12_000);
