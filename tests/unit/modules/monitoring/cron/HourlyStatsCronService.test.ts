import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CronJob } from "cron";
import { HourlyStatsCronService } from "@/modules/monitoring/cron/HourlyStatsCronService";
import { DiscordLogService } from "@/modules/monitoring/services/DiscordLogService";
import { fakeActivityEventService } from "../../../../support/fakes";

vi.mock("cron", () => ({
  CronJob: vi.fn(function () {
    return { start: vi.fn() };
  }),
}));

const COUNTS: [string, string?][] = [
  ["ad_scraped"],
  ["conversion_error_sent", "1"],
  ["conversion_error_sent", "2"],
  ["conversion_error_sent", "3"],
  ["conversion_error_sent", "4"],
  ["conversion_error_sent", "5"],
  ["conversion_error_sent", "6"],
  ["pricing_error_sent"],
];

const setup = () => {
  const sendHourly = vi.fn();
  const log = fakeActivityEventService();
  const service = new HourlyStatsCronService(
    { sendHourly } as unknown as DiscordLogService,
    log.service
  );
  return { service, sendHourly, log };
};

describe("HourlyStatsCronService", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T10:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("schedules run() every full hour", () => {
    const { service } = setup();
    const run = vi.spyOn(service, "run").mockResolvedValue();

    service.schedule();

    const [expression, callback] = vi.mocked(CronJob).mock
      .calls[0] as unknown as [string, () => void];
    expect(expression).toBe("00 00 */1 * * *");
    callback();
    expect(run).toHaveBeenCalled();
    expect(vi.mocked(CronJob).mock.results[0].value.start).toHaveBeenCalled();
  });

  it("counts every event type and conversion channel over the last hour and sends them in order", async () => {
    const { service, sendHourly, log } = setup();
    log.getCount.mockImplementation(
      (type: string, _from: Date, _to: Date, channel?: string) =>
        Promise.resolve(
          COUNTS.findIndex(([t, c]) => t === type && c === channel) * 10
        )
    );

    await service.run();

    const from = new Date("2026-06-01T09:00:00Z");
    const to = new Date("2026-06-01T10:00:00Z");
    COUNTS.forEach(([type, channel]) =>
      expect(log.getCount).toHaveBeenCalledWith(type, from, to, channel)
    );
    expect(sendHourly).toHaveBeenCalledWith([0, 10, 20, 30, 40, 50, 60, 70]);
  });
});
