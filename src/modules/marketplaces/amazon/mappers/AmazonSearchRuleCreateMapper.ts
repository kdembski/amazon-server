import { AmazonSearchRuleCreateDto } from "@/modules/marketplaces/amazon/dtos/AmazonSearchRuleDtos";
import { SearchRuleValidator } from "@/modules/search-rules/services/SearchRuleValidator";
import { ToCreateInputMapperI } from "@/shared/crud/interfaces/CRUDMapper";
import { Prisma } from "@prisma/client";

export class AmazonSearchRuleCreateMapper
  implements
    ToCreateInputMapperI<
      AmazonSearchRuleCreateDto,
      Prisma.AmazonSearchRuleUncheckedCreateInput
    >
{
  private validator;

  constructor(validator = new SearchRuleValidator()) {
    this.validator = validator;
  }

  toCreateInput(dto: AmazonSearchRuleCreateDto) {
    return {
      value: this.validator.validate(dto.value),
      categoryId: this.validator.validateScope(dto.categoryId) ?? null,
      createdAt: new Date(Date.now()),
    };
  }
}
