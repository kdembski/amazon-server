import { DiscordFormatter } from "@/shared/discord/DiscordFormatter";
import { CurrencyExchangeRateService } from "@/modules/currency/services/CurrencyExchangeRateService";
import { DailyReportSectionI } from "@/modules/monitoring/interfaces/DailyReportSectionI";

export class ExchangeRateDailyReportSection implements DailyReportSectionI {
  private exchangeRateService;

  constructor(exchangeRateService = new CurrencyExchangeRateService()) {
    this.exchangeRateService = exchangeRateService;
  }

  async getField() {
    const rates = await this.exchangeRateService.getByTargetCode("PLN");

    return {
      name: "Exchange rates",
      value: rates
        .filter((rate) => rate.source.code !== "PLN")
        .map(
          (rate) =>
            `${rate.source.code} -> ${rate.target.code}: **${rate.value.toFixed(2)}**`
        )
        .join(DiscordFormatter.spacing(4)),
    };
  }
}
