import { Prisma } from "@prisma/client";

export class SettingUpsertMapper {
  toCreateInput(key: string, value: unknown): Prisma.SettingCreateInput {
    return {
      key,
      value: value as Prisma.InputJsonValue,
      createdAt: new Date(Date.now()),
      updatedAt: new Date(Date.now()),
    };
  }

  toUpdateInput(value: unknown): Prisma.SettingUpdateInput {
    return {
      value: value as Prisma.InputJsonValue,
      updatedAt: new Date(Date.now()),
    };
  }
}
