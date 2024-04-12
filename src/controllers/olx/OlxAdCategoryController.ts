import { Response, Request } from "express";
import { OlxAdCategoryService } from "@/services/olx/OlxAdCategoryService";
import { OlxAdCategoryWebSocketController } from "@/websockets/olx/OlxAdCategoryWebSocketController";
import { CreatableController } from "@/controllers/crud/CreatableController";
import { DeletableController } from "@/controllers/crud/DeletableController";
import { OlxAdCategoryCreateDto } from "@/dtos/olx/OlxAdCategoryDtos";

export class OlxAdCategoryController {
  private service;
  private adCategoryWsController;
  private creatable;
  private deletable;

  constructor(
    service = new OlxAdCategoryService(),
    creatable = new CreatableController(service.creatable),
    deletable = new DeletableController(service.deletable),
    adCategoryWsController = OlxAdCategoryWebSocketController.getInstance(
      service
    )
  ) {
    this.service = service;
    this.adCategoryWsController = adCategoryWsController;
    this.creatable = creatable;
    this.deletable = deletable;
  }

  async getAll(response: Response) {
    try {
      const results = await this.service.getAll();
      response.json(results);
    } catch (error: any) {
      response.status(500).send(error?.message);
    }
  }

  async create(
    request: Request<{}, {}, OlxAdCategoryCreateDto>,
    response: Response
  ) {
    await this.creatable.create(request, response);
    this.adCategoryWsController.sendCategoriesToAll();
  }

  async delete(request: Request<{ id: string }>, response: Response) {
    await this.deletable.delete(request, response);
    this.adCategoryWsController.sendCategoriesToAll();
  }
}
