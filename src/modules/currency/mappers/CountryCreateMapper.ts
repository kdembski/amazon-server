import { CountryCreateDto } from "@/modules/currency/dtos/CountryDtos";
import { ToCreateInputMapperI } from "@/shared/crud/interfaces/CRUDMapper";
import { Prisma } from "@prisma/client";

export class CountryCreateMapper
  implements ToCreateInputMapperI<CountryCreateDto, Prisma.CountryCreateInput>
{
  toCreateInput(dto: CountryCreateDto) {
    return {
      name: dto.name,
      code: dto.code,
      currency: { connect: { id: dto.currencyId } },
      createdAt: new Date(Date.now()),
      updatedAt: new Date(Date.now()),
    };
  }
}
