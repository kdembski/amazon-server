import { PrismaClient } from "@@prisma/PrismaClient";
import { Prisma } from "@prisma/client";

export class CurrencyRepository {
  private delegate;

  constructor(prisma = PrismaClient.getInstance()) {
    this.delegate = prisma.currency;
  }

  getAll() {
    return this.delegate.findMany();
  }

  create(data: Prisma.CurrencyCreateInput) {
    return this.delegate.create({ data });
  }

  update(id: number, data: Prisma.CurrencyUpdateInput) {
    return this.delegate.update({ where: { id }, data });
  }

  delete(id: number) {
    return this.delegate.delete({ where: { id } });
  }
}
