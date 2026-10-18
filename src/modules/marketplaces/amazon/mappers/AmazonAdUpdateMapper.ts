import { AmazonAdUpdateDto } from "@/modules/marketplaces/amazon/dtos/AmazonAdDtos";
import { ToUpdateInputMapperI } from "@/shared/crud/interfaces/CRUDMapper";
import { Prisma } from "@prisma/client";

export class AmazonAdUpdateMapper
  implements
    ToUpdateInputMapperI<AmazonAdUpdateDto, Prisma.AmazonAdUpdateInput>
{
  toUpdateInput(dto: AmazonAdUpdateDto) {
    return {
      name: dto.name,
      image: dto.image,
      updatedAt: new Date(Date.now()),
    };
  }
}
