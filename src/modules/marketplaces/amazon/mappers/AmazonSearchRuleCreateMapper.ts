import { AmazonSearchRuleCreateDto } from "@/modules/marketplaces/amazon/dtos/AmazonSearchRuleDtos";
import { validateSearchRule } from "@/modules/search-rules/helpers/searchRule";
import { ToCreateInputMapperI } from "@/shared/crud/interfaces/CRUDMapper";
import { Prisma } from "@prisma/client";

export class AmazonSearchRuleCreateMapper
  implements
    ToCreateInputMapperI<
      AmazonSearchRuleCreateDto,
      Prisma.AmazonSearchRuleUncheckedCreateInput
    >
{
  toCreateInput(dto: AmazonSearchRuleCreateDto) {
    return {
      value: validateSearchRule(dto.value),
      categoryId: dto.categoryId ?? null,
      createdAt: new Date(Date.now()),
    };
  }
}
