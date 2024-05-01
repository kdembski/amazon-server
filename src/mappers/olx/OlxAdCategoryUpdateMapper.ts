import { OlxAdCategoryUpdateDto } from "@/dtos/olx/OlxAdCategoryDtos";
import { ToUpdateInputMapperI } from "@/interfaces/crud/CRUDMapper";
import { Prisma } from "@prisma/client";

export class OlxAdCategoryUpdateMapper
  implements
    ToUpdateInputMapperI<
      OlxAdCategoryUpdateDto,
      Prisma.OlxAdCategoryUpdateInput
    >
{
  toUpdateInput(dto: OlxAdCategoryUpdateDto) {
    return {
      name: dto.name,
      updatedAt: new Date(Date.now()),
    };
  }
}
