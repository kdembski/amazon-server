import { APIEmbed } from "discord.js";
import { AmazonAdSelectDto } from "@/modules/marketplaces/amazon/dtos/AmazonAdDtos";
import {
  getListingLink,
  getPriceRange,
  getProfitLine,
} from "@/modules/marketplaces/amazon/helpers/deal-check-format";
import {
  AMAZON_DEAL_CHECK_PROMPT,
  AMAZON_DEAL_CHECK_SCHEMA,
} from "@/modules/marketplaces/amazon/helpers/deal-check-prompt";
import {
  DealCheckAnswer,
  DealCheckPrice,
  DealCheckWaiter,
} from "@/modules/marketplaces/amazon/types/deal-check";
import { BusinessLogService } from "@/modules/monitoring/services/BusinessLogService";
import { DiscordChannelService } from "@/modules/settings/services/DiscordChannelService";
import { ClaudeCliService } from "@/shared/claude/ClaudeCliService";
import { SystemLogService } from "@/shared/logging/services/SystemLogService";
import { ConcurrencyQueue } from "@/shared/utils/ConcurrencyQueue";

const VERDICTS: Record<string, string> = { KUPUJ: "✅ **KUPUJ**", MOŻE: "❔ **MOŻE**", NIE: "❌ **NIE**" };
// Discord rejects a message whose embeds exceed 6000 characters.
const MAX_LINES_LENGTH = 700;

// One analysis at a time for all reporters; alerts of an ad already queued share its analysis.
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
    if (answer) await this.logDone(ad, answer);
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

  private async logDone(ad: AmazonAdSelectDto, answer: DealCheckAnswer) {
    try {
      await this.businessLogService.creatable.create({
        type: "deal_check_done",
        marketplace: "amazon",
        data: { asin: ad.asin, name: ad.name, verdict: answer.verdict },
      });
    } catch (error) {
      this.logger.error("AmazonDealCheckService", `Logging the deal check of ${ad.asin} failed`, {
        asin: ad.asin,
        error,
      });
    }
  }

  // Without an answer the rule still caught the listing, so the channel gets the alert alone.
  private async post(ad: AmazonAdSelectDto, alert: APIEmbed, channelId: number, answer?: DealCheckAnswer) {
    const context = { asin: ad.asin };
    try {
      const embeds = answer ? [alert, this.getAnalysisEmbed(answer)] : [alert];
      await this.discord.send(channelId, { embeds }, context);
    } catch (error) {
      this.logger.error("AmazonDealCheckService", `Posting the deal check of ${ad.asin} failed`, {
        ...context,
        channelId,
        error,
      });
    }
  }

  private getAnalysisEmbed(answer: DealCheckAnswer) {
    const { verdict, query, minPrice, maxPrice, estimated } = answer;
    const profit = getProfitLine(answer);
    const lines = [
      `${estimated ? "Szacunek" : "Wycena"}: **${getPriceRange(minPrice, maxPrice)}**`,
      `Allegro: ${getListingLink(query)}`,
      profit && `\n${profit}`,
    ];
    const details = lines.filter(Boolean).join("\n").slice(0, MAX_LINES_LENGTH);
    return { description: `${VERDICTS[verdict]}\n\n${details}` };
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
