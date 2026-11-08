import { APIEmbedField } from "discord.js";
import { ScraperMetricSummary } from "@/modules/monitoring/dtos/ScraperMetricDtos";
import { HourlyReportCounts } from "@/modules/monitoring/dtos/StatsDtos";
import { DiscordFormatter } from "@/shared/discord/DiscordFormatter";
import { NumberFormatter } from "@/shared/utils/NumberFormatter";

// The Discord embeds of the hourly and the daily status report
export class StatusReportFormatter {
  getHourlyEmbed(
    counts: HourlyReportCounts,
    summaries: ScraperMetricSummary[],
    server: { cpu: number; ram: number }
  ) {
    const fields: APIEmbedField[] = [];

    fields.push({
      name: "Channels",
      value: [...counts.channels, ...(counts.priceDrop ? [counts.priceDrop] : [])]
        .map(({ name, count }) => `${name}: **${count}**`)
        .join(DiscordFormatter.spacing(4)),
    });

    if (summaries.length) {
      fields.push({ name: "Scrapers", value: this.getScrapersValue(summaries) });
    }

    fields.push({
      name: "Server",
      value: [`CPU: **${NumberFormatter.round(server.cpu, 1)}%**`, `RAM: **${server.ram}%**`].join(
        DiscordFormatter.spacing(4)
      ),
    });

    return {
      title: "Hourly status",
      description: this.getScrapedDescription(counts.scraped, counts.comparable, counts.minPrices),
      fields,
    };
  }

  getDailyEmbed(
    sectionFields: APIEmbedField[],
    scraped: number,
    comparable: number | undefined,
    minPrices: number | undefined,
    disk: { used: string; total: string; percentage: string } | undefined
  ) {
    const fields: APIEmbedField[] = [...sectionFields];

    if (disk) {
      fields.push({
        name: "Server",
        value: `Disk space: **${disk.used}**/**${disk.total}** *(${disk.percentage}%)*`,
      });
    }

    return {
      title: "Daily status",
      description: this.getScrapedDescription(scraped, comparable, minPrices),
      fields,
    };
  }

  private getScrapedDescription(scraped: number, comparable?: number, minPrices?: number) {
    const parts = [`Scraped: **${NumberFormatter.addSeparators(scraped)}**`];
    if (minPrices !== undefined) {
      parts.push(`${minPrices}+ prices: **${NumberFormatter.addSeparators(comparable ?? 0)}**`);
    }
    return parts.join(DiscordFormatter.spacing(4));
  }

  private getSpeedIcon(speed: number) {
    // 0.05 is the lowest speed rendered as 0.1/s
    return speed >= 0.05 ? "<:gn:1345009439916294154>" : "<:rd:1345009441191362613>";
  }

  private getSpeedDiff(diff: number) {
    if (diff > -0.01 && diff < 0.01) return "*(0.00)*";
    if (diff > 0) return `*(+${NumberFormatter.round(diff, 2)})*`;
    return `*(${NumberFormatter.round(diff, 2)})*`;
  }

  private getSpeedDiffIcon(diff: number) {
    if (diff >= 0.02) return "<:au:1369710756358258748>";
    if (diff <= -0.02) return "<:ad:1369710758241374219>";
    return `${DiscordFormatter.spacing(3)}-${DiscordFormatter.spacing(3)}`;
  }

  private getScrapersValue(summaries: ScraperMetricSummary[]) {
    const content = summaries
      .map(({ scraper, itemsPerSecond, itemsPerSecondDiff }) => {
        return [
          `${this.getSpeedIcon(itemsPerSecond)} ${scraper}`,
          `**${NumberFormatter.round(itemsPerSecond, 1)}/s** ${this.getSpeedDiff(itemsPerSecondDiff)} ${this.getSpeedDiffIcon(itemsPerSecondDiff)}`,
        ].join(DiscordFormatter.spacing(4));
      })
      .join("\n");

    return content.substring(0, 1023);
  }
}
