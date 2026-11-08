import { describe, expect, it, vi } from "vitest";
import _ from "lodash";
import { AnomalyCheckQueue } from "@/modules/anomalies/AnomalyCheckQueue";
import { ConcurrencyQueue } from "@/shared/utils/ConcurrencyQueue";
import { buildListingPrice } from "../../../support/factories";
import { deferred, unitLogger } from "../../../support/fakes";

const setup = (queue?: ConcurrencyQueue) => {
  const manager = { check: vi.fn().mockResolvedValue(undefined) };
  return { manager, checks: new AnomalyCheckQueue<{ id: number }>(manager, queue) };
};

describe("AnomalyCheckQueue", () => {
  it("checks the listing with the prices loaded when the check starts", async () => {
    const { manager, checks } = setup();
    const prices = [[buildListingPrice()]];

    checks.add({ id: 1 }, async () => prices, { adId: 1 });

    await vi.waitFor(() => expect(manager.check).toHaveBeenCalledWith({ id: 1 }, prices));
  });

  it("runs 40 checks at a time", async () => {
    const { manager, checks } = setup();
    const loads = _.range(100).map(() => deferred<never[]>());
    const getPrices = vi.fn();
    loads.forEach((load) => getPrices.mockReturnValueOnce(load.promise));

    _.range(100).forEach((id) => checks.add({ id }, getPrices, {}));

    expect(getPrices).toHaveBeenCalledTimes(40);
    expect(checks.size).toBe(60);
    loads.slice(0, 40).forEach((load) => load.resolve([]));
    await vi.waitFor(() => expect(getPrices).toHaveBeenCalledTimes(80));
    loads.slice(40).forEach((load) => load.resolve([]));
    await vi.waitFor(() => expect(manager.check).toHaveBeenCalledTimes(100));
  });

  it("logs a failed check with the context and goes on with the next one", async () => {
    const { manager, checks } = setup();
    const error = new Error("db down");

    checks.add({ id: 9 }, () => Promise.reject(error), { adId: 9, asin: "B0FAIL" });
    checks.add({ id: 10 }, async () => [], {});

    await vi.waitFor(() => expect(manager.check).toHaveBeenCalledWith({ id: 10 }, []));
    expect(unitLogger().error).toHaveBeenCalledWith("AnomalyCheckQueue", "Anomaly check failed", {
      error,
      adId: 9,
      asin: "B0FAIL",
    });
  });

  it("warns at most once a minute when checks wait a minute or longer", async () => {
    const waits = [59_999, 60_000, 120_000];
    const queue = {
      size: 4,
      add: vi.fn((run: (waitedMs: number) => Promise<unknown>) => run(waits.shift()!)),
    };
    const { checks } = setup(queue as unknown as ConcurrencyQueue);
    const now = vi.spyOn(Date, "now").mockReturnValue(100_000);

    checks.add({ id: 1 }, async () => [], {});
    checks.add({ id: 1 }, async () => [], {});
    now.mockReturnValue(159_999);
    checks.add({ id: 1 }, async () => [], {});
    now.mockRestore();

    expect(unitLogger().warn.mock.calls).toEqual([
      [
        "AnomalyCheckQueue",
        "Anomaly checks run 60 s after the prices were stored",
        { waitedMs: 60_000, queuedAnomalyChecks: 4 },
      ],
    ]);
  });
});
