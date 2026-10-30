import { SystemLogService } from "@/shared/logging/services/SystemLogService";

const TTL = 10 * 60 * 1000;

type Entry = { createdAt: number; result: Promise<unknown>; pending: boolean };

// Results of work keyed by an Idempotency-Key, so a retried request reuses them; lost on restart
export class IdempotencyCache {
  private static instance: IdempotencyCache;
  private logger;
  entries = new Map<string, Entry>();

  private constructor(logger = SystemLogService.getInstance()) {
    this.logger = logger;
  }

  public static getInstance(): IdempotencyCache {
    if (!IdempotencyCache.instance) {
      IdempotencyCache.instance = new IdempotencyCache();
    }

    return IdempotencyCache.instance;
  }

  run<T>(key: string, callback: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const entry = this.entries.get(key);
    if (entry && entry.createdAt + TTL > now) {
      this.logger.info("IdempotencyCache", `Idempotency-Key ${key} was reused`, {
        key,
        ageMs: now - entry.createdAt,
        pending: entry.pending,
      });
      return entry.result as Promise<T>;
    }

    this.dropExpired(now);
    const result = callback();
    const created: Entry = { createdAt: now, result, pending: true };
    this.entries.set(key, created);
    result.then(
      () => {
        created.pending = false;
      },
      () => {
        if (this.entries.get(key) === created) this.entries.delete(key);
      }
    );
    return result;
  }

  private dropExpired(now: number) {
    this.entries.forEach((entry, key) => {
      if (entry.createdAt + TTL <= now) this.entries.delete(key);
    });
  }
}
