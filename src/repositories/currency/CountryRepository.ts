import { PrismaClient } from "@@prisma/PrismaClient";
import { Prisma } from "@prisma/client";

export class CountryRepository {
  private delegate;

  constructor(prisma = PrismaClient.getInstance()) {
    this.delegate = prisma.country;
  }

  getAll() {
    return this.delegate.findMany();
  }

  create(data: Prisma.CountryCreateInput) {
    return this.delegate.create({ data });
  }

  update(id: number, data: Prisma.CountryUpdateInput) {
    return this.delegate.update({ where: { id }, data });
  }

  delete(id: number) {
    return this.delegate.delete({ where: { id } });
  }
}
