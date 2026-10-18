import { CurrencyExchangeRateUpdateDto } from "@/modules/currency/dtos/CurrencyExchangeRateDtos";
import { CurrencyExchangeRateCreateMapper } from "@/modules/currency/mappers/CurrencyExchangeRateCreateMapper";
import { CurrencyExchangeRateUpdateMapper } from "@/modules/currency/mappers/CurrencyExchangeRateUpdateMapper";
import { CurrencyExchangeRateRepository } from "@/modules/currency/repositories/CurrencyExchangeRateRepository";
import { PlnExchangeRateCache } from "@/modules/currency/services/PlnExchangeRateCache";
import { CreatableService } from "@/shared/crud/services/CreatableService";
import { DeletableService } from "@/shared/crud/services/DeletableService";
import { UpdatableService } from "@/shared/crud/services/UpdatableService";

export class CurrencyExchangeRateService {
  private repository;
  deletable;
  creatable;
  updatable;
  updateMapper;
  private plnRateCache;

  constructor(
    repository = new CurrencyExchangeRateRepository(),
    deletable = new DeletableService(repository),
    creatable = new CreatableService(
      repository,
      new CurrencyExchangeRateCreateMapper()
    ),
    updateMapper = new CurrencyExchangeRateUpdateMapper(),
    updatable = new UpdatableService(repository, updateMapper),
    plnRateCache = PlnExchangeRateCache.getInstance()
  ) {
    this.repository = repository;
    this.deletable = deletable;
    this.creatable = creatable;
    this.updatable = updatable;
    this.updateMapper = updateMapper;
    this.plnRateCache = plnRateCache;
  }

  getByTargetCode(targetCode: string) {
    return this.repository.getByTargetCode(targetCode);
  }

  async getPlnRates() {
    if (!this.plnRateCache.rates) await this.refreshPlnRates();

    return this.plnRateCache.rates!;
  }

  async refreshPlnRates() {
    this.plnRateCache.rates = await this.getByTargetCode("PLN");
  }

  updateBySourceAndTarget(
    ids: { sourceId: number; targetId: number },
    dto: CurrencyExchangeRateUpdateDto
  ) {
    const input = this.updateMapper.toUpdateInput(dto);
    return this.repository.updateBySourceAndTarget(ids, input);
  }
}
