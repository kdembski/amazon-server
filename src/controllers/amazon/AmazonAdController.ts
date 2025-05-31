import { Response, Request } from "express";
import { CreatableController } from "@/controllers/crud/CreatableController";
import { DeletableController } from "@/controllers/crud/DeletableController";
import { SelectableController } from "@/controllers/crud/SelectableController";
import { ResponseErrorService } from "@/services/ResponseErrorService";
import { AmazonAdService } from "@/services/amazon/AmazonAdService";
import { AmazonAdPriceCreateDto } from "@/dtos/amazon/AmazonAdPriceDtos";

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
    request: Request<{}, {}, {}, { count: string }>,
    response: Response
  ) {
    try {
      const count = parseInt(request.query.count) || 50;
      const results = await this.service.getForScraping(count);
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
