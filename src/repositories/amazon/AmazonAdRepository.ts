import { Prisma } from "@prisma/client";
import { PrismaClient } from "@@prisma/PrismaClient";

export class AmazonAdRepository {
  private delegate;

  constructor(prisma = PrismaClient.getInstance()) {
    this.delegate = prisma.amazonAd;
  }

  getById(id: number) {
    return this.delegate.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        asin: true,
        price: true,
        categoryId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  getAll() {
    return this.delegate.findMany();
  }

  create(data: Prisma.AmazonAdCreateInput) {
    return this.delegate.create({ data });
  }

  delete(id: number) {
    return this.delegate.delete({ where: { id } });
  }
}
