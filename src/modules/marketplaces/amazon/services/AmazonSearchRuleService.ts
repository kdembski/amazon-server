import { AmazonSearchRuleBatchDto } from "@/modules/marketplaces/amazon/dtos/AmazonSearchRuleDtos";
import { AmazonSearchRuleBatchMapper } from "@/modules/marketplaces/amazon/mappers/AmazonSearchRuleBatchMapper";
import { AmazonSearchRuleCreateMapper } from "@/modules/marketplaces/amazon/mappers/AmazonSearchRuleCreateMapper";
import { AmazonSearchRuleUpdateMapper } from "@/modules/marketplaces/amazon/mappers/AmazonSearchRuleUpdateMapper";
import { AmazonSearchRuleRepository } from "@/modules/marketplaces/amazon/repositories/AmazonSearchRuleRepository";
import { CreatableService } from "@/shared/crud/services/CreatableService";
import { DeletableService } from "@/shared/crud/services/DeletableService";
import { UpdatableService } from "@/shared/crud/services/UpdatableService";

export class AmazonSearchRuleService {
  private repository;
  private batchMapper;
  deletable;
  creatable;
  updatable;

  constructor(
    repository = new AmazonSearchRuleRepository(),
    deletable = new DeletableService(repository),
    creatable = new CreatableService(
      repository,
      new AmazonSearchRuleCreateMapper()
    ),
    updatable = new UpdatableService(
      repository,
      new AmazonSearchRuleUpdateMapper()
    ),
    batchMapper = new AmazonSearchRuleBatchMapper()
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

  async applyBatch(dto: AmazonSearchRuleBatchDto) {
    await this.repository.applyBatch(this.batchMapper.toBatchInput(dto));
    return this.repository.getAll();
  }
}
