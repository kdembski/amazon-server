import { SystemLogCreateDto } from "@/shared/logging/dtos/SystemLogDtos";
import { ToCreateInputMapperI } from "@/shared/crud/interfaces/CRUDMapper";
import {
  limitContext,
  limitText,
} from "@/shared/logging/helpers/limitContext";
import { Prisma } from "@prisma/client";

export class SystemLogCreateMapper
  implements ToCreateInputMapperI<SystemLogCreateDto, Prisma.SystemLogCreateInput>
{
  toCreateInput(dto: SystemLogCreateDto) {
    return {
      level: dto.level,
      source: dto.source.slice(0, 63),
      message: limitText(dto.message),
      context: dto.context && limitContext(dto.context),
      createdAt: new Date(Date.now()),
    };
  }
}
