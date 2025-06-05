import { BlacklistedKeywordCreateDto } from "@/dtos/blacklist/BlacklistedKeywordDtos";
import { ToCreateInputMapperI } from "@/interfaces/crud/CRUDMapper";
import { Prisma } from "@prisma/client";

export class BlacklistedKeywordCreateMapper
  implements
    ToCreateInputMapperI<
      BlacklistedKeywordCreateDto,
      Prisma.BlacklistedKeywordCreateInput
    >
{
  toCreateInput(dto: BlacklistedKeywordCreateDto) {
    return {
      value: dto.value,
      createdAt: new Date(Date.now()),
    };
  }
}
