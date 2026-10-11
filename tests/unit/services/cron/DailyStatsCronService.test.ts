import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CronJob } from "cron";
import { DailyStatsCronService } from "@/services/cron/DailyStatsCronService";
import { DiscordLogService } from "@/services/discord/DiscordLogService";
import { AmazonAdService } from "@/services/amazon/AmazonAdService";
import { CurrencyExchangeRateService } from "@/services/currency/CurrencyExchangeRateService";
import { buildCurrency, buildRate } from "../../../support/factories";
import { fakeLogService } from "../../../support/fakes";

vi.mock("cron", () => ({
  CronJob: vi.fn(function () {
    return { start: vi.fn() };
  }),
}));

const setup = () => {
  const sendDaily = vi.fn();
  const getCount = vi.fn();
  const getByTargetCode = vi.fn().mockResolvedValue([]);
  const log = fakeLogService();
  const service = new DailyStatsCronService(
    { sendDaily } as unknown as DiscordLogService,
    { getCount } as unknown as AmazonAdService,
    log.service,
    { getByTargetCode } as unknown as CurrencyExchangeRateService
  );
  return { service, sendDaily, getCount, getByTargetCode, log };
};

describe("DailyStatsCronService", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-02T20:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("schedules run() daily at 20:00", () => {
    const { service } = setup();
    const run = vi.spyOn(service, "run").mockResolvedValue();

    service.schedule();

    const [expression, callback] = vi.mocked(CronJob).mock
      .calls[0] as unknown as [string, () => void];
    expect(expression).toBe("00 00 20 * * *");
    callback();
    expect(run).toHaveBeenCalled();
    expect(vi.mocked(CronJob).mock.results[0].value.start).toHaveBeenCalled();
  });

  it("sends total/24h asin counts, non-PLN rates and scraped count", async () => {
    const { service, sendDaily, getCount, getByTargetCode, log } = setup();
    const dayBefore = new Date("2026-06-01T20:00:00Z");
    const now = new Date("2026-06-02T20:00:00Z");
    getCount.mockImplementation((from?: Date) =>
      Promise.resolve(from ? 25 : 1000)
    );
    const eur = buildRate();
    const pln = buildRate({ source: buildCurrency({ code: "PLN" }) });
    getByTargetCode.mockResolvedValue([eur, pln]);
    log.getCountByEvent.mockResolvedValue(777);

    await service.run();

    expect(getCount).toHaveBeenCalledWith();
    expect(getCount).toHaveBeenCalledWith(dayBefore, now);
    expect(getByTargetCode).toHaveBeenCalledWith("PLN");
    expect(log.getCountByEvent).toHaveBeenCalledWith(
      "ad_scraped",
      dayBefore,
      now
    );
    expect(sendDaily).toHaveBeenCalledWith(
      { total: 1000, today: 25 },
      [eur],
      777
    );
  });
});
