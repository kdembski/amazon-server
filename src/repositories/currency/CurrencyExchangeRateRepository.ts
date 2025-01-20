import { PrismaClient } from "@@prisma/PrismaClient";
import { Prisma } from "@prisma/client";

export class CurrencyExchangeRateRepository {
  private delegate;

  constructor(prisma = PrismaClient.getInstance()) {
    this.delegate = prisma.currencyExchangeRate;
  }

  create(data: Prisma.CurrencyExchangeRateCreateInput) {
    return this.delegate.create({ data });
  }

  update(id: number, data: Prisma.CurrencyExchangeRateUpdateInput) {
    return this.delegate.update({ where: { id }, data });
  }

  delete(id: number) {
    return this.delegate.delete({ where: { id } });
  }
}
