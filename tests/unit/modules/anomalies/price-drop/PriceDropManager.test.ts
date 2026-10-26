import { describe, expect, it, vi } from "vitest";
import { PriceDropManager } from "@/modules/anomalies/price-drop/PriceDropManager";
import { buildListingPrice } from "../../../../support/factories";

const setup = () => {
  const reporter = { report: vi.fn().mockResolvedValue(undefined) };
  const manager = new PriceDropManager(reporter);
  return { manager, reporter, listing: { id: 1 } };
};

// newest price first, as the marketplace passes them in
const history = (...values: number[]) =>
  values.map((value) => buildListingPrice({ value }));

describe("PriceDropManager", () => {
  it("sends when the newest price is at most 50% of the previous and of the median of the older ones", async () => {
    const { manager, reporter, listing } = setup();
    const country = history(45, 100, 80);

    await manager.check(listing, [country]);

    expect(reporter.report).toHaveBeenCalledWith(listing, [country]);
  });

  it("does not send when the drop is smaller than 50%", async () => {
    const { manager, reporter, listing } = setup();

    await manager.check(listing, [history(51, 100)]);

    expect(reporter.report).not.toHaveBeenCalled();
  });

  it("does not send when the price had already been low for most of the window", async () => {
    const { manager, reporter, listing } = setup();

    await manager.check(listing, [history(40, 100, 30, 30), history(40, 100, 40)]);

    expect(reporter.report).not.toHaveBeenCalled();
  });

  it("does not send with a single price", async () => {
    const { manager, reporter, listing } = setup();

    await manager.check(listing, [history(40)]);

    expect(reporter.report).not.toHaveBeenCalled();
  });

  it("requires a reportable newest price and an active country", async () => {
    const { manager, reporter, listing } = setup();
    const notReportable = [
      buildListingPrice({ value: 40, reportable: false }),
      buildListingPrice({ value: 100 }),
    ];
    const inactive = [
      buildListingPrice({ value: 40, country: { active: false } }),
      buildListingPrice({ value: 100, country: { active: false } }),
    ];

    await manager.check(listing, [notReportable, inactive]);

    expect(reporter.report).not.toHaveBeenCalled();
  });

  it("sends only the qualifying countries", async () => {
    const { manager, reporter, listing } = setup();
    const qualifying = history(40, 100);
    const notQualifying = history(90, 100);

    await manager.check(listing, [notQualifying, qualifying]);

    expect(reporter.report).toHaveBeenCalledWith(listing, [qualifying]);
  });
});
