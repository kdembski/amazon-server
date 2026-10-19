import { AmazonSearchRuleUpdateDto } from "@/modules/marketplaces/amazon/dtos/AmazonSearchRuleDtos";
import {
  validateSearchRule,
  validateSearchRuleScope,
} from "@/modules/search-rules/helpers/searchRule";
import { ToUpdateInputMapperI } from "@/shared/crud/interfaces/CRUDMapper";
import { Prisma } from "@prisma/client";

export class AmazonSearchRuleUpdateMapper
  implements
    ToUpdateInputMapperI<
      AmazonSearchRuleUpdateDto,
      Prisma.AmazonSearchRuleUncheckedUpdateInput
    >
{
  toUpdateInput(dto: AmazonSearchRuleUpdateDto) {
    return {
      value: dto.value === undefined ? undefined : validateSearchRule(dto.value),
      categoryId: validateSearchRuleScope(dto.categoryId),
    };
  }
}
