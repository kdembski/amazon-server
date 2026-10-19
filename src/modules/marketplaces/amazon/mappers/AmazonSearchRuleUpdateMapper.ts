import { AmazonSearchRuleUpdateDto } from "@/modules/marketplaces/amazon/dtos/AmazonSearchRuleDtos";
import { SearchRuleValidator } from "@/modules/search-rules/services/SearchRuleValidator";
import { ToUpdateInputMapperI } from "@/shared/crud/interfaces/CRUDMapper";
import { Prisma } from "@prisma/client";

export class AmazonSearchRuleUpdateMapper
  implements
    ToUpdateInputMapperI<
      AmazonSearchRuleUpdateDto,
      Prisma.AmazonSearchRuleUncheckedUpdateInput
    >
{
  private validator;

  constructor(validator = new SearchRuleValidator()) {
    this.validator = validator;
  }

  toUpdateInput(dto: AmazonSearchRuleUpdateDto) {
    return {
      value:
        dto.value === undefined ? undefined : this.validator.validate(dto.value),
      categoryId: this.validator.validateScope(dto.categoryId),
    };
  }
}
