import { CountryUpdateDto } from "@/dtos/currency/CountryDtos";
import { ToUpdateInputMapperI } from "@/interfaces/crud/CRUDMapper";
import { Prisma } from "@prisma/client";

export class CountryUpdateMapper
  implements ToUpdateInputMapperI<CountryUpdateDto, Prisma.CountryUpdateInput>
{
  toUpdateInput(dto: CountryUpdateDto) {
    return {
      name: dto.name,
      code: dto.code,
      currency: { connect: { id: dto.currencyId } },
      updatedAt: new Date(Date.now()),
    };
  }
}
