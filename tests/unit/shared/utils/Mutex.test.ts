import { describe, expect, it } from "vitest";
import { Mutex } from "@/shared/utils/Mutex";
import { deferred } from "../../../support/fakes";

describe("Mutex", () => {
  it("starts a callback only after the previous one settled, in order", async () => {
    const mutex = new Mutex();
    const first = deferred<number>();
    const started: number[] = [];

    const call1 = mutex.run(() => {
      started.push(1);
      return first.promise;
    });
    const call2 = mutex.run(async () => {
      started.push(2);
      return 2;
    });
    await Promise.resolve();
    expect(started).toEqual([1]);

    first.resolve(1);
    expect(await call1).toBe(1);
    expect(await call2).toBe(2);
    expect(started).toEqual([1, 2]);
  });

  it("runs the next callback after a rejected one", async () => {
    const mutex = new Mutex();
    const failed = mutex.run(() => Promise.reject(new Error("boom")));

    await expect(failed).rejects.toThrow("boom");
    expect(await mutex.run(async () => "next")).toBe("next");
  });
});
