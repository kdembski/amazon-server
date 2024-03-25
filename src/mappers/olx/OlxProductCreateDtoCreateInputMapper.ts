import { OlxProductCreateDto } from "@/dtos/olx/OlxProductDtos";
import { ToCreateInputMapperI } from "@/interfaces/crud/CRUDMapper";
import { Prisma } from "@prisma/client";

export class OlxProductCreateDtoCreateInputMapper
  implements
    ToCreateInputMapperI<OlxProductCreateDto, Prisma.OlxProductCreateInput>
{
  toCreateInput(dto: OlxProductCreateDto) {
    return {
      brand: dto.brand,
      model: dto.model,
      createdAt: new Date(Date.now()),
      updatedAt: new Date(Date.now()),
    };
  }
}
