import { describe, expect, it, vi } from "vitest";
import { ScraperStatusService } from "@/modules/monitoring/services/ScraperStatusService";
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
  const getStatuses = vi.fn().mockResolvedValue([]);
  const statusService = { getStatuses } as unknown as ScraperStatusService;
  const controller = new ScraperMetricController(fake.service, undefined, undefined, statusService);
  return { ...fake, getStatuses, controller };
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

    expect(add).toHaveBeenCalledWith("amazon-pdp", body, undefined);
    expect(json).toHaveBeenCalledWith({ stored: 3 });
  });

  it("addMetrics passes the Idempotency-Key header", async () => {
    const { controller, add } = setup();
    const { response } = fakeResponse();

    await controller.addMetrics(
      fakeRequest({
        params: { name: "amazon-pdp" },
        body,
        headers: { "idempotency-key": "metrics-1" },
      }),
      response
    );

    expect(add).toHaveBeenCalledWith("amazon-pdp", body, "metrics-1");
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

  const query = { from: "2026-10-26T00:00:00Z", to: "2026-10-26T12:00:00Z" };
  const range = { from: new Date(query.from), to: new Date(query.to) };

  it("getSummaries returns the summaries of the range", async () => {
    const { controller, getSummaries } = setup();
    getSummaries.mockResolvedValue([{ scraper: "a" }]);
    const { response, json } = fakeResponse();

    await controller.getSummaries(fakeRequest({ query }), response);

    expect(getSummaries).toHaveBeenCalledWith(range.from, range.to);
    expect(json).toHaveBeenCalledWith([{ scraper: "a" }]);
  });

  it("getSeries returns the hourly series of the range", async () => {
    const { controller, getSeries } = setup();
    getSeries.mockResolvedValue([{ scraper: "a", points: [] }]);
    const { response, json } = fakeResponse();

    await controller.getSeries(fakeRequest({ query }), response);

    expect(getSeries).toHaveBeenCalledWith(range);
    expect(json).toHaveBeenCalledWith([{ scraper: "a", points: [] }]);
  });

  it("getCountSeries returns the hourly count series of the range", async () => {
    const { controller, getCountSeries } = setup();
    getCountSeries.mockResolvedValue([{ group: "de", points: [] }]);
    const { response, json } = fakeResponse();

    await controller.getCountSeries(fakeRequest({ query }), response);

    expect(getCountSeries).toHaveBeenCalledWith(range);
    expect(json).toHaveBeenCalledWith([{ group: "de", points: [] }]);
  });

  it("getBreakdown returns the breakdown of the range by the given key", async () => {
    const { controller, getBreakdown } = setup();
    getBreakdown.mockResolvedValue([{ scraper: "a", group: "de" }]);
    const { response, json } = fakeResponse();

    await controller.getBreakdown(fakeRequest({ query: { ...query, by: "country" } }), response);

    expect(getBreakdown).toHaveBeenCalledWith(range.from, range.to, "country");
    expect(json).toHaveBeenCalledWith([{ scraper: "a", group: "de" }]);
  });

  it("getBreakdown answers 400 for an invalid key", async () => {
    const { controller, getBreakdown } = setup();
    const { response, status, send } = fakeResponse();

    await controller.getBreakdown(fakeRequest({ query: { ...query, by: "x" } }), response);

    expect(status).toHaveBeenCalledWith(400);
    expect(send).toHaveBeenCalledWith("by must be one of: country, flow");
    expect(getBreakdown).not.toHaveBeenCalled();
  });

  it("getStatuses returns the statuses", async () => {
    const { controller, getStatuses } = setup();
    getStatuses.mockResolvedValue([{ scraper: "a", lastReportAt: "t" }]);
    const { response, json } = fakeResponse();

    await controller.getStatuses(response);

    expect(json).toHaveBeenCalledWith([{ scraper: "a", lastReportAt: "t" }]);
  });

  it("getStatuses sends an error response when the service throws", async () => {
    const { controller, getStatuses } = setup();
    getStatuses.mockRejectedValue(new Error("a"));
    const { response, status } = fakeResponse();

    await controller.getStatuses(response);

    expect(status).toHaveBeenCalledWith(500);
  });

  it.each(["getSummaries", "getSeries", "getCountSeries", "getBreakdown"] as const)(
    "%s answers 400 for an invalid range",
    async (method) => {
      const { controller, getSummaries, getSeries, getCountSeries, getBreakdown } = setup();
      const { response, status, json } = fakeResponse();

      await controller[method](
        fakeRequest({ query: { from: "x", to: "y", by: "country" } }),
        response
      );

      expect(status).toHaveBeenCalledWith(400);
      expect(json).not.toHaveBeenCalled();
      expect(getSummaries).not.toHaveBeenCalled();
      expect(getSeries).not.toHaveBeenCalled();
      expect(getCountSeries).not.toHaveBeenCalled();
      expect(getBreakdown).not.toHaveBeenCalled();
    }
  );
});
