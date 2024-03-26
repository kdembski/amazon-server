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

  async create(dto: OlxAdCreateDto) {
    try {
      console.log(this);
      const ad = await this.creatable.create(dto);
      this.linkAdWithProduct(ad);
      return ad;
    } catch (error: any) {
      console.log(error);
      throw Error(error);
    }
  }

  async linkAdWithProduct(ad: OlxAd) {
    try {
      const productInfo = await this.aiChatService.getProductInfo(ad.name);
      console.log(productInfo);
      if (!productInfo) return ad;

      await this.productAdService.creatable.create({
        productBrand: productInfo.brand,
        productModel: productInfo.model,
        adId: ad.id,
      });
    } catch (error: any) {
      throw Error(error);
    }
  }
}
