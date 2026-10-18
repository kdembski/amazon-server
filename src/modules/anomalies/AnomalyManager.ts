import { AnomalyManagerI } from "@/modules/anomalies/interfaces/AnomalyManagerI";
import { Listing, ListingPrice } from "@/modules/anomalies/interfaces/Listing";

export class AnomalyManager implements AnomalyManagerI {
  private managers;

  constructor(managers: AnomalyManagerI[]) {
    this.managers = managers;
  }

  async check(listing: Listing, countryPrices: ListingPrice[][]) {
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
