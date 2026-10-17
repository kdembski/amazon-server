import { Prisma } from "@prisma/client";
import { PrismaClient } from "@@prisma/PrismaClient";
import { SearchRuleSelectDto } from "@/dtos/search-rule/SearchRuleDtos";
import {
  createSearchRuleMatcher,
  parseSearchRule,
} from "@/helpers/searchRule";

export class AmazonAdRepository {
  private delegate;
  private prisma;
  private structure = {
    id: true,
    asin: true,
    image: true,
    name: true,
    categoryId: true,
    createdAt: true,
    updatedAt: true,
    scrapedAt: true,
    category: {
      select: {
        id: true,
        name: true,
        active: true,
      },
    },
  };

  private matchBatchSize;

  constructor(prisma = PrismaClient.getInstance(), matchBatchSize = 20_000) {
    this.delegate = prisma.amazonAd;
    this.prisma = prisma;
    this.matchBatchSize = matchBatchSize;
  }

  getById(id: number) {
    return this.delegate.findUniqueOrThrow({
      where: { id },
      select: this.structure,
    });
  }

  // MySQL sorts NULL first in ascending order; an explicit `nulls` option
  // would turn the ORDER BY into an expression the index cannot serve.
  getForScraping(count: number) {
    return this.delegate.findMany({
      where: { matchesRules: true },
      take: count,
      orderBy: { scrapedAt: "asc" },
      select: {
        id: true,
        asin: true,
        name: true,
      },
    });
  }

  // Ads with matchesRules = null have not been checked yet; onlyNew limits the
  // check to them. A full rematch walks the table in id ranges so each UPDATE
  // commits quickly and only briefly locks the rows /scrap stamps.
  async matchSearchRules(searchRules: SearchRuleSelectDto[], onlyNew = false) {
    const matches = createSearchRuleMatcher(this.parseSearchRules(searchRules));

    if (onlyNew) {
      return this.updateMatches(matches, { matchesRules: null });
    }

    const { _max } = await this.delegate.aggregate({ _max: { id: true } });
    const total = { matched: 0, unmatched: 0 };

    for (let lastId = 0; lastId < (_max.id ?? 0); lastId += this.matchBatchSize) {
      const result = await this.updateMatches(matches, {
        id: { gt: lastId, lte: lastId + this.matchBatchSize },
      });
      total.matched += result.matched;
      total.unmatched += result.unmatched;
    }

    return total;
  }

  updateScrapedAt(ids: number[]): Promise<number> {
    if (!ids.length) return Promise.resolve(0);

    return this.prisma
      .$executeRaw`UPDATE AmazonAd SET scrapedAt = NOW() WHERE id IN (${Prisma.join(
      ids
    )})`;
  }

  getAll() {
    return this.delegate.findMany();
  }

  getCount(from?: Date, to?: Date) {
    return this.delegate.count({
      where: {
        createdAt: {
          lte: to,
          gte: from,
        },
      },
    });
  }

  create(data: Prisma.AmazonAdCreateInput) {
    return this.delegate.create({ data });
  }

  update(id: number, data: Prisma.AmazonAdUpdateInput) {
    return this.delegate.update({ where: { id }, data });
  }

  delete(id: number) {
    return this.delegate.delete({ where: { id } });
  }

  // Flags matching ads before clearing the rest, so the scraping queue never
  // runs empty in between.
  private async updateMatches(
    matches: (name: string) => boolean,
    where: Prisma.AmazonAdWhereInput
  ) {
    const ads = await this.delegate.findMany({
      where,
      select: { id: true, name: true, matchesRules: true },
    });
    const flagged: number[] = [];
    const cleared: number[] = [];

    for (const ad of ads) {
      const matched = matches(ad.name);
      if (matched && ad.matchesRules !== true) flagged.push(ad.id);
      if (!matched && ad.matchesRules !== false) cleared.push(ad.id);
    }

    return {
      matched: await this.setMatchesRules(flagged, true),
      unmatched: await this.setMatchesRules(cleared, false),
    };
  }

  private async setMatchesRules(ids: number[], matchesRules: boolean) {
    if (!ids.length) return 0;

    const { count } = await this.delegate.updateMany({
      where: { id: { in: ids } },
      data: { matchesRules },
    });
    return count;
  }

  private parseSearchRules(searchRules: SearchRuleSelectDto[]) {
    return searchRules.flatMap((searchRule) => {
      try {
        return [parseSearchRule(searchRule.value)];
      } catch (e) {
        console.error(
          `AmazonAdRepository: skipped search rule ${searchRule.value}: ${e}`
        );
        return [];
      }
    });
  }
}
