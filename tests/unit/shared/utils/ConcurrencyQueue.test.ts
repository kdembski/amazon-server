import { afterEach, describe, expect, it, vi } from "vitest";
import { ConcurrencyQueue } from "@/shared/utils/ConcurrencyQueue";
import { deferred } from "../../../support/fakes";

describe("ConcurrencyQueue", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("runs at most `concurrency` tasks at once, the others in order with their wait", async () => {
    const now = vi.spyOn(Date, "now").mockReturnValue(1000);
    const queue = new ConcurrencyQueue(2);
    const tasks = [0, 1, 2, 3].map(() => deferred<void>());
    const started: [number, number][] = [];
    tasks.forEach((task, index) =>
      queue.add((waitedMs) => {
        started.push([index, waitedMs]);
        return task.promise;
      })
    );

    expect(started).toEqual([[0, 0], [1, 0]]);
    expect(queue.size).toBe(2);

    now.mockReturnValue(1500);
    tasks[1].resolve();
    await vi.waitFor(() => expect(started).toHaveLength(3));
    expect(started[2]).toEqual([2, 500]);
    expect(queue.size).toBe(1);
  });

  it("goes on after a task rejects", async () => {
    const queue = new ConcurrencyQueue(1);
    const next = vi.fn().mockResolvedValue(undefined);

    queue.add(() => Promise.reject(new Error("down")));
    queue.add(next);

    await vi.waitFor(() => expect(next).toHaveBeenCalled());
    expect(queue.size).toBe(0);
  });
});
