import { Prisma } from "@prisma/client";

export class AmazonAdMissingCreateMapper {
  toCreateManyInput(adId: number, countryId: number): Prisma.AmazonAdMissingCreateManyInput {
    return { adId, countryId, createdAt: new Date(Date.now()) };
  }
}
