import { Prisma } from "@prisma/client";

export class AmazonAdMissingCreateMapper {
  toCreateManyInput(adId: number, routeId: number): Prisma.AmazonAdMissingCreateManyInput {
    return { adId, routeId, createdAt: new Date(Date.now()) };
  }
}
