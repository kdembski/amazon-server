import { PrismaClient } from "@@prisma/PrismaClient";
import { Prisma } from "@prisma/client";

export class AmazonAdCategoryRepository {
  private delegate;

  constructor(prisma = PrismaClient.getInstance()) {
    this.delegate = prisma.amazonAdCategory;
  }

  getById(id: number) {
    return this.delegate.findUniqueOrThrow({ where: { id } });
  }

  getAll() {
    return this.delegate.findMany();
  }

  getForScraping() {
    return this.delegate.findFirstOrThrow({
      where: { active: true },
      orderBy: {
        scrapedAt: { sort: "asc", nulls: "first" },
      },
    });
  }

  create(data: Prisma.AmazonAdCategoryCreateInput) {
    return this.delegate.create({ data });
  }

  upsertByName(name: string) {
    const now = new Date(Date.now());
    return this.delegate.upsert({
      where: { name },
      create: { name, createdAt: now, updatedAt: now },
      update: {},
      select: { id: true },
    });
  }

  update(id: number, data: Prisma.AmazonAdCategoryUpdateInput) {
    return this.delegate.update({ where: { id }, data });
  }

  delete(id: number) {
    return this.delegate.delete({ where: { id } });
  }
}
