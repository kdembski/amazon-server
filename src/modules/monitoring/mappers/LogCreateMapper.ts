import { LogCreateDto } from "@/modules/monitoring/dtos/LogDtos";
import { ToCreateInputMapperI } from "@/shared/crud/interfaces/CRUDMapper";
import { Prisma } from "@prisma/client";

export class LogCreateMapper
  implements ToCreateInputMapperI<LogCreateDto, Prisma.LogCreateInput>
{
  toCreateInput(dto: LogCreateDto) {
    return {
      event: dto.event,
      data: dto.data,
      createdAt: new Date(Date.now()),
    };
  }
}
