const TTL = 10 * 60 * 1000;

// Results of work keyed by an Idempotency-Key, so a retried request reuses them; lost on restart
export class IdempotencyCache {
  private static instance: IdempotencyCache;
  entries = new Map<string, { expiresAt: number; result: Promise<unknown> }>();

  private constructor() {}

  public static getInstance(): IdempotencyCache {
    if (!IdempotencyCache.instance) {
      IdempotencyCache.instance = new IdempotencyCache();
    }

    return IdempotencyCache.instance;
  }

  run<T>(key: string, callback: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const entry = this.entries.get(key);
    if (entry && entry.expiresAt > now) return entry.result as Promise<T>;

    this.dropExpired(now);
    const result = callback();
    this.entries.set(key, { expiresAt: now + TTL, result });
    result.catch(() => {
      if (this.entries.get(key)?.result === result) this.entries.delete(key);
    });
    return result;
  }

  private dropExpired(now: number) {
    this.entries.forEach((entry, key) => {
      if (entry.expiresAt <= now) this.entries.delete(key);
    });
  }
}
