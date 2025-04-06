import CurencyApi from "@everapi/freecurrencyapi-js";
import { CurrencyExchangeRateService } from "@/services/currency/CurrencyExchangeRateService";
import { CurrencyService } from "@/services/currency/CurrencyService";
import { DiscordLogService } from "@/services/discord/DiscordLogService";
import { StorageService } from "@/services/StorageService";
import { CronJob } from "cron";

export class CurrencyExchangeRateCronService {
  private exchangeRateService;
  private currencyService;
  private discordService;
  private currencyApi;
  private storageService;
  private targetCode = "PLN";
  private sourceCodes = ["EUR", "SEK"];

  constructor(
    exchangeRateService = new CurrencyExchangeRateService(),
    currencyService = new CurrencyService(),
    discordService = new DiscordLogService(),
    storageService = StorageService.getInstance(),
    currencyApi = new CurencyApi(process.env.CURRENCY_API_KEY)
  ) {
    this.exchangeRateService = exchangeRateService;
    this.currencyService = currencyService;
    this.discordService = discordService;
    this.currencyApi = currencyApi;
    this.storageService = storageService;
  }

  async schedule() {
    new CronJob("00 00 20 * * * *", async () => {
      this.currencyApi
        .latest({
          base_currency: this.targetCode,
          currencies: this.sourceCodes.join(","),
        })
        .then(async (response: any) => {
          await this.updateCurrencyExchangeRates(response.data);
          await this.updateStoredPlnExchangeRates();
        })
        .catch((e: any) => {
          this.discordService.send(
            "Currency exchange rates error: " + e.message
          );
        });
    }).start();
  }

  private async updateStoredPlnExchangeRates() {
    const rates = await this.exchangeRateService.getByTargetCode("PLN");
    this.storageService.state.plnExchangeRates = rates;
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
        const ids = { sourceId: source.id, targetId: targetCurrency.id };
        await this.exchangeRateService.updateBySourceAndTarget(ids, { value });
      });
    });
  }
}
