import { PrismaClient } from "@@prisma/PrismaClient";
import { Prisma } from "@prisma/client";

export class CurrencyExchangeRateRepository {
  private delegate;

  constructor(prisma = PrismaClient.getInstance()) {
    this.delegate = prisma.currencyExchangeRate;
  }

  getBySourceAndTarget(data: { sourceId: number; targetId: number }) {
    return this.delegate.findUnique({ where: { sourceId_targetId: data } });
  }

  getByTarget(targetId: number) {
    return this.delegate.findMany({ where: { targetId } });
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
