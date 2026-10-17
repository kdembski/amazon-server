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

  constructor(prisma = PrismaClient.getInstance()) {
    this.delegate = prisma.amazonAd;
    this.prisma = prisma;
  }

  getById(id: number) {
    return this.delegate.findUniqueOrThrow({
      where: { id },
      select: this.structure,
    });
  }

  async getForScraping(count: number, searchRules: SearchRuleSelectDto[]) {
    const where = this.getSearchRuleWhereQuery(searchRules);
    if (!where) return [];

    return this.delegate.findMany({
      where,
      take: count,
      orderBy: {
        scrapedAt: { sort: "asc", nulls: "first" },
      },
      select: {
        id: true,
        asin: true,
        name: true,
      },
    });
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

  private getSearchRuleWhereQuery(searchRules: SearchRuleSelectDto[]) {
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
