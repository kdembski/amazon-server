import { CurrencyCreateDto } from "@/dtos/currency/CurrencyDtos";
import { ToCreateInputMapperI } from "@/interfaces/crud/CRUDMapper";
import { Prisma } from "@prisma/client";

export class CurrencyCreateMapper
  implements
    ToCreateInputMapperI<CurrencyCreateDto, Prisma.CurrencyCreateInput>
{
  toCreateInput(dto: CurrencyCreateDto) {
    return {
      name: dto.name,
      code: dto.code,
      symbol: dto.symbol,
      createdAt: new Date(Date.now()),
      updatedAt: new Date(Date.now()),
    };
  }
}
