import { CurrencyExchangeRateCreateDto } from "@/modules/currency/dtos/CurrencyExchangeRateDtos";
import { ToCreateInputMapperI } from "@/shared/crud/interfaces/CRUDMapper";
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
      value: dto.value,
      source: { connect: { id: dto.sourceId } },
      target: { connect: { id: dto.targetId } },
      createdAt: new Date(Date.now()),
      updatedAt: new Date(Date.now()),
    };
  }
}
