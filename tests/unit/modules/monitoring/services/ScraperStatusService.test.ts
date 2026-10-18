import { beforeEach, describe, expect, it } from "vitest";
import { ScraperStatusService } from "@/modules/monitoring/services/ScraperStatusService";
import { resetSingleton } from "../../../../support/fakes";

describe("ScraperStatusService", () => {
  beforeEach(() => {
    resetSingleton(ScraperStatusService);
  });

  it("is a singleton", () => {
    expect(ScraperStatusService.getInstance()).toBe(
      ScraperStatusService.getInstance()
    );
  });

  it("setStatus stores the dto with the speed difference to the previous status", () => {
    const service = ScraperStatusService.getInstance();

    service.setStatus("pdp-1", { speed: 1.5, pending: 10 });
    expect(service.statuses["pdp-1"]).toEqual({
      speed: 1.5,
      pending: 10,
      speedDiff: 1.5,
    });

    service.setStatus("pdp-1", { speed: 1.2, pending: 8 });
    expect(service.statuses["pdp-1"].speedDiff).toBeCloseTo(-0.3);
  });
});
