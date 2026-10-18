import { ActivityEventCreateDto } from "@/modules/monitoring/dtos/ActivityEventDtos";
import { ToCreateInputMapperI } from "@/shared/crud/interfaces/CRUDMapper";
import { Prisma } from "@prisma/client";

export class ActivityEventCreateMapper
  implements
    ToCreateInputMapperI<ActivityEventCreateDto, Prisma.ActivityEventCreateInput>
{
  toCreateInput(dto: ActivityEventCreateDto) {
    return {
      type: dto.type,
      marketplace: dto.marketplace,
      data: dto.data,
      createdAt: new Date(Date.now()),
    };
  }
}
