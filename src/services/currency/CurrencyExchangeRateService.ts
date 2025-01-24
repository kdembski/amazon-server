import { CurrencyExchangeRateUpdateDto } from "@/dtos/currency/CurrencyExchangeRateDtos";
import { CurrencyExchangeRateCreateMapper } from "@/mappers/currency/CurrencyExchangeRateCreateMapper";
import { CurrencyExchangeRateUpdateMapper } from "@/mappers/currency/CurrencyExchangeRateUpdateMapper";
import { CurrencyExchangeRateRepository } from "@/repositories/currency/CurrencyExchangeRateRepository";
import { CreatableService } from "@/services/crud/CreatableService";
import { DeletableService } from "@/services/crud/DeletableService";
import { UpdatableService } from "@/services/crud/UpdatableService";

export class CurrencyExchangeRateService {
  private repository;
  deletable;
  creatable;
  updatable;
  updateMapper;

  constructor(
    repository = new CurrencyExchangeRateRepository(),
    deletable = new DeletableService(repository),
    creatable = new CreatableService(
      repository,
      new CurrencyExchangeRateCreateMapper()
    ),
    updateMapper = new CurrencyExchangeRateUpdateMapper(),
    updatable = new UpdatableService(repository, updateMapper)
  ) {
    this.repository = repository;
    this.deletable = deletable;
    this.creatable = creatable;
    this.updatable = updatable;
    this.updateMapper = updateMapper;
  }

  getBySourceAndTarget(data: { sourceId: number; targetId: number }) {
    return this.repository.getBySourceAndTarget(data);
  }

  getByTarget(targetId: number) {
    return this.repository.getByTarget(targetId);
  }

  updateBySourceAndTarget(
    ids: { sourceId: number; targetId: number },
    dto: CurrencyExchangeRateUpdateDto
  ) {
    const input = this.updateMapper.toUpdateInput(dto);
    return this.repository.updateBySourceAndTarget(ids, input);
  }
}
