import { SystemLogCreateDto } from "@/shared/logging/dtos/SystemLogDtos";
import { ToCreateInputMapperI } from "@/shared/crud/interfaces/CRUDMapper";
import { LogContextSanitizer } from "@/shared/logging/services/LogContextSanitizer";
import { Prisma } from "@prisma/client";

export class SystemLogCreateMapper
  implements ToCreateInputMapperI<SystemLogCreateDto, Prisma.SystemLogCreateInput>
{
  private sanitizer;

  constructor(sanitizer = new LogContextSanitizer()) {
    this.sanitizer = sanitizer;
  }

  toCreateInput(dto: SystemLogCreateDto) {
    return {
      level: dto.level,
      source: dto.source.slice(0, 63),
      message: this.sanitizer.limitText(dto.message),
      context: dto.context && this.sanitizer.limitContext(dto.context),
      createdAt: new Date(),
    };
  }
}
