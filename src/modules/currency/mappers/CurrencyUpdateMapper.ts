import { CurrencyUpdateDto } from "@/modules/currency/dtos/CurrencyDtos";
import { ToUpdateInputMapperI } from "@/shared/crud/interfaces/CRUDMapper";
import { Prisma } from "@prisma/client";

export class CurrencyUpdateMapper
  implements
    ToUpdateInputMapperI<CurrencyUpdateDto, Prisma.CurrencyUpdateInput>
{
  toUpdateInput(dto: CurrencyUpdateDto) {
    return {
      name: dto.name,
      code: dto.code,
      symbol: dto.symbol,
      updatedAt: new Date(Date.now()),
    };
  }
}
