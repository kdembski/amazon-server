import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CronJob } from "cron";
import { HourlyStatsCronService } from "@/services/cron/HourlyStatsCronService";
import { DiscordLogService } from "@/services/discord/DiscordLogService";
import { fakeLogService } from "../../../support/fakes";

vi.mock("cron", () => ({
  CronJob: vi.fn(function () {
    return { start: vi.fn() };
  }),
}));

const EVENTS = [
  "ad_scraped",
  "conversion_error_1_sent",
  "conversion_error_2_sent",
  "conversion_error_3_sent",
  "conversion_error_4_sent",
  "conversion_error_5_sent",
  "conversion_error_6_sent",
  "pricing_error_sent",
];

const setup = () => {
  const sendHourly = vi.fn();
  const log = fakeLogService();
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

  it("counts every event over the last hour and sends them in order", async () => {
    const { service, sendHourly, log } = setup();
    log.getCountByEvent.mockImplementation((event: string) =>
      Promise.resolve(EVENTS.indexOf(event) * 10)
    );

    await service.run();

    const from = new Date("2026-06-01T09:00:00Z");
    const to = new Date("2026-06-01T10:00:00Z");
    EVENTS.forEach((event) =>
      expect(log.getCountByEvent).toHaveBeenCalledWith(event, from, to)
    );
    expect(sendHourly).toHaveBeenCalledWith([0, 10, 20, 30, 40, 50, 60, 70]);
  });
});
