import { APIEmbed } from "discord.js";
import { AmazonAdSelectDto } from "@/modules/marketplaces/amazon/dtos/AmazonAdDtos";
import {
  AMAZON_DEAL_CHECK_PROMPT,
  AMAZON_DEAL_CHECK_SCHEMA,
} from "@/modules/marketplaces/amazon/services/AmazonDealCheckPrompt";
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

interface DealCheckAnswer {
  verdict: string;
  product: string;
  amazon: string;
  allegro: string;
  profit: string;
  risks: string[];
}

// Discord colours no text in embeds, so the verdict gets a coloured emoji.
const VERDICTS: Record<string, string> = { KUPUJ: "✅ **KUPUJ**", MOŻE: "⚠️ **MOŻE**", NIE: "❌ **NIE**" };
// Discord rejects a message whose embeds exceed 6000 characters and a field value over 1024 or empty.
const MAX_FIELD_LENGTH = 700;

// Analyses whether an ad is worth buying for resale on Allegro, one at a time, and posts the alert with the
// analysis, or the alert alone when the analysis fails.
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
      const answer = await this.claude.run(
        this.getPrompt(ad, prices),
        AMAZON_DEAL_CHECK_PROMPT,
        AMAZON_DEAL_CHECK_SCHEMA
      );
      const verdict = (answer as DealCheckAnswer | undefined)?.verdict;
      if (!verdict || !VERDICTS[verdict]) {
        this.logger.error("AmazonDealCheckService", `Deal check of ${ad.asin} returned no verdict`, {
          ...context,
          answer,
        });
        await this.discord.send(channelId, { embeds: [alert] }, context);
        return;
      }

      await this.businessLogService.creatable.create({
        type: "deal_check_sent",
        marketplace: "amazon",
        data: { asin: ad.asin, name: ad.name, channel: String(channelId), verdict },
      });
      const analysis = this.getAnalysisEmbed(answer as DealCheckAnswer);
      await this.discord.send(channelId, { embeds: [alert, analysis] }, context);
    } catch (error) {
      this.logger.error("AmazonDealCheckService", `Deal check of ${ad.asin} failed`, { ...context, error });
      // The rule caught the listing, so the channel still gets the alert without the analysis.
      await this.discord.send(channelId, { embeds: [alert] }, context);
    }
  }

  private getAnalysisEmbed({ verdict, product, amazon, allegro, profit, risks }: DealCheckAnswer) {
    const fields: [string, string][] = [
      ["Produkt", product],
      ["Amazon", amazon],
      ["Allegro", allegro],
      ["Zysk", profit],
      ["Ryzyka", risks.map((risk) => `– ${risk}`).join("\n")],
    ];
    return {
      description: VERDICTS[verdict],
      fields: fields.map(([name, value]) => ({ name, value: value.slice(0, MAX_FIELD_LENGTH) || "brak danych" })),
    };
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
