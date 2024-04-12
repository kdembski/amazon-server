import { OlxAdCategoryCreateDto } from "@/dtos/olx/OlxAdCategoryDtos";
import { ToCreateInputMapperI } from "@/interfaces/crud/CRUDMapper";
import { Prisma } from "@prisma/client";

export class OlxAdCategoryCreateMapper
  implements
    ToCreateInputMapperI<
      OlxAdCategoryCreateDto,
      Prisma.OlxAdCategoryCreateInput
    >
{
  toCreateInput(dto: OlxAdCategoryCreateDto) {
    return {
      name: dto.name,
      createdAt: new Date(Date.now()),
      updatedAt: new Date(Date.now()),
    };
  }
}
