import { SearchRuleCreateDto } from "@/dtos/search-rule/SearchRuleDtos";
import { ToCreateInputMapperI } from "@/interfaces/crud/CRUDMapper";
import { Prisma } from "@prisma/client";

export class SearchRuleCreateMapper
  implements
    ToCreateInputMapperI<
      SearchRuleCreateDto,
      Prisma.SearchRuleCreateInput
    >
{
  toCreateInput(dto: SearchRuleCreateDto) {
    return {
      value: dto.value,
      createdAt: new Date(Date.now()),
    };
  }
}
