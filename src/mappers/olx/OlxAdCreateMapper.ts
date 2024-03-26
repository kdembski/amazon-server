import { OlxAdCreateDto } from "@/dtos/olx/OlxAdDtos";
import { ToCreateInputMapperI } from "@/interfaces/crud/CRUDMapper";
import { Prisma } from "@prisma/client";

export class OlxAdCreateMapper
  implements ToCreateInputMapperI<OlxAdCreateDto, Prisma.OlxAdCreateInput>
{
  toCreateInput(dto: OlxAdCreateDto) {
    return {
      olxId: dto.olxId,
      name: dto.name,
      price: dto.price,
      url: dto.url,
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
