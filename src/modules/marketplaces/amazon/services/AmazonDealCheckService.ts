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
  allegro: string[];
  profit: string;
}

// Discord colours no text in embeds, so the verdict gets a coloured emoji.
const VERDICTS: Record<string, string> = { KUPUJ: "✅ **KUPUJ**", MOŻE: "❔ **MOŻE**", NIE: "❌ **NIE**" };
// Discord rejects a message whose embeds exceed 6000 characters.
const MAX_PART_LENGTH = 700;

interface DealCheckWaiter {
  alert: APIEmbed;
  channelId: number;
}

// Analyses whether an ad is worth buying for resale on Allegro, one at a time for all anomaly reporters, and posts
// the alert with the analysis, or the alert alone when the analysis fails. Alerts of an ad queued or being analysed
// wait for that analysis instead of starting another.
export class AmazonDealCheckService {
  private static instance: AmazonDealCheckService;
  private waiters = new Map<string, DealCheckWaiter[]>();
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

  public static getInstance(): AmazonDealCheckService {
    if (!AmazonDealCheckService.instance) {
      AmazonDealCheckService.instance = new AmazonDealCheckService();
    }

    return AmazonDealCheckService.instance;
  }

  check(ad: AmazonAdSelectDto, prices: DealCheckPrice[], alert: APIEmbed, channelId: number) {
    const waiters = this.waiters.get(ad.asin);
    if (waiters) {
      waiters.push({ alert, channelId });
      return;
    }

    this.waiters.set(ad.asin, [{ alert, channelId }]);
    this.queue.add(() => this.run(ad, prices));
  }

  private async run(ad: AmazonAdSelectDto, prices: DealCheckPrice[]) {
    const answer = await this.getAnswer(ad, prices);
    const waiters = this.waiters.get(ad.asin)!;
    this.waiters.delete(ad.asin);
    for (const { alert, channelId } of waiters) {
      await this.post(ad, alert, channelId, answer);
    }
  }

  private async getAnswer(ad: AmazonAdSelectDto, prices: DealCheckPrice[]) {
    const context = { asin: ad.asin };
    try {
      const answer = await this.claude.run(
        this.getPrompt(ad, prices),
        AMAZON_DEAL_CHECK_PROMPT,
        AMAZON_DEAL_CHECK_SCHEMA
      );
      const verdict = (answer as DealCheckAnswer | undefined)?.verdict;
      if (verdict && VERDICTS[verdict]) return answer as DealCheckAnswer;

      this.logger.error("AmazonDealCheckService", `Deal check of ${ad.asin} returned no verdict`, {
        ...context,
        answer,
      });
    } catch (error) {
      this.logger.error("AmazonDealCheckService", `Deal check of ${ad.asin} failed`, { ...context, error });
    }
  }

  // Without an answer the rule still caught the listing, so the channel gets the alert alone.
  private async post(ad: AmazonAdSelectDto, alert: APIEmbed, channelId: number, answer?: DealCheckAnswer) {
    const context = { asin: ad.asin };
    try {
      if (!answer) {
        await this.discord.send(channelId, { embeds: [alert] }, context);
        return;
      }

      await this.businessLogService.creatable.create({
        type: "deal_check_sent",
        marketplace: "amazon",
        data: { asin: ad.asin, name: ad.name, channel: String(channelId), verdict: answer.verdict },
      });
      await this.discord.send(channelId, { embeds: [alert, this.getAnalysisEmbed(answer)] }, context);
    } catch (error) {
      this.logger.error("AmazonDealCheckService", `Posting the deal check of ${ad.asin} failed`, {
        ...context,
        channelId,
        error,
      });
    }
  }

  private getAnalysisEmbed({ verdict, allegro, profit }: DealCheckAnswer) {
    const parts = [allegro.join("\n"), profit].map((part) => part.slice(0, MAX_PART_LENGTH) || "brak danych");
    return { description: [VERDICTS[verdict], ...parts].join("\n\n") };
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
