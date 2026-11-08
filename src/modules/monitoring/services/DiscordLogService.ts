import { DiscordChannelService } from "@/modules/settings/services/DiscordChannelService";
import { SettingService } from "@/modules/settings/services/SettingService";
import { APIEmbedField, MessagePayload, WebhookMessageCreateOptions } from "discord.js";
import { SystemService } from "@/shared/system/SystemService";
import { ScraperMetricSummary } from "@/modules/monitoring/dtos/ScraperMetricDtos";
import { HourlyReportCounts } from "@/modules/monitoring/dtos/StatsDtos";
import { StatusReportFormatter } from "@/modules/monitoring/services/StatusReportFormatter";

export class DiscordLogService {
  private service;
  private systemService;
  private settingService;
  private formatter;

  constructor(
    service = new DiscordChannelService(),
    systemService = SystemService.getInstance(),
    settingService = new SettingService(),
    formatter = new StatusReportFormatter()
  ) {
    this.service = service;
    this.systemService = systemService;
    this.settingService = settingService;
    this.formatter = formatter;
  }

  async send(options: string | MessagePayload | WebhookMessageCreateOptions) {
    const channelId = await this.settingService.get("reports.channelId");
    await this.service.send(channelId, options);
  }

  async sendHourly(counts: HourlyReportCounts, summaries: ScraperMetricSummary[]) {
    const cpu = this.systemService.getCpuUsage();
    const ram = await this.systemService.getMemoryUsage();

    return this.send({ embeds: [this.formatter.getHourlyEmbed(counts, summaries, { cpu, ram })] });
  }

  async sendDaily(sectionFields: APIEmbedField[], scraped: number, comparable?: number, minPrices?: number) {
    const disk = await this.systemService.getDiskSpace();

    return this.send({
      embeds: [this.formatter.getDailyEmbed(sectionFields, scraped, comparable, minPrices, disk)],
    });
  }
}
