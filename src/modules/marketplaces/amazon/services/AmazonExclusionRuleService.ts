import { AmazonExclusionRuleBatchDto } from "@/modules/marketplaces/amazon/dtos/AmazonExclusionRuleDtos";
import { AmazonExclusionRuleBatchMapper } from "@/modules/marketplaces/amazon/mappers/AmazonExclusionRuleBatchMapper";
import { AmazonExclusionRuleCreateMapper } from "@/modules/marketplaces/amazon/mappers/AmazonExclusionRuleCreateMapper";
import { AmazonExclusionRuleUpdateMapper } from "@/modules/marketplaces/amazon/mappers/AmazonExclusionRuleUpdateMapper";
import { AmazonExclusionRuleRepository } from "@/modules/marketplaces/amazon/repositories/AmazonExclusionRuleRepository";
import { CreatableService } from "@/shared/crud/services/CreatableService";
import { DeletableService } from "@/shared/crud/services/DeletableService";
import { UpdatableService } from "@/shared/crud/services/UpdatableService";

export class AmazonExclusionRuleService {
  private repository;
  private batchMapper;
  deletable;
  creatable;
  updatable;

  constructor(
    repository = new AmazonExclusionRuleRepository(),
    deletable = new DeletableService(repository),
    creatable = new CreatableService(
      repository,
      new AmazonExclusionRuleCreateMapper()
    ),
    updatable = new UpdatableService(
      repository,
      new AmazonExclusionRuleUpdateMapper()
    ),
    batchMapper = new AmazonExclusionRuleBatchMapper()
  ) {
    this.repository = repository;
    this.batchMapper = batchMapper;
    this.deletable = deletable;
    this.creatable = creatable;
    this.updatable = updatable;
  }

  getAll() {
    return this.repository.getAll();
  }

  async applyBatch(dto: AmazonExclusionRuleBatchDto) {
    await this.repository.applyBatch(this.batchMapper.toBatchInput(dto));
    return this.repository.getAll();
  }
}
