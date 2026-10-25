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
      // AmazonAdPrice.dispatchFrom is VARCHAR(63)
      dispatchFrom: dto.dispatchFrom?.slice(0, 63),
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

  toCreateManyInput(dto: AmazonAdPriceCreateDto): Prisma.AmazonAdPriceCreateManyInput {
    return {
      value: dto.value,
      dispatchFrom: dto.dispatchFrom?.slice(0, 63),
      countryId: dto.countryId,
      adId: dto.adId,
      createdAt: new Date(Date.now()),
      updatedAt: new Date(Date.now()),
    };
  }
}
