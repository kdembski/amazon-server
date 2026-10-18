import { PrismaClient } from "@@prisma/PrismaClient";

export class SearchRuleRepository {
  private delegate;

  constructor(prisma = PrismaClient.getInstance()) {
    this.delegate = prisma.searchRule;
  }

  getById(id: number) {
    return this.delegate.findUnique({ where: { id } });
  }

  getAll() {
    return this.delegate.findMany();
  }
}
