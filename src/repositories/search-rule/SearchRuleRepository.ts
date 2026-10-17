import { PrismaClient } from "@@prisma/PrismaClient";
import { Prisma } from "@prisma/client";

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

  getByValue(value: string) {
    return this.delegate.findUnique({ where: { value } });
  }

  create(data: Prisma.SearchRuleCreateInput) {
    return this.delegate.create({ data });
  }

  delete(id: number) {
    return this.delegate.delete({ where: { id } });
  }
}
