import { APIEmbed } from "discord.js";
import { AmazonAdSelectDto } from "@/modules/marketplaces/amazon/dtos/AmazonAdDtos";
import { AMAZON_DEAL_CHECK_PROMPT } from "@/modules/marketplaces/amazon/services/AmazonDealCheckPrompt";
import { BusinessLogService } from "@/modules/monitoring/services/BusinessLogService";
import { DiscordChannelService } from "@/modules/settings/services/DiscordChannelService";
import { ClaudeCliService } from "@/shared/claude/ClaudeCliService";
import { SystemLogService } from "@/shared/logging/services/SystemLogService";
import { ConcurrencyQueue } from "@/shared/utils/ConcurrencyQueue";

export interface DealCheckPrice {
  country: string;
  value: string;
  currency: string;
  url: string;
}

const VERDICT = /Werdykt:\s*\**\s*(KUPUJ|MOŻE|NIE)/;
const COLORS: Record<string, number> = { KUPUJ: 0x2ecc71, MOŻE: 0xf1c40f };
// Discord rejects a message whose embeds exceed 6000 characters; the alert embed takes up to about 1500.
const MAX_DESCRIPTION_LENGTH = 3500;
const CODE_FENCE = /^\s*```\w*\n([\s\S]*?)\n```\s*$/;

// Analyses whether an ad is worth buying for resale on Allegro, one at a time, and posts the alert with the
// analysis only for KUPUJ and MOŻE.
export class AmazonDealCheckService {
  private claude;
  private discord;
  private businessLogService;
  private logger;
  private queue;

  constructor(
    claude = new ClaudeCliService(),
    discord = new DiscordChannelService(),
    businessLogService = new BusinessLogService(),
    logger = SystemLogService.getInstance(),
    queue = new ConcurrencyQueue(1)
  ) {
    this.claude = claude;
    this.discord = discord;
    this.businessLogService = businessLogService;
    this.logger = logger;
    this.queue = queue;
  }

  check(ad: AmazonAdSelectDto, prices: DealCheckPrice[], alert: APIEmbed, channelId: number) {
    this.queue.add(() => this.run(ad, prices, alert, channelId));
  }

  private async run(ad: AmazonAdSelectDto, prices: DealCheckPrice[], alert: APIEmbed, channelId: number) {
    const context = { asin: ad.asin };
    try {
      const output = await this.claude.run(this.getPrompt(ad, prices), AMAZON_DEAL_CHECK_PROMPT);
      const analysis = output.match(CODE_FENCE)?.[1] ?? output;
      const verdict = analysis.match(VERDICT)?.[1];
      if (!verdict) {
        this.logger.error("AmazonDealCheckService", `Deal check of ${ad.asin} returned no verdict`, {
          ...context,
          analysis,
        });
        return;
      }
      if (verdict === "NIE") {
        this.logger.info("AmazonDealCheckService", `Deal check of ${ad.asin}: NIE`, context);
        return;
      }

      await this.businessLogService.creatable.create({
        type: "deal_check_sent",
        marketplace: "amazon",
        data: { asin: ad.asin, name: ad.name, channel: String(channelId), verdict },
      });
      const description = analysis.slice(0, MAX_DESCRIPTION_LENGTH);
      await this.discord.send(channelId, { embeds: [alert, { description, color: COLORS[verdict] }] }, context);
    } catch (error) {
      this.logger.error("AmazonDealCheckService", `Deal check of ${ad.asin} failed`, { ...context, error });
    }
  }

  private getPrompt(ad: AmazonAdSelectDto, prices: DealCheckPrice[]) {
    const lines = prices.map(({ country, value, currency, url }) => `${country}: ${value} ${currency} (${url})`);
    return [
      `Tytuł: ${ad.name}`,
      `ASIN: ${ad.asin}`,
      `Kategoria: ${ad.category.name}`,
      "Ceny:",
      ...lines,
      "",
      "Oceń okazję według instrukcji.",
    ].join("\n");
  }
}
