import { AmazonAdPriceUpdateDto } from "@/modules/marketplaces/amazon/dtos/AmazonAdPriceDtos";
import { ToUpdateInputMapperI } from "@/shared/crud/interfaces/CRUDMapper";
import { Prisma } from "@prisma/client";

export class AmazonAdPriceUpdateMapper
  implements
    ToUpdateInputMapperI<
      AmazonAdPriceUpdateDto,
      Prisma.AmazonAdPriceUpdateInput
    >
{
  toUpdateInput(dto: AmazonAdPriceUpdateDto) {
    return {
      value: dto.value,
      updatedAt: new Date(Date.now()),
    };
  }
}
