import { OlxProductCreateMapper } from "@/mappers/olx/OlxProductCreateMapper";
import { OlxProductUpdateMapper } from "@/mappers/olx/OlxProductUpdateMapper";
import { OlxProductRepository } from "@/repositories/olx/OlxProductRepository";
import { CreatableService } from "@/services/crud/CreatableService";
import { DeletableService } from "@/services/crud/DeletableService";
import { SelectableService } from "@/services/crud/SelectableService";
import { UpdatableService } from "@/services/crud/UpdatableService";

export class OlxProductService {
  private repository;
  selectable;
  creatable;
  updateMapper;
  updatable;
  deletable;

  constructor(
    repository = new OlxProductRepository(),
    selectable = new SelectableService(repository),
    deletable = new DeletableService(repository),
    creatable = new CreatableService(repository, new OlxProductCreateMapper()),
    updateMapper = new OlxProductUpdateMapper(),
    updatable = new UpdatableService(repository, updateMapper)
  ) {
    this.repository = repository;
    this.selectable = selectable;
    this.creatable = creatable;
    this.updateMapper = updateMapper;
    this.updatable = updatable;
    this.deletable = deletable;
  }

  getAll() {
    return this.repository.getAll();
  }

  getByBrandAndModel(data: { model: string; brand: string }) {
    return this.repository.getByBrandAndModel(data);
  }

  async getPricesFromLastMonth() {
    const products = await this.repository.getPricesFromLastMonth();
    return products.map((product) => ({
      id: product.id,
      prices: product.productAds.map((productAd) => productAd.ad.price),
    }));
  }

  async getAllWithSingleAd() {
    const products = await this.repository.getAllWithAdsCount();
    return products.filter((product) => product._count.productAds === 1);
  }

  async deleteAllWithSingleAd() {
    const products = await this.getAllWithSingleAd();

    products.forEach((product) => {
      this.deletable.delete(product.id);
    });
  }
}
