import CurrencyApi from "@everapi/freecurrencyapi-js";
import { CurrencyExchangeRateService } from "@/modules/currency/services/CurrencyExchangeRateService";
import { CurrencyService } from "@/modules/currency/services/CurrencyService";
import { DiscordLogService } from "@/modules/monitoring/services/DiscordLogService";
import { SystemLogService } from "@/shared/logging/services/SystemLogService";
import { CronService } from "@/shared/system/CronService";

export class CurrencyExchangeRateCronService extends CronService {
  protected readonly cronTime = "00 00 20 * * *";
  private exchangeRateService;
  private currencyService;
  private discordService;
  private currencyApi;
  private targetCode = "PLN";

  constructor(
    exchangeRateService = new CurrencyExchangeRateService(),
    currencyService = new CurrencyService(),
    discordService = new DiscordLogService(),
    currencyApi = new CurrencyApi(process.env.CURRENCY_API_KEY),
    logger = SystemLogService.getInstance()
  ) {
    super(logger);
    this.exchangeRateService = exchangeRateService;
    this.currencyService = currencyService;
    this.discordService = discordService;
    this.currencyApi = currencyApi;
  }

  async run(): Promise<void> {
    let sourceCodes: string[] = [];
    try {
      const currencies = await this.currencyService.getAll();
      const target = currencies.find((c) => c.code === this.targetCode);
      if (!target) return this.warnMissingCurrency(this.targetCode);

      const sources = currencies.filter((c) => c !== target);
      sourceCodes = sources.map((c) => c.code);
      const response = await this.currencyApi.latest({
        base_currency: this.targetCode,
        currencies: sourceCodes.join(","),
      });
      await Promise.all(
        sources.map((source) => {
          const rate = response.data[source.code];
          if (!rate) return this.warnMissingRate(source.code);

          const ids = { sourceId: source.id, targetId: target.id };
          return this.exchangeRateService.upsertBySourceAndTarget(ids, {
            value: 1 / rate,
          });
        })
      );
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
        { error: e, target: this.targetCode, sources: sourceCodes }
      );
      this.discordService.send("Currency exchange rates error: " + e.message);
    }
  }

  private warnMissingCurrency(code: string) {
    this.logger.warn(
      "CurrencyExchangeRateCronService",
      `Currency ${code} is missing, exchange rates were not updated`,
      { code }
    );
  }

  private warnMissingRate(code: string) {
    this.logger.warn(
      "CurrencyExchangeRateCronService",
      `Currency API returned no rate for ${code}, its exchange rate was not updated`,
      { code }
    );
  }
}
