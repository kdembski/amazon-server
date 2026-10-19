import { AmazonSearchRuleBatchDto } from "@/modules/marketplaces/amazon/dtos/AmazonSearchRuleDtos";
import { AmazonSearchRuleCreateMapper } from "@/modules/marketplaces/amazon/mappers/AmazonSearchRuleCreateMapper";
import { AmazonSearchRuleUpdateMapper } from "@/modules/marketplaces/amazon/mappers/AmazonSearchRuleUpdateMapper";
import { AmazonSearchRuleBatchInput } from "@/modules/marketplaces/amazon/repositories/AmazonSearchRuleRepository";
import { SearchRuleBatchValidator } from "@/modules/search-rules/services/SearchRuleBatchValidator";

export class AmazonSearchRuleBatchMapper {
  private createMapper;
  private updateMapper;
  private validator;

  constructor(
    createMapper = new AmazonSearchRuleCreateMapper(),
    updateMapper = new AmazonSearchRuleUpdateMapper(),
    validator = new SearchRuleBatchValidator()
  ) {
    this.createMapper = createMapper;
    this.updateMapper = updateMapper;
    this.validator = validator;
  }

  toBatchInput(dto: AmazonSearchRuleBatchDto): AmazonSearchRuleBatchInput {
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
