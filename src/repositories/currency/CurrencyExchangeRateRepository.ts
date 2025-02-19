import { PrismaClient } from "@@prisma/PrismaClient";
import { Prisma } from "@prisma/client";

export class CurrencyExchangeRateRepository {
  private delegate;

  constructor(prisma = PrismaClient.getInstance()) {
    this.delegate = prisma.currencyExchangeRate;
  }

  getById(id: number) {
    return this.delegate.findUnique({ where: { id } });
  }

  getBySourceAndTarget(data: { sourceId: number; targetId: number }) {
    return this.delegate.findUnique({ where: { sourceId_targetId: data } });
  }

  getByTarget(targetId: number) {
    return this.delegate.findMany({ where: { targetId } });
  }

  getByTargetCode(targetCode: string) {
    return this.delegate.findMany({ where: { target: { code: targetCode } } });
  }

  create(data: Prisma.CurrencyExchangeRateCreateInput) {
    return this.delegate.create({ data });
  }

  update(id: number, data: Prisma.CurrencyExchangeRateUpdateInput) {
    return this.delegate.update({ where: { id }, data });
  }

  updateBySourceAndTarget(
    ids: { sourceId: number; targetId: number },
    data: Prisma.CurrencyExchangeRateUpdateInput
  ) {
    return this.delegate.update({ where: { sourceId_targetId: ids }, data });
  }

  delete(id: number) {
    return this.delegate.delete({ where: { id } });
  }
}
