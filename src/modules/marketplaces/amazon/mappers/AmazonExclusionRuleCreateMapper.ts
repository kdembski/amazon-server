import { AmazonExclusionRuleCreateDto } from "@/modules/marketplaces/amazon/dtos/AmazonExclusionRuleDtos";
import { ExclusionRuleValidator } from "@/modules/exclusion-rules/services/ExclusionRuleValidator";
import { ToCreateInputMapperI } from "@/shared/crud/interfaces/CRUDMapper";
import { Prisma } from "@prisma/client";

export class AmazonExclusionRuleCreateMapper
  implements
    ToCreateInputMapperI<
      AmazonExclusionRuleCreateDto,
      Prisma.AmazonExclusionRuleUncheckedCreateInput
    >
{
  private validator;

  constructor(validator = new ExclusionRuleValidator()) {
    this.validator = validator;
  }

  toCreateInput(dto: AmazonExclusionRuleCreateDto) {
    const categoryId = this.validator.validateScope(dto.categoryId) ?? null;
    return {
      value: this.validator.validate(dto.value),
      categoryId,
      inverted:
        this.validator.validateInverted(dto.inverted, categoryId) ?? false,
      createdAt: new Date(Date.now()),
    };
  }
}
