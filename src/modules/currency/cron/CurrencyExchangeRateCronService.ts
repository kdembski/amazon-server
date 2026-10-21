import CurencyApi from "@everapi/freecurrencyapi-js";
import { CurrencyExchangeRateService } from "@/modules/currency/services/CurrencyExchangeRateService";
import { CurrencyService } from "@/modules/currency/services/CurrencyService";
import { DiscordLogService } from "@/modules/monitoring/services/DiscordLogService";
import { SystemLogService } from "@/shared/logging/services/SystemLogService";
import { CronJob } from "cron";

export class CurrencyExchangeRateCronService {
  private exchangeRateService;
  private currencyService;
  private discordService;
  private currencyApi;
  private logger;
  private targetCode = "PLN";
  private sourceCodes = ["EUR", "SEK"];

  constructor(
    exchangeRateService = new CurrencyExchangeRateService(),
    currencyService = new CurrencyService(),
    discordService = new DiscordLogService(),
    currencyApi = new CurencyApi(process.env.CURRENCY_API_KEY),
    logger = SystemLogService.getInstance()
  ) {
    this.logger = logger;
    this.exchangeRateService = exchangeRateService;
    this.currencyService = currencyService;
    this.discordService = discordService;
    this.currencyApi = currencyApi;
  }

  schedule() {
    new CronJob("00 00 20 * * *", () =>
      this.run().catch((error) =>
        this.logger.error("CurrencyExchangeRateCronService", "Cron run failed", { error })
      )
    ).start();
  }

  async run(): Promise<void> {
    try {
      const response = await this.currencyApi.latest({
        base_currency: this.targetCode,
        currencies: this.sourceCodes.join(","),
      });
      await this.updateCurrencyExchangeRates(response.data);
      await this.exchangeRateService.refreshPlnRates();
      this.logger.info(
        "CurrencyExchangeRateCronService",
        "Currency exchange rates updated",
        { target: this.targetCode, rates: response.data }
      );
    } catch (e: any) {
      this.logger.error(
        "CurrencyExchangeRateCronService",
        "Currency exchange rates update failed",
        { error: e, target: this.targetCode, sources: this.sourceCodes }
      );
      this.discordService.send("Currency exchange rates error: " + e.message);
    }
  }

  private async updateCurrencyExchangeRates(rates: Record<string, number>) {
    const targetCurrency = await this.currencyService.getByCode(
      this.targetCode
    );
    const sourceCurrencies = this.sourceCodes.map((code) =>
      this.currencyService.getByCode(code)
    );

    if (!targetCurrency) return this.warnMissing(this.targetCode);

    const sources = await Promise.all(sourceCurrencies);
    await Promise.all(
      sources.map(async (source) => {
        if (!source) return;

        const value = 1 / rates[source.code];
        const ids = { sourceId: source.id, targetId: targetCurrency.id };
        await this.exchangeRateService.updateBySourceAndTarget(ids, { value });
      })
    );
    sources.forEach((source, index) => {
      if (!source) this.warnMissing(this.sourceCodes[index]);
    });
  }

  private warnMissing(code: string) {
    this.logger.warn(
      "CurrencyExchangeRateCronService",
      `Currency ${code} is missing, its exchange rate was not updated`,
      { code }
    );
  }
}
