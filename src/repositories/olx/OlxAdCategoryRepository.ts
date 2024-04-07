import { PrismaClient } from "@@prisma/PrismaClient";

export class OlxAdCategoryRepository {
  private delegate;

  constructor(prisma = PrismaClient.getInstance()) {
    this.delegate = prisma.olxAdCategory;
  }

  async getAll() {
    return this.delegate.findMany();
  }
}
