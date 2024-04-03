import { OlxAdCreateDto } from "@/dtos/olx/OlxAdDtos";
import { OlxAdCreateMapper } from "@/mappers/olx/OlxAdCreateMapper";
import { OlxAdRepository } from "@/repositories/olx/OlxAdRepository";
import { AiChatService } from "@/services/AiChatService";
import { CreatableService } from "@/services/crud/CreatableService";
import { DeletableService } from "@/services/crud/DeletableService";
import { SelectableService } from "@/services/crud/SelectableService";
import { OlxProductAdService } from "@/services/olx/OlxProductAdService";
import { OlxProductService } from "@/services/olx/OlxProductService";
import { OlxAd } from "@prisma/client";

export class OlxAdService {
  private repository;
  private productAdService;
  private productService;
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
    productService = new OlxProductService(),
    aiChatService = new AiChatService()
  ) {
    this.repository = repository;
    this.productAdService = productAdService;
    this.productService = productService;
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

  async linkMissingProductsToAds() {
    const ads = await this.getAllWithoutProductAd();

    for (const [index, ad] of ads.entries()) {
      console.log(index + "/" + ads.length);

      const productInfo = await this.aiChatService.getProductInfo(ad.name);
      if (!productInfo) continue;

      const product = await this.productService.getByBrandAndModel(productInfo);
      if (!product) continue;

      await this.productAdService.creatable.create({
        productId: product.id,
        adId: ad.id,
      });
    }
  }
}
