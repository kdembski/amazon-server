import { AmazonExclusionRuleUpdateDto } from "@/modules/marketplaces/amazon/dtos/AmazonExclusionRuleDtos";
import { ExclusionRuleValidator } from "@/modules/exclusion-rules/services/ExclusionRuleValidator";
import { ToUpdateInputMapperI } from "@/shared/crud/interfaces/CRUDMapper";
import { Prisma } from "@prisma/client";

export class AmazonExclusionRuleUpdateMapper
  implements
    ToUpdateInputMapperI<
      AmazonExclusionRuleUpdateDto,
      Prisma.AmazonExclusionRuleUncheckedUpdateInput
    >
{
  private validator;

  constructor(validator = new ExclusionRuleValidator()) {
    this.validator = validator;
  }

  toUpdateInput(dto: AmazonExclusionRuleUpdateDto) {
    return {
      value:
        dto.value === undefined ? undefined : this.validator.validate(dto.value),
      categoryId: this.validator.validateScope(dto.categoryId),
    };
  }
}
