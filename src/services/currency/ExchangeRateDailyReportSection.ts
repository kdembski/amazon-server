import { CurrencyExchangeRateService } from "@/services/currency/CurrencyExchangeRateService";
import { DailyReportSection } from "@/modules/monitoring/interfaces/DailyReportSection";
import { getSpacing } from "@/shared/discord/spacing";

export class ExchangeRateDailyReportSection implements DailyReportSection {
  private exchangeRateService;

  constructor(exchangeRateService = new CurrencyExchangeRateService()) {
    this.exchangeRateService = exchangeRateService;
  }

  async getField(_from: Date, _to: Date) {
    const rates = await this.exchangeRateService.getByTargetCode("PLN");

    return {
      name: "Exchange rates",
      value: rates
        .filter((rate) => rate.source.code !== "PLN")
        .map(
          (rate) =>
            `${rate.source.code} -> ${rate.target.code}: **${rate.value}**`
        )
        .join(getSpacing(4)),
    };
  }
}
