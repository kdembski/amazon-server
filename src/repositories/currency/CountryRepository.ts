import { PrismaClient } from "@@prisma/PrismaClient";
import { Prisma } from "@prisma/client";

export class CountryRepository {
  private delegate;

  constructor(prisma = PrismaClient.getInstance()) {
    this.delegate = prisma.country;
  }

  getById(id: number) {
    return this.delegate.findUnique({ where: { id } });
  }

  getByCode(code: string) {
    return this.delegate.findUnique({ where: { code } });
  }

  getAll() {
    return this.delegate.findMany();
  }

  getActive() {
    return this.delegate.findMany({ where: { active: true } });
  }

  create(data: Prisma.CountryCreateInput) {
    return this.delegate.create({ data });
  }

  update(id: number, data: Prisma.CountryUpdateInput) {
    return this.delegate.update({ where: { id }, data });
  }

  updateActive(id: number, active: boolean) {
    return this.delegate.update({ where: { id }, data: { active } });
  }

  delete(id: number) {
    return this.delegate.delete({ where: { id } });
  }
}
