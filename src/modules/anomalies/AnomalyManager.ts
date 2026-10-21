import { AnomalyManagerI } from "@/modules/anomalies/interfaces/AnomalyManagerI";
import { ListingPrice } from "@/modules/anomalies/interfaces/ListingPrice";
import { SystemLogService } from "@/shared/logging/services/SystemLogService";

export class AnomalyManager<T> implements AnomalyManagerI<T> {
  private managers;
  private logger;

  constructor(
    managers: AnomalyManagerI<T>[],
    logger = SystemLogService.getInstance()
  ) {
    this.managers = managers;
    this.logger = logger;
  }

  async check(listing: T, countryPrices: ListingPrice[][]) {
    const results = await Promise.allSettled(
      this.managers.map((manager) => manager.check(listing, countryPrices))
    );

    results.forEach((result, index) => {
      if (result.status === "rejected") {
        const manager = this.managers[index].constructor.name;
        this.logger.error("AnomalyManager", `${manager} failed: ${result.reason}`, {
          error: result.reason,
          manager,
          listing,
        });
      }
    });
  }
}
