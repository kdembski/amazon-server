import { AmazonCountryUpdateDto } from "@/modules/marketplaces/amazon/dtos/AmazonCountryDtos";
import { ToUpdateInputMapperI } from "@/shared/crud/interfaces/CRUDMapper";
import { Prisma } from "@prisma/client";

export class AmazonCountryUpdateMapper
  implements
    ToUpdateInputMapperI<
      AmazonCountryUpdateDto,
      Prisma.AmazonCountryUncheckedUpdateInput
    >
{
  toUpdateInput(dto: AmazonCountryUpdateDto) {
    return {
      tld: dto.tld,
      scraped: dto.scraped,
      active: dto.active,
      updatedAt: new Date(Date.now()),
    };
  }
}
