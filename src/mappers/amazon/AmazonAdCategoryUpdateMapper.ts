import { AmazonAdCategoryUpdateDto } from "@/dtos/amazon/AmazonAdCategoryDtos";
import { ToUpdateInputMapperI } from "@/interfaces/crud/CRUDMapper";
import { Prisma } from "@prisma/client";

export class AmazonAdCategoryUpdateMapper
  implements
    ToUpdateInputMapperI<
      AmazonAdCategoryUpdateDto,
      Prisma.AmazonAdCategoryUpdateInput
    >
{
  toUpdateInput(dto: AmazonAdCategoryUpdateDto) {
    return {
      name: dto.name,
      updatedAt: new Date(Date.now()),
    };
  }
}
