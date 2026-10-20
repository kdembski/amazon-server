import { AmazonAdPriceCreateDto } from "@/modules/marketplaces/amazon/dtos/AmazonAdPriceDtos";
import { ToCreateInputMapperI } from "@/shared/crud/interfaces/CRUDMapper";
import { Prisma } from "@prisma/client";

export class AmazonAdPriceCreateMapper
  implements
    ToCreateInputMapperI<
      AmazonAdPriceCreateDto,
      Prisma.AmazonAdPriceCreateInput
    >
{
  toCreateInput(dto: AmazonAdPriceCreateDto) {
    return {
      value: dto.value,
      dispatchFrom: dto.dispatchFrom,
      country: {
        connect: { countryId: dto.countryId },
      },
      ad: {
        connect: { id: dto.adId },
      },
      createdAt: new Date(Date.now()),
      updatedAt: new Date(Date.now()),
    };
  }
}
