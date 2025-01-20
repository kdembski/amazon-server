import { CurrencyUpdateDto } from "@/dtos/currency/CurrencyDtos";
import { ToUpdateInputMapperI } from "@/interfaces/crud/CRUDMapper";
import { Prisma } from "@prisma/client";

export class CurrencyUpdateMapper
  implements
    ToUpdateInputMapperI<CurrencyUpdateDto, Prisma.CurrencyUpdateInput>
{
  toUpdateInput(dto: CurrencyUpdateDto) {
    return {
      name: dto.name,
      code: dto.code,
      updatedAt: new Date(Date.now()),
    };
  }
}
