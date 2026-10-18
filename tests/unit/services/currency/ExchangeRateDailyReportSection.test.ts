import { describe, expect, it, vi } from "vitest";
import { ExchangeRateDailyReportSection } from "@/services/currency/ExchangeRateDailyReportSection";
import { CurrencyExchangeRateService } from "@/services/currency/CurrencyExchangeRateService";
import { buildCurrency, buildRate } from "../../../support/factories";

describe("ExchangeRateDailyReportSection", () => {
  it("lists PLN-target rates except PLN -> PLN", async () => {
    const getByTargetCode = vi.fn().mockResolvedValue([
      buildRate({ value: 4.3 }),
      buildRate({ source: buildCurrency({ code: "PLN" }) }),
    ]);
    const section = new ExchangeRateDailyReportSection({
      getByTargetCode,
    } as unknown as CurrencyExchangeRateService);

    await expect(
      section.getField(new Date(), new Date())
    ).resolves.toEqual({
      name: "Exchange rates",
      value: "EUR -> PLN: **4.3**",
    });
    expect(getByTargetCode).toHaveBeenCalledWith("PLN");
  });
});
