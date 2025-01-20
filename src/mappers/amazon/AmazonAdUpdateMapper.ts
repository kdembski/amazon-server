import { AmazonAdUpdateDto } from "@/dtos/amazon/AmazonAdDtos";
import { ToUpdateInputMapperI } from "@/interfaces/crud/CRUDMapper";
import { Prisma } from "@prisma/client";

export class AmazonAdUpdateMapper
  implements
    ToUpdateInputMapperI<AmazonAdUpdateDto, Prisma.AmazonAdUpdateInput>
{
  toUpdateInput(dto: AmazonAdUpdateDto) {
    return {
      category: {
        connect: {
          id: dto.categoryId,
        },
      },
      updatedAt: new Date(Date.now()),
    };
  }
}
