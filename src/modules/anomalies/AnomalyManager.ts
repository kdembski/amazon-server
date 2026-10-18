import { AnomalyManagerI } from "@/modules/anomalies/interfaces/AnomalyManagerI";
import { ListingPrice } from "@/modules/anomalies/interfaces/ListingPrice";

export class AnomalyManager<T> implements AnomalyManagerI<T> {
  private managers;

  constructor(managers: AnomalyManagerI<T>[]) {
    this.managers = managers;
  }

  async check(listing: T, countryPrices: ListingPrice[][]) {
    const results = await Promise.allSettled(
      this.managers.map((manager) => manager.check(listing, countryPrices))
    );

    results.forEach((result) => {
      if (result.status === "rejected") {
        console.error(`AnomalyManager: ${result.reason}`);
      }
    });
  }
}
