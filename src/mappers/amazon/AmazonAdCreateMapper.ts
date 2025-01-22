import { AmazonAdCreateDto } from "@/dtos/amazon/AmazonAdDtos";
import { ToCreateInputMapperI } from "@/interfaces/crud/CRUDMapper";
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
