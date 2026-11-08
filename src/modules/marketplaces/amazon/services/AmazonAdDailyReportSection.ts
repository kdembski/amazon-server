import { DiscordFormatter } from "@/shared/discord/DiscordFormatter";
import { NumberFormatter } from "@/shared/utils/NumberFormatter";
import { AmazonAdService } from "@/modules/marketplaces/amazon/services/AmazonAdService";
import { DailyReportSection } from "@/modules/monitoring/interfaces/DailyReportSection";

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
        `Total: **${NumberFormatter.addSeparators(total)}**`,
        `Last 24h: **${NumberFormatter.addSeparators(last)}**`,
      ].join(DiscordFormatter.spacing(4)),
    };
  }
}
