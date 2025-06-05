import { PrismaClient } from "@@prisma/PrismaClient";
import { Prisma } from "@prisma/client";

export class BlacklistedKeywordRepository {
  private delegate;

  constructor(prisma = PrismaClient.getInstance()) {
    this.delegate = prisma.blacklistedKeyword;
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

  create(data: Prisma.BlacklistedKeywordCreateInput) {
    return this.delegate.create({ data });
  }

  delete(id: number) {
    return this.delegate.delete({ where: { id } });
  }
}
