import { setImmediate } from "node:timers/promises";
import { Prisma } from "@prisma/client";
import { PrismaClient } from "@@prisma/PrismaClient";
import { AmazonExclusionRuleRepository } from "@/modules/marketplaces/amazon/repositories/AmazonExclusionRuleRepository";

const MATCH_YIELD_EVERY = 100;

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
  private exclusionRuleRepository;

  constructor(
    prisma = PrismaClient.getInstance(),
    matchBatchSize = 5_000,
    exclusionRuleRepository = new AmazonExclusionRuleRepository(prisma)
  ) {
    this.delegate = prisma.amazonAd;
    this.prisma = prisma;
    this.matchBatchSize = matchBatchSize;
    this.exclusionRuleRepository = exclusionRuleRepository;
  }

  getById(id: number) {
    return this.delegate.findUniqueOrThrow({
      where: { id },
      select: this.structure,
    });
  }

  getByIds(ids: number[]) {
    return this.delegate.findMany({
      where: { id: { in: ids } },
      select: this.structure,
    });
  }

  // MySQL sorts NULL first in ascending order; an explicit `nulls` option
  // would turn the ORDER BY into an expression the index cannot serve.
  getForScraping(batchSize: number) {
    return this.delegate.findMany({
      where: { excluded: false },
      take: batchSize,
      orderBy: { scrapedAt: "asc" },
      select: {
        id: true,
        asin: true,
        name: true,
      },
    });
  }

  // Ads with excluded = null have not been checked yet; only = "new" limits
  // the check to them. A full rematch walks the table in id ranges so each UPDATE
  // commits quickly and only briefly locks the rows /scrap stamps.
  async getExclusionRules() {
    const rules = await this.exclusionRuleRepository.getAll();
    return rules.map((rule) => ({
      value: rule.value,
      scope: rule.categoryId,
      inverted: rule.inverted,
    }));
  }

  async getActiveScopes() {
    const categories = await this.prisma.amazonAdCategory.findMany({
      where: { active: true },
      select: { id: true },
    });
    return categories.map((category) => category.id);
  }

  async matchExclusionRules(
    isExcluded: (name: string, scope: number | null) => boolean,
    only?: "new" | number[]
  ) {
    if (only === "new") {
      return this.updateMatches(isExcluded, { excluded: null });
    }

    const where = only ? { categoryId: { in: only } } : {};
    const { _max } = await this.delegate.aggregate({ where, _max: { id: true } });
    const total = { excluded: 0, included: 0, scanned: 0 };

    for (let lastId = 0; lastId < (_max.id ?? 0); lastId += this.matchBatchSize) {
      const result = await this.updateMatches(isExcluded, {
        ...where,
        id: { gt: lastId, lte: lastId + this.matchBatchSize },
      });
      total.excluded += result.excluded;
      total.included += result.included;
      total.scanned += result.scanned;
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

  async createMany(data: Prisma.AmazonAdCreateManyInput[]) {
    const { count } = await this.delegate.createMany({ data, skipDuplicates: true });
    return count;
  }

  update(id: number, data: Prisma.AmazonAdUpdateInput) {
    return this.delegate.update({ where: { id }, data });
  }

  delete(id: number) {
    return this.delegate.delete({ where: { id } });
  }

  async deleteMany(ids: number[]) {
    const { count } = await this.delegate.deleteMany({ where: { id: { in: ids } } });
    return count;
  }

  // Includes ads before excluding the rest, so the scraping queue never runs
  // empty in between.
  private async updateMatches(
    isExcluded: (name: string, scope: number | null) => boolean,
    where: Prisma.AmazonAdWhereInput
  ) {
    const ads = await this.delegate.findMany({
      where,
      select: { id: true, name: true, categoryId: true, excluded: true },
    });
    const excluded: number[] = [];
    const included: number[] = [];

    for (const [index, ad] of ads.entries()) {
      // Matching is synchronous; yield so requests are not blocked for a whole batch
      if (index % MATCH_YIELD_EVERY === 0) await setImmediate();
      const excludes = isExcluded(ad.name, ad.categoryId);
      if (excludes && ad.excluded !== true) excluded.push(ad.id);
      if (!excludes && ad.excluded !== false) included.push(ad.id);
    }

    const includedCount = await this.setExcluded(included, false);
    return {
      excluded: await this.setExcluded(excluded, true),
      included: includedCount,
      scanned: ads.length,
    };
  }

  private async setExcluded(ids: number[], excluded: boolean) {
    if (!ids.length) return 0;

    const { count } = await this.delegate.updateMany({
      where: { id: { in: ids } },
      data: { excluded },
    });
    return count;
  }
}
