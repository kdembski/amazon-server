import { AmazonAdPriceUpdateDto } from "@/dtos/amazon/AmazonAdPriceDtos";
import { ToUpdateInputMapperI } from "@/interfaces/crud/CRUDMapper";
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
