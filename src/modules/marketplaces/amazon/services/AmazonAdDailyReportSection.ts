import { DiscordFormatter } from "@/shared/discord/DiscordFormatter";
import { NumberFormatter } from "@/shared/utils/NumberFormatter";
import { AmazonAdService } from "@/modules/marketplaces/amazon/services/AmazonAdService";
import { DailyReportSectionI } from "@/modules/monitoring/interfaces/DailyReportSectionI";

export class AmazonAdDailyReportSection implements DailyReportSectionI {
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
