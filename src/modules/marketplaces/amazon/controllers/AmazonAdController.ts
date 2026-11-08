import { Response, Request } from "express";
import { CreatableController } from "@/shared/crud/controllers/CreatableController";
import { DeletableController } from "@/shared/crud/controllers/DeletableController";
import { SelectableController } from "@/shared/crud/controllers/SelectableController";
import { IdempotencyCache } from "@/shared/http/IdempotencyCache";
import { respond } from "@/shared/http/respond";
import { AmazonAdService } from "@/modules/marketplaces/amazon/services/AmazonAdService";
import { AmazonAdScrapingService } from "@/modules/marketplaces/amazon/services/AmazonAdScrapingService";
import { AmazonAdPriceCreateDto } from "@/modules/marketplaces/amazon/dtos/AmazonAdPriceDtos";
import {
  AmazonAdBatchDto,
  AmazonAdCreateDto,
} from "@/modules/marketplaces/amazon/dtos/AmazonAdDtos";
import _ from "lodash";

export class AmazonAdController {
  private service;
  private scrapingService;
  creatable;
  selectable;
  deletable;

  constructor(
    service = new AmazonAdService(),
    selectable = new SelectableController(service.selectable),
    creatable = new CreatableController(service.creatable),
    deletable = new DeletableController(service.deletable),
    scrapingService = new AmazonAdScrapingService()
  ) {
    this.scrapingService = scrapingService;
    this.service = service;
    this.selectable = selectable;
    this.creatable = creatable;
    this.deletable = deletable;
  }

  getAll(response: Response) {
    return respond(response, () => this.service.getAll());
  }

  getForScraping(request: Request<{}, {}, {}, { batchSize: string }>, response: Response) {
    return respond(response, () => this.scrapingService.getForScraping(parseInt(request.query.batchSize) || 50));
  }

  update(
    request: Request<{ id: string }, {}, { prices: AmazonAdPriceCreateDto[] }>,
    response: Response
  ) {
    return respond(response, () => {
      return this.service.updatePrices(parseInt(request.params.id), request.body.prices);
    });
  }

  create(request: Request<{}, {}, AmazonAdCreateDto | AmazonAdCreateDto[]>, response: Response) {
    if (!_.isArray(request.body)) return this.creatable.create(request, response);

    return respond(response, () => this.service.createMany(request.body as AmazonAdCreateDto[]));
  }

  applyBatch(request: Request<{}, {}, AmazonAdBatchDto>, response: Response) {
    return respond(response, () => this.service.applyBatch(request.body, IdempotencyCache.getKey(request)));
  }
}
