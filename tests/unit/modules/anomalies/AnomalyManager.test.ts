import { afterEach, describe, expect, it, vi } from "vitest";
import { AnomalyManager } from "@/modules/anomalies/AnomalyManager";
import { buildListingPrice } from "../../../support/factories";
import { fakeSystemLogService } from "../../../support/fakes";

const fakeManager = () => ({ check: vi.fn().mockResolvedValue(undefined) });

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AnomalyManager", () => {
  it("passes the listing and country prices to every given manager", async () => {
    const first = fakeManager();
    const second = fakeManager();
    const listing = { id: 1 };
    const countryPrices = [
      [buildListingPrice(), buildListingPrice()],
      [buildListingPrice()],
    ];

    await new AnomalyManager([first, second]).check(listing, countryPrices);

    expect(first.check).toHaveBeenCalledWith(listing, countryPrices);
    expect(second.check).toHaveBeenCalledWith(listing, countryPrices);
  });

  it("does nothing with an empty manager list", async () => {
    const logger = fakeSystemLogService();

    await expect(
      new AnomalyManager([], logger.service).check({ id: 1 }, [[buildListingPrice()]])
    ).resolves.toBeUndefined();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("logs a failing manager and still runs the others", async () => {
    const logger = fakeSystemLogService();
    const failing = fakeManager();
    const other = fakeManager();
    const reason = new Error("db down");
    failing.check.mockRejectedValue(reason);

    await new AnomalyManager([failing, other], logger.service).check({ id: 1 }, [
      [buildListingPrice()],
    ]);

    expect(other.check).toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      "AnomalyManager",
      "Object failed: Error: db down",
      { error: reason, manager: "Object", listing: { id: 1 } }
    );
  });
});
