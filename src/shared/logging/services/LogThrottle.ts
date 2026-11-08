// Lets a log through at most once per interval and key
export class LogThrottle {
  private intervalMs;
  private loggedAt = new Map<unknown, number>();

  constructor(intervalMs: number) {
    this.intervalMs = intervalMs;
  }

  shouldLog(key: unknown = undefined, now = Date.now()) {
    const loggedAt = this.loggedAt.get(key);
    if (loggedAt !== undefined && now - loggedAt < this.intervalMs) return false;

    this.loggedAt.set(key, now);
    return true;
  }

  clear() {
    this.loggedAt.clear();
  }
}
