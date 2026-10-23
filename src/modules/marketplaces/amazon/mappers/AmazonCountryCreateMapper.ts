import { AmazonCountryCreateDto } from "@/modules/marketplaces/amazon/dtos/AmazonCountryDtos";
import { ToCreateInputMapperI } from "@/shared/crud/interfaces/CRUDMapper";
import { Prisma } from "@prisma/client";

export class AmazonCountryCreateMapper
  implements
    ToCreateInputMapperI<
      AmazonCountryCreateDto,
      Prisma.AmazonCountryUncheckedCreateInput
    >
{
  toCreateInput(dto: AmazonCountryCreateDto) {
    return {
      countryId: dto.countryId,
      tld: dto.tld,
      scraped: dto.scraped,
      active: dto.active,
      proxyType: dto.proxyType,
      createdAt: new Date(Date.now()),
      updatedAt: new Date(Date.now()),
    };
  }
}
