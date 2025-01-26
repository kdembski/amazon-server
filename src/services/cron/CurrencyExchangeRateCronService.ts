import cron from "node-cron";
import CurencyApi from "@everapi/freecurrencyapi-js";
import { DiscordService } from "@/services/DiscordService";
import { CurrencyExchangeRateService } from "@/services/currency/CurrencyExchangeRateService";
import { CurrencyService } from "@/services/currency/CurrencyService";
import { roundToTwoDecimals } from "@/helpers/number";

export class CurrencyExchangeRateCronService {
  private currencyExchangeRateService;
  private currencyService;
  private discordService;
  private currencyApi;
  private targetCode = "PLN";
  private sourceCodes = ["EUR", "SEK"];

  constructor(
    currencyExchangeRateService = new CurrencyExchangeRateService(),
    currencyService = new CurrencyService(),
    discordService = new DiscordService(),
    currencyApi = new CurencyApi(process.env.CURRENCY_API_KEY)
  ) {
    this.currencyExchangeRateService = currencyExchangeRateService;
    this.currencyService = currencyService;
    this.discordService = discordService;
    this.currencyApi = currencyApi;
  }

  async schedule() {
    cron.schedule("00 00 20 * * * *", async () => {
      this.currencyApi
        .latest({
          base_currency: this.targetCode,
          currencies: this.sourceCodes.join(","),
        })
        .then(async (response: any) => {
          this.updateCurrencyExchangeRates(response.data);
        })
        .catch((e: any) => {
          this.discordService.send(
            "Currency exchange rates error: " + e.message
          );
        });
    });
  }

  private async updateCurrencyExchangeRates(rates: Record<string, number>) {
    const targetCurrency = await this.currencyService.getByCode(
      this.targetCode
    );
    const sourceCurrencies = this.sourceCodes.map((code) =>
      this.currencyService.getByCode(code)
    );

    if (!targetCurrency) return;

    await Promise.all(sourceCurrencies).then((sources) => {
      sources.forEach(async (source) => {
        if (!source) return;

        const value = 1 / rates[source.code];

        await this.currencyExchangeRateService.updateBySourceAndTarget(
          {
            sourceId: source.id,
            targetId: targetCurrency.id,
          },
          { value }
        );
      });

      this.sendSuccessMessageToDiscord(rates, targetCurrency, sources);
    });
  }

  private sendSuccessMessageToDiscord(
    rates: Record<string, number>,
    target: Awaited<ReturnType<typeof this.currencyService.getByCode>>,
    sources: Awaited<ReturnType<typeof this.currencyService.getByCode>>[]
  ) {
    if (!sources || !target) return;

    const message = sources.reduce((accum, source) => {
      if (!source) return accum;

      accum += `${source.code} -> ${target.code}:  ${roundToTwoDecimals(
        1 / rates[source.code]
      )}\n`;

      return accum;
    }, "Updated currency exchange rates:\n");

    this.discordService.send(message);
  }
}
