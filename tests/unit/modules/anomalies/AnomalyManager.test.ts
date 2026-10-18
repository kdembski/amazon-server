import { afterEach, describe, expect, it, vi } from "vitest";
import { AnomalyManager } from "@/modules/anomalies/AnomalyManager";
import { buildListingPrice } from "../../../support/factories";

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
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      new AnomalyManager([]).check({ id: 1 }, [[buildListingPrice()]])
    ).resolves.toBeUndefined();
    expect(error).not.toHaveBeenCalled();
  });

  it("logs a failing manager and still runs the others", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const failing = fakeManager();
    const other = fakeManager();
    failing.check.mockRejectedValue(new Error("db down"));

    await new AnomalyManager([failing, other]).check({ id: 1 }, [
      [buildListingPrice()],
    ]);

    expect(other.check).toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith("AnomalyManager: Error: db down");
  });
});
