import { ActivityEventType, Marketplace, Prisma } from "@prisma/client";

export interface ActivityEventCreateDto {
  type: ActivityEventType;
  marketplace: Marketplace;
  data: Prisma.InputJsonObject;
}
