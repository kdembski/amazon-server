import { CurrencyExchangeRateUpdateDto } from "@/dtos/currency/CurrencyExchangeRateDtos";
import { ToUpdateInputMapperI } from "@/interfaces/crud/CRUDMapper";
import { Prisma } from "@prisma/client";

export class CurrencyExchangeRateUpdateMapper
  implements
    ToUpdateInputMapperI<
      CurrencyExchangeRateUpdateDto,
      Prisma.CurrencyExchangeRateUpdateInput
    >
{
  toUpdateInput(dto: CurrencyExchangeRateUpdateDto) {
    return {
      value: dto.value,
      source: { connect: { id: dto.sourceId } },
      target: { connect: { id: dto.targetId } },
      updatedAt: new Date(Date.now()),
    };
  }
}
