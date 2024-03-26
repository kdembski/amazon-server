import { OlxProductUpdateDto } from "@/dtos/olx/OlxProductDtos";
import { ToUpdateInputMapperI } from "@/interfaces/crud/CRUDMapper";
import { Prisma } from "@prisma/client";

export class OlxProductUpdateMapper
  implements
    ToUpdateInputMapperI<OlxProductUpdateDto, Prisma.OlxProductUpdateInput>
{
  toUpdateInput(dto: OlxProductUpdateDto) {
    return {
      brand: dto.brand,
      model: dto.model,
      updatedAt: new Date(Date.now()),
    };
  }
}
