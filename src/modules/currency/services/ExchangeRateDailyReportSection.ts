import { DiscordFormatter } from "@/shared/discord/DiscordFormatter";
import { CurrencyExchangeRateService } from "@/modules/currency/services/CurrencyExchangeRateService";
import { DailyReportSection } from "@/modules/monitoring/interfaces/DailyReportSection";

export class ExchangeRateDailyReportSection implements DailyReportSection {
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
            `${rate.source.code} -> ${rate.target.code}: **${rate.value}**`
        )
        .join(DiscordFormatter.spacing(4)),
    };
  }
}
