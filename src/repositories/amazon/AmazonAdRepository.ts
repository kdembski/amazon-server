import { Prisma } from "@prisma/client";
import { PrismaClient } from "@@prisma/PrismaClient";
import { SearchRuleSelectDto } from "@/dtos/search-rule/SearchRuleDtos";
import {
  escapeLikePattern,
  isGlobalExclusion,
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
  // update to them. A full rematch walks the table in id ranges so each UPDATE
  // commits quickly and only briefly locks the rows /scrap stamps.
  async matchSearchRules(searchRules: SearchRuleSelectDto[], onlyNew = false) {
    const where = this.getSearchRuleWhereQuery(searchRules);

    if (onlyNew) {
      return this.updateMatches(
        where,
        { matchesRules: null },
        { matchesRules: null }
      );
    }

    const { _max } = await this.delegate.aggregate({ _max: { id: true } });
    const total = { matched: 0, unmatched: 0 };

    for (let lastId = 0; lastId < (_max.id ?? 0); lastId += this.matchBatchSize) {
      const range = { id: { gt: lastId, lte: lastId + this.matchBatchSize } };
      const result = await this.updateMatches(
        where,
        { AND: [range, { OR: [{ matchesRules: false }, { matchesRules: null }] }] },
        { AND: [range, { OR: [{ matchesRules: true }, { matchesRules: null }] }] }
      );
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
    where: Prisma.AmazonAdWhereInput | null,
    unflagged: Prisma.AmazonAdWhereInput,
    flagged: Prisma.AmazonAdWhereInput
  ) {
    const matched = where
      ? await this.delegate.updateMany({
          where: { AND: [unflagged, where] },
          data: { matchesRules: true },
        })
      : { count: 0 };

    const unmatched = await this.delegate.updateMany({
      where: { AND: [flagged, ...(where ? [{ NOT: where }] : [])] },
      data: { matchesRules: false },
    });

    return { matched: matched.count, unmatched: unmatched.count };
  }

  private getSearchRuleWhereQuery(
    searchRules: SearchRuleSelectDto[]
  ): Prisma.AmazonAdWhereInput | null {
    const parsed = searchRules.flatMap((searchRule) => {
      try {
        return [parseSearchRule(searchRule.value)];
      } catch (e) {
        console.error(
          `AmazonAdRepository: skipped search rule ${searchRule.value}: ${e}`
        );
        return [];
      }
    });

    const contains = (phrase: string) => ({
      name: { contains: escapeLikePattern(phrase) },
    });

    const rules = parsed
      .filter((rule) => !isGlobalExclusion(rule))
      .map((rule) => ({
        AND: [
          ...rule.include.map((group) => ({ OR: group.map(contains) })),
          ...rule.exclude.map((phrase) => ({ NOT: contains(phrase) })),
        ],
      }));

    const globalExclusions = parsed
      .filter(isGlobalExclusion)
      .flatMap((rule) => rule.exclude);

    // Prisma drops an empty nested OR instead of treating it as false.
    if (!rules.length) return null;
    if (!globalExclusions.length) return { OR: rules };

    return {
      AND: [{ OR: rules }, { NOT: { OR: globalExclusions.map(contains) } }],
    };
  }
}
