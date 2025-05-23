import { AmazonAdUpdateDto } from "@/dtos/amazon/AmazonAdDtos";
import { ToUpdateInputMapperI } from "@/interfaces/crud/CRUDMapper";
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
