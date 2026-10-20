import { AmazonAdCreateDto } from "@/modules/marketplaces/amazon/dtos/AmazonAdDtos";
import { ToCreateInputMapperI } from "@/shared/crud/interfaces/CRUDMapper";
import { Prisma } from "@prisma/client";

export class AmazonAdCreateMapper
  implements
    ToCreateInputMapperI<AmazonAdCreateDto, Prisma.AmazonAdCreateInput>
{
  toCreateInput(dto: AmazonAdCreateDto) {
    return {
      asin: dto.asin,
      name: dto.name,
      image: dto.image,
      excluded: null,
      createdAt: new Date(Date.now()),
      updatedAt: new Date(Date.now()),
      category: {
        connectOrCreate: {
          where: {
            name: dto.categoryName,
          },
          create: {
            name: dto.categoryName,
            createdAt: new Date(Date.now()),
            updatedAt: new Date(Date.now()),
          },
        },
      },
    };
  }
}
