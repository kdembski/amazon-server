import { OlxAdCreateDto } from "@/dtos/olx/OlxAdDtos";
import { OlxAdCreateMapper } from "@/mappers/olx/OlxAdCreateMapper";
import { OlxAdRepository } from "@/repositories/olx/OlxAdRepository";
import { AiChatService } from "@/services/AiChatService";
import { CreatableService } from "@/services/crud/CreatableService";
import { DeletableService } from "@/services/crud/DeletableService";
import { SelectableService } from "@/services/crud/SelectableService";
import { OlxProductAdService } from "@/services/olx/OlxProductAdService";
import { OlxAd } from "@prisma/client";

export class OlxAdService {
  private repository;
  private productAdService;
  private aiChatService;
  selectable;
  deletable;
  creatable;

  constructor(
    repository = new OlxAdRepository(),
    selectable = new SelectableService(repository),
    deletable = new DeletableService(repository),
    creatable = new CreatableService(repository, new OlxAdCreateMapper()),
    productAdService = new OlxProductAdService(),
    aiChatService = new AiChatService()
  ) {
    this.repository = repository;
    this.productAdService = productAdService;
    this.aiChatService = aiChatService;
    this.selectable = selectable;
    this.deletable = deletable;
    this.creatable = creatable;
  }

  getAll() {
    return this.repository.getAll();
  }

  getAllWithoutProductAd() {
    return this.repository.getAllWithoutProductAd();
  }

  async create(dto: OlxAdCreateDto) {
    const ad = await this.creatable.create(dto);
    this.linkAdWithProduct(ad);
    return ad;
  }

  async linkAdWithProduct(ad: OlxAd) {
    const productInfo = await this.aiChatService.getProductInfo(ad.name);

    if (!productInfo) {
      setTimeout(() => this.linkAdWithProduct(ad), 5000);
      return;
    }

    return this.productAdService.creatable.create({
      productBrand: productInfo.brand,
      productModel: productInfo.model,
      adId: ad.id,
    });
  }

  async linkAdsThatMissingProducts() {
    const ads = await this.getAllWithoutProductAd();

    ads.forEach((ad) => {
      this.linkAdWithProduct(ad);
    });
  }
}
