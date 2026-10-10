import { describe, expect, it, vi } from "vitest";
import { CronJob } from "cron";
import { CurrencyExchangeRateCronService } from "@/services/cron/CurrencyExchangeRateCronService";
import { CurrencyExchangeRateService } from "@/services/currency/CurrencyExchangeRateService";
import { CurrencyService } from "@/services/currency/CurrencyService";
import { DiscordLogService } from "@/services/discord/DiscordLogService";
import { StorageService } from "@/services/StorageService";
import { buildCurrency, buildRate } from "../../../support/factories";
import { deferred } from "../../../support/fakes";

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
  const getByTargetCode = vi.fn().mockResolvedValue([]);
  const getByCode = vi.fn((code: string) => Promise.resolve(currencies[code]));
  const send = vi.fn();
  const latest = vi.fn().mockResolvedValue({ data: { EUR: 0.25, SEK: 2.5 } });
  const storage = { state: {} } as StorageService;

  const service = new CurrencyExchangeRateCronService(
    {
      updateBySourceAndTarget,
      getByTargetCode,
    } as unknown as CurrencyExchangeRateService,
    { getByCode } as unknown as CurrencyService,
    { send } as unknown as DiscordLogService,
    storage,
    { latest }
  );

  return {
    service,
    currencies,
    pln,
    eur,
    sek,
    updateBySourceAndTarget,
    getByTargetCode,
    getByCode,
    send,
    latest,
    storage,
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
      getByTargetCode,
      storage,
      pln,
      eur,
      sek,
    } = setup();
    const rates = [buildRate()];
    getByTargetCode.mockResolvedValue(rates);

    await service.run();

    expect(updateBySourceAndTarget).toHaveBeenCalledWith(
      { sourceId: eur.id, targetId: pln.id },
      { value: 4 }
    );
    expect(updateBySourceAndTarget).toHaveBeenCalledWith(
      { sourceId: sek.id, targetId: pln.id },
      { value: 0.4 }
    );
    expect(getByTargetCode).toHaveBeenCalledWith("PLN");
    expect(storage.state.plnExchangeRates).toBe(rates);
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

});
