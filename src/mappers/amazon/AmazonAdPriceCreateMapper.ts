import { AmazonAdPriceCreateDto } from "@/dtos/amazon/AmazonAdPriceDtos";
import { ToCreateInputMapperI } from "@/interfaces/crud/CRUDMapper";
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
      country: {
        connect: { id: dto.countryId },
      },
      ad: {
        connect: { id: dto.adId },
      },
      createdAt: new Date(Date.now()),
      updatedAt: new Date(Date.now()),
    };
  }
}
