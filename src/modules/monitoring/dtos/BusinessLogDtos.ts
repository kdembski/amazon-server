import { BusinessLogType, Marketplace, Prisma } from "@prisma/client";

export interface BusinessLogCreateDto {
  type: BusinessLogType;
  marketplace: Marketplace;
  data: Prisma.InputJsonObject;
}
