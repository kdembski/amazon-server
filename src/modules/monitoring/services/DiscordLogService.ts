import { addSeparators, roundToOneDecimal } from "@/shared/utils/number";
import { DiscordService } from "@/shared/discord/DiscordService";
import {
  APIEmbedField,
  MessagePayload,
  WebhookMessageCreateOptions,
} from "discord.js";
import { SystemService } from "@/shared/system/SystemService";
import { getSpacing } from "@/shared/discord/spacing";

export class DiscordLogService {
  private service;
  private systemService;

  constructor(
    service = new DiscordService("DISCORD_LOGS_TOKEN"),
    systemService = SystemService.getInstance()
  ) {
    this.service = service;
    this.systemService = systemService;
  }

  send(options: string | MessagePayload | WebhookMessageCreateOptions) {
    return this.service.send(options);
  }

  async sendHourly(logs: number[]) {
    const cpu = this.systemService.getCpuUsage();
    const ram = await this.systemService.getMemoryUsage();

    const fields: APIEmbedField[] = [];

    fields.push({
      name: "Channels",
      value: [
        `50%: **${logs[1]}**`,
        `70%: **${logs[2]}**`,
        `90%: **${logs[3]}**`,
        `0-50: **${logs[4]}**`,
        `50-200: **${logs[5]}**`,
        `200+: **${logs[6]}**`,
        `hist: **${logs[7]}**`,
      ].join(getSpacing(4)),
    });

    fields.push({
      name: "Server",
      value: [`CPU: **${roundToOneDecimal(cpu)}%**`, `RAM: **${ram}%**`].join(
        getSpacing(4)
      ),
    });

    const embed = {
      title: "Hourly status",
      description: `Scraped: **${addSeparators(logs[0])}**`,
      fields,
    };

    return this.service.send({ embeds: [embed] });
  }

  async sendDaily(sectionFields: APIEmbedField[], scraped: number) {
    const disk = await this.systemService.getDiskSpace();
    const fields: APIEmbedField[] = [...sectionFields];

    if (disk) {
      fields.push({
        name: "Server",
        value: `Disk space: **${disk.used}**/**${disk.total}** *(${disk.percentage}%)*`,
      });
    }

    const embed = {
      title: "Daily status",
      description: `Scraped: **${addSeparators(scraped)}**`,
      fields,
    };

    return this.service.send({ embeds: [embed] });
  }
}
