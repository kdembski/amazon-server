import { AmazonAdService } from "@/modules/marketplaces/amazon/services/AmazonAdService";
import { DailyReportSection } from "@/modules/monitoring/interfaces/DailyReportSection";
import { addSeparators } from "@/shared/utils/number";
import { getSpacing } from "@/shared/discord/spacing";

export class AmazonAdDailyReportSection implements DailyReportSection {
  private adService;

  constructor(adService = new AmazonAdService()) {
    this.adService = adService;
  }

  async getField(from: Date, to: Date) {
    const total = await this.adService.getCount();
    const last = await this.adService.getCount(from, to);

    return {
      name: "Collected asins",
      value: [
        `Total: **${addSeparators(total)}**`,
        `Last 24h: **${addSeparators(last)}**`,
      ].join(getSpacing(4)),
    };
  }
}
