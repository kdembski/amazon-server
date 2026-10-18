import { AmazonAdCategoryCreateDto } from "@/dtos/amazon/AmazonAdCategoryDtos";
import { ToCreateInputMapperI } from "@/shared/crud/interfaces/CRUDMapper";
import { Prisma } from "@prisma/client";

export class AmazonAdCategoryCreateMapper
  implements
    ToCreateInputMapperI<
      AmazonAdCategoryCreateDto,
      Prisma.AmazonAdCategoryCreateInput
    >
{
  toCreateInput(dto: AmazonAdCategoryCreateDto) {
    return {
      name: dto.name,
      createdAt: new Date(Date.now()),
      updatedAt: new Date(Date.now()),
    };
  }
}
