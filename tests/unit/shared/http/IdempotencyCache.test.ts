import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IdempotencyCache } from "@/shared/http/IdempotencyCache";
import { deferred, resetSingleton, unitLogger } from "../../../support/fakes";

const setup = () => {
  resetSingleton(IdempotencyCache);
  return IdempotencyCache.getInstance();
};

describe("IdempotencyCache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("is a singleton", () => {
    expect(IdempotencyCache.getInstance()).toBe(IdempotencyCache.getInstance());
  });

  it("runs the callback once per key and returns its result to every caller", async () => {
    const cache = setup();
    const work = deferred<number>();
    const callback = vi.fn(() => work.promise);

    const first = cache.run("key", callback);
    const second = cache.run("key", callback);
    work.resolve(7);

    expect(await first).toBe(7);
    expect(await second).toBe(7);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("runs the callback for different keys", async () => {
    const cache = setup();
    const callback = vi.fn().mockResolvedValue(1);

    await cache.run("a", callback);
    await cache.run("b", callback);

    expect(callback).toHaveBeenCalledTimes(2);
  });

  it("forgets a key whose callback failed", async () => {
    const cache = setup();
    const callback = vi.fn().mockRejectedValueOnce(new Error("down")).mockResolvedValue(2);

    await expect(cache.run("key", callback)).rejects.toThrow("down");

    expect(await cache.run("key", callback)).toBe(2);
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it("runs the callback again once the key expired after 10 minutes", async () => {
    const cache = setup();
    const callback = vi.fn().mockResolvedValue(1);

    await cache.run("key", callback);
    vi.advanceTimersByTime(10 * 60 * 1000 - 1);
    await cache.run("key", callback);
    expect(callback).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1);
    await cache.run("key", callback);
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it("logs a reused key with its age and whether its work still runs", async () => {
    const cache = setup();
    const work = deferred<number>();
    cache.run("key", () => work.promise);

    vi.advanceTimersByTime(1500);
    cache.run("key", vi.fn());
    work.resolve(1);
    await work.promise;
    cache.run("key", vi.fn());

    expect(unitLogger().info.mock.calls).toEqual([
      ["IdempotencyCache", "Idempotency-Key key was reused", { key: "key", ageMs: 1500, pending: true }],
      ["IdempotencyCache", "Idempotency-Key key was reused", { key: "key", ageMs: 1500, pending: false }],
    ]);
  });

  it("keeps a newer entry when an expired callback of the key fails later", async () => {
    const cache = setup();
    const old = deferred<number>();
    cache.run("key", () => old.promise);
    vi.advanceTimersByTime(10 * 60 * 1000);
    await cache.run("key", vi.fn().mockResolvedValue(2));

    old.reject(new Error("late"));
    await old.promise.catch(() => undefined);

    expect(await cache.run("key", vi.fn())).toBe(2);
  });

  it("drops expired keys when a new one is added", async () => {
    const cache = setup();
    await cache.run("old", vi.fn().mockResolvedValue(1));
    vi.advanceTimersByTime(10 * 60 * 1000);

    await cache.run("new", vi.fn().mockResolvedValue(1));

    expect([...cache.entries.keys()]).toEqual(["new"]);
  });
});
