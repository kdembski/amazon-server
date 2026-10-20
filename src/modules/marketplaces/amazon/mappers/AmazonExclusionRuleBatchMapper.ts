import { AmazonExclusionRuleBatchDto } from "@/modules/marketplaces/amazon/dtos/AmazonExclusionRuleDtos";
import { AmazonExclusionRuleCreateMapper } from "@/modules/marketplaces/amazon/mappers/AmazonExclusionRuleCreateMapper";
import { AmazonExclusionRuleUpdateMapper } from "@/modules/marketplaces/amazon/mappers/AmazonExclusionRuleUpdateMapper";
import { AmazonExclusionRuleBatchInput } from "@/modules/marketplaces/amazon/repositories/AmazonExclusionRuleRepository";
import { ExclusionRuleBatchValidator } from "@/modules/exclusion-rules/services/ExclusionRuleBatchValidator";

export class AmazonExclusionRuleBatchMapper {
  private createMapper;
  private updateMapper;
  private validator;

  constructor(
    createMapper = new AmazonExclusionRuleCreateMapper(),
    updateMapper = new AmazonExclusionRuleUpdateMapper(),
    validator = new ExclusionRuleBatchValidator()
  ) {
    this.createMapper = createMapper;
    this.updateMapper = updateMapper;
    this.validator = validator;
  }

  toBatchInput(dto: AmazonExclusionRuleBatchDto): AmazonExclusionRuleBatchInput {
    const batch = this.validator.validate(dto);

    return {
      create: this.validator
        .validateList(batch.create, "create")
        .map((rule) => this.createMapper.toCreateInput(rule)),
      update: this.validator
        .validateList(batch.update, "update")
        .map(({ id, ...rule }) => ({
          id: this.validator.validateId(id),
          data: this.updateMapper.toUpdateInput(rule),
        })),
      delete: this.validator
        .validateList(batch.delete, "delete")
        .map((id) => this.validator.validateId(id)),
    };
  }
}
