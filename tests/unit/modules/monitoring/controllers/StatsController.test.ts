import { describe, expect, it, vi } from "vitest";
import { StatsController } from "@/modules/monitoring/controllers/StatsController";
import { ActivityStatsService } from "@/modules/monitoring/services/ActivityStatsService";
import { LogStatsService } from "@/modules/monitoring/services/LogStatsService";
import { fakeRequest, fakeResponse } from "../../../../support/fakes";

const query = { from: "2026-10-26T00:00:00Z", to: "2026-10-26T12:00:00Z" };
const range = { from: new Date(query.from), to: new Date(query.to) };

const setup = () => {
  const activity = { get: vi.fn().mockResolvedValue({ series: "activity" }) };
  const logs = { get: vi.fn().mockResolvedValue({ series: "logs" }) };
  const controller = new StatsController(
    activity as unknown as ActivityStatsService,
    logs as unknown as LogStatsService
  );
  return { controller, activity, logs };
};

describe("StatsController", () => {
  it("getActivity returns the activity stats of the range", async () => {
    const { controller, activity } = setup();
    const { response, json } = fakeResponse();

    await controller.getActivity(fakeRequest({ query }), response);

    expect(activity.get).toHaveBeenCalledWith(range);
    expect(json).toHaveBeenCalledWith({ series: "activity" });
  });

  it("getLogs returns the log stats of the range", async () => {
    const { controller, logs } = setup();
    const { response, json } = fakeResponse();

    await controller.getLogs(fakeRequest({ query }), response);

    expect(logs.get).toHaveBeenCalledWith(range);
    expect(json).toHaveBeenCalledWith({ series: "logs" });
  });

  it.each(["getActivity", "getLogs"] as const)(
    "%s answers 400 for an invalid range",
    async (method) => {
      const { controller, activity, logs } = setup();
      const { response, status, json } = fakeResponse();

      await controller[method](fakeRequest({ query: { from: "x" } }), response);

      expect(status).toHaveBeenCalledWith(400);
      expect(json).not.toHaveBeenCalled();
      expect(activity.get).not.toHaveBeenCalled();
      expect(logs.get).not.toHaveBeenCalled();
    }
  );
});
