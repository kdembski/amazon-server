import { BusinessLogCreateDto } from "@/modules/monitoring/dtos/BusinessLogDtos";
import { ToCreateInputMapperI } from "@/shared/crud/interfaces/CRUDMapper";
import { Prisma } from "@prisma/client";

export class BusinessLogCreateMapper
  implements
    ToCreateInputMapperI<BusinessLogCreateDto, Prisma.BusinessLogCreateInput>
{
  toCreateInput(dto: BusinessLogCreateDto) {
    return {
      type: dto.type,
      marketplace: dto.marketplace,
      data: dto.data,
      createdAt: new Date(Date.now()),
    };
  }
}
