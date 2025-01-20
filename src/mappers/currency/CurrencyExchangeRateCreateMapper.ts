import { CurrencyExchangeRateCreateDto } from "@/dtos/currency/CurrencyExchangeRateDtos";
import { ToCreateInputMapperI } from "@/interfaces/crud/CRUDMapper";
import { Prisma } from "@prisma/client";

export class CurrencyExchangeRateCreateMapper
  implements
    ToCreateInputMapperI<
      CurrencyExchangeRateCreateDto,
      Prisma.CurrencyExchangeRateCreateInput
    >
{
  toCreateInput(dto: CurrencyExchangeRateCreateDto) {
    return {
      rate: dto.rate,
      source: { connect: { id: dto.sourceId } },
      target: { connect: { id: dto.targetId } },
      createdAt: new Date(Date.now()),
      updatedAt: new Date(Date.now()),
    };
  }
}
