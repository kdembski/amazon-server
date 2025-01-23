import { LogCreateDto } from "@/dtos/LogDtos";
import { ToCreateInputMapperI } from "@/interfaces/crud/CRUDMapper";
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
