import { describe, expect, it, vi } from "vitest";
import { CronJob } from "cron";
import { CurrencyExchangeRateCronService } from "@/modules/currency/cron/CurrencyExchangeRateCronService";
import { CurrencyExchangeRateService } from "@/modules/currency/services/CurrencyExchangeRateService";
import { CurrencyService } from "@/modules/currency/services/CurrencyService";
import { DiscordLogService } from "@/modules/monitoring/services/DiscordLogService";
import { buildCurrency } from "../../../../support/factories";
import { deferred } from "../../../../support/fakes";

vi.mock("cron", () => ({
  CronJob: vi.fn(function () {
    return { start: vi.fn() };
  }),
}));

const setup = () => {
  const pln = buildCurrency({ code: "PLN" });
  const eur = buildCurrency({ code: "EUR" });
  const sek = buildCurrency({ code: "SEK" });
  const currencies: Record<string, typeof pln | null> = {
    PLN: pln,
    EUR: eur,
    SEK: sek,
  };

  const updateBySourceAndTarget = vi.fn().mockResolvedValue({});
  const refreshPlnRates = vi.fn().mockResolvedValue(undefined);
  const getByCode = vi.fn((code: string) => Promise.resolve(currencies[code]));
  const send = vi.fn();
  const latest = vi.fn().mockResolvedValue({ data: { EUR: 0.25, SEK: 2.5 } });

  const service = new CurrencyExchangeRateCronService(
    {
      updateBySourceAndTarget,
      refreshPlnRates,
    } as unknown as CurrencyExchangeRateService,
    { getByCode } as unknown as CurrencyService,
    { send } as unknown as DiscordLogService,
    { latest }
  );

  return {
    service,
    currencies,
    pln,
    eur,
    sek,
    updateBySourceAndTarget,
    refreshPlnRates,
    getByCode,
    send,
    latest,
  };
};

describe("CurrencyExchangeRateCronService", () => {
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

  it("asks the API for EUR and SEK against PLN", async () => {
    const { service, latest } = setup();
    await service.run();
    expect(latest).toHaveBeenCalledWith({
      base_currency: "PLN",
      currencies: "EUR,SEK",
    });
  });

  it("stores inverted rates and refreshes the PLN cache", async () => {
    const {
      service,
      updateBySourceAndTarget,
      refreshPlnRates,
      pln,
      eur,
      sek,
    } = setup();
    await service.run();

    expect(updateBySourceAndTarget).toHaveBeenCalledWith(
      { sourceId: eur.id, targetId: pln.id },
      { value: 4 }
    );
    expect(updateBySourceAndTarget).toHaveBeenCalledWith(
      { sourceId: sek.id, targetId: pln.id },
      { value: 0.4 }
    );
    expect(refreshPlnRates).toHaveBeenCalledTimes(1);
  });

  it("skips everything when the PLN currency is missing", async () => {
    const { service, currencies, updateBySourceAndTarget } = setup();
    currencies.PLN = null;

    await service.run();

    expect(updateBySourceAndTarget).not.toHaveBeenCalled();
  });

  it("skips source currencies that are missing", async () => {
    const { service, currencies, updateBySourceAndTarget, eur, pln } = setup();
    currencies.SEK = null;

    await service.run();

    expect(updateBySourceAndTarget).toHaveBeenCalledTimes(1);
    expect(updateBySourceAndTarget).toHaveBeenCalledWith(
      { sourceId: eur.id, targetId: pln.id },
      { value: 4 }
    );
  });

  it("reports API failures to the Discord log channel", async () => {
    const { service, latest, send, updateBySourceAndTarget } = setup();
    latest.mockRejectedValue(new Error("quota"));

    await service.run();

    expect(send).toHaveBeenCalledWith("Currency exchange rates error: quota");
    expect(updateBySourceAndTarget).not.toHaveBeenCalled();
  });

  it("refreshes the cache only after all rate updates have completed", async () => {
    const { service, updateBySourceAndTarget, refreshPlnRates } = setup();
    const pending = deferred<unknown>();
    updateBySourceAndTarget.mockReturnValue(pending.promise);

    const run = service.run();
    await vi.waitFor(() =>
      expect(updateBySourceAndTarget).toHaveBeenCalledTimes(2)
    );
    expect(refreshPlnRates).not.toHaveBeenCalled();

    pending.resolve({});
    await run;
    expect(refreshPlnRates).toHaveBeenCalled();
  });

  it("reports rate update failures and skips the cache refresh", async () => {
    const { service, updateBySourceAndTarget, refreshPlnRates, send } = setup();
    updateBySourceAndTarget.mockRejectedValue(new Error("db down"));

    await service.run();

    expect(send).toHaveBeenCalledWith("Currency exchange rates error: db down");
    expect(refreshPlnRates).not.toHaveBeenCalled();
  });
});
