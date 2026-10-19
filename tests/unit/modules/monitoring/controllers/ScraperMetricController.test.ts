import { describe, expect, it } from "vitest";
import { ScraperMetricController } from "@/modules/monitoring/controllers/ScraperMetricController";
import {
  fakeRequest,
  fakeResponse,
  fakeScraperMetricService,
} from "../../../../support/fakes";

const body = {
  marketplace: "amazon",
  flow: "pdp",
  periodStart: "2026-10-18T10:00:00.000Z",
  metrics: [{ metric: "requests", value: 1 }],
};

const setup = () => {
  const fake = fakeScraperMetricService();
  return { ...fake, controller: new ScraperMetricController(fake.service) };
};

describe("ScraperMetricController", () => {
  it("addMetrics stores the metrics under the scraper name and returns the count", async () => {
    const { controller, add } = setup();
    add.mockResolvedValue(3);
    const { response, json } = fakeResponse();

    await controller.addMetrics(
      fakeRequest({ params: { name: "amazon-pdp" }, body }),
      response
    );

    expect(add).toHaveBeenCalledWith("amazon-pdp", body);
    expect(json).toHaveBeenCalledWith({ stored: 3 });
  });

  it("answers 400 and stores nothing for an invalid body", async () => {
    const { controller, add } = setup();
    const { response, status, send, json } = fakeResponse();

    await controller.addMetrics(
      fakeRequest({ params: { name: "amazon-pdp" }, body: null }),
      response
    );

    expect(status).toHaveBeenCalledWith(400);
    expect(send).toHaveBeenCalledWith(expect.any(String));
    expect(add).not.toHaveBeenCalled();
    expect(json).not.toHaveBeenCalled();
  });

  it.each([
    ["empty", ""],
    ["64 character", "n".repeat(64)],
  ])("answers 400 and stores nothing for an %s scraper name", async (_label, name) => {
    const { controller, add } = setup();
    const { response, status, send } = fakeResponse();

    await controller.addMetrics(
      fakeRequest({ params: { name }, body }),
      response
    );

    expect(status).toHaveBeenCalledWith(400);
    expect(send).toHaveBeenCalledWith(expect.stringContaining("1-63"));
    expect(add).not.toHaveBeenCalled();
  });

  it("sends an error response when the service throws", async () => {
    const { controller, add } = setup();
    add.mockRejectedValue(new Error("a"));
    const { response, status, send } = fakeResponse();

    await controller.addMetrics(
      fakeRequest({ params: { name: "amazon-pdp" }, body }),
      response
    );

    expect(status).toHaveBeenCalledWith(500);
    expect(send).toHaveBeenCalledWith("a");
  });
});
