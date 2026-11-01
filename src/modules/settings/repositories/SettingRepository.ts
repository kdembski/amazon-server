import { PrismaClient } from "@@prisma/PrismaClient";
import { Prisma } from "@prisma/client";

export class SettingRepository {
  private delegate;

  constructor(prisma = PrismaClient.getInstance()) {
    this.delegate = prisma.setting;
  }

  getAll() {
    return this.delegate.findMany({ select: { key: true, value: true } });
  }

  upsert(
    key: string,
    create: Prisma.SettingCreateInput,
    update: Prisma.SettingUpdateInput
  ) {
    return this.delegate.upsert({ where: { key }, create, update });
  }

  delete(key: string) {
    return this.delegate.deleteMany({ where: { key } });
  }
}
