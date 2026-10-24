import { Response, Request } from "express";
import { CreatableController } from "@/shared/crud/controllers/CreatableController";
import { DeletableController } from "@/shared/crud/controllers/DeletableController";
import { SelectableController } from "@/shared/crud/controllers/SelectableController";
import { ResponseErrorService } from "@/shared/http/ResponseErrorService";
import { AmazonAdService } from "@/modules/marketplaces/amazon/services/AmazonAdService";
import { AmazonAdPriceCreateDto } from "@/modules/marketplaces/amazon/dtos/AmazonAdPriceDtos";

export class AmazonAdController {
  private service;
  creatable;
  selectable;
  deletable;

  constructor(
    service = new AmazonAdService(),
    selectable = new SelectableController(service.selectable),
    creatable = new CreatableController(service.creatable),
    deletable = new DeletableController(service.deletable)
  ) {
    this.service = service;
    this.selectable = selectable;
    this.creatable = creatable;
    this.deletable = deletable;
  }

  async getAll(response: Response) {
    try {
      const results = await this.service.getAll();
      response.json(results);
    } catch (error: any) {
      new ResponseErrorService(response).send(error);
    }
  }

  async getForScraping(
    request: Request<{}, {}, {}, { batchSize: string }>,
    response: Response
  ) {
    try {
      const batchSize = parseInt(request.query.batchSize) || 50;
      const results = await this.service.getForScraping(batchSize);
      response.json(results);
    } catch (error: any) {
      new ResponseErrorService(response).send(error);
    }
  }

  async update(
    request: Request<{ id: string }, {}, { prices: AmazonAdPriceCreateDto[] }>,
    response: Response
  ) {
    try {
      const id = parseInt(request.params.id);
      const data = request.body;

      const results = await this.service.updatePrices(id, data.prices);
      response.json(results);
    } catch (error: any) {
      new ResponseErrorService(response).send(error);
    }
  }
}
