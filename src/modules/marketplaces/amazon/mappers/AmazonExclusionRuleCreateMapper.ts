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
    return {
      value: this.validator.validate(dto.value),
      categoryId: this.validator.validateScope(dto.categoryId) ?? null,
      createdAt: new Date(Date.now()),
    };
  }
}
