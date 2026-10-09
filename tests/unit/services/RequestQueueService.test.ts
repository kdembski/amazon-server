import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RequestQueueService } from "@/services/RequestQueueService";

describe("RequestQueueService", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("runs the first callback immediately and the next after the timeout", async () => {
    const queue = new RequestQueueService(10_000);
    const a = vi.fn().mockResolvedValue("a");
    const b = vi.fn().mockResolvedValue("b");

    const pa = queue.push(a);
    const pb = queue.push(b);

    expect(a).toHaveBeenCalledTimes(1);
    expect(b).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(10_000);
    expect(b).toHaveBeenCalledTimes(1);

    await expect(pa).resolves.toBe("a");
    await expect(pb).resolves.toBe("b");
  });

  it("stops the interval when the queue drains and restarts on next push", async () => {
    const queue = new RequestQueueService(10_000);
    queue.push(vi.fn().mockResolvedValue(1));
    expect(vi.getTimerCount()).toBe(1);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(vi.getTimerCount()).toBe(0);

    const c = vi.fn().mockResolvedValue("c");
    queue.push(c);
    expect(c).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(1);
  });

  it("rejects the returned promise when the callback rejects", async () => {
    const queue = new RequestQueueService(10_000);
    const promise = queue.push(() => Promise.reject(new Error("boom")));

    await expect(promise).rejects.toThrow("boom");
  });
});
