import { Request, Response } from "express";
import { AmazonExclusionRuleBatchDto } from "@/modules/marketplaces/amazon/dtos/AmazonExclusionRuleDtos";
import { CreatableController } from "@/shared/crud/controllers/CreatableController";
import { DeletableController } from "@/shared/crud/controllers/DeletableController";
import { respond } from "@/shared/http/respond";
import { UpdatableController } from "@/shared/crud/controllers/UpdatableController";
import { AmazonExclusionRuleService } from "@/modules/marketplaces/amazon/services/AmazonExclusionRuleService";

export class AmazonExclusionRuleController {
  private service;
  creatable;
  updatable;
  deletable;

  constructor(
    service = new AmazonExclusionRuleService(),
    creatable = new CreatableController(service.creatable),
    updatable = new UpdatableController(service.updatable),
    deletable = new DeletableController(service.deletable)
  ) {
    this.service = service;
    this.creatable = creatable;
    this.updatable = updatable;
    this.deletable = deletable;
  }

  getAll(response: Response) {
    return respond(response, () => this.service.getAll());
  }

  applyBatch(
    request: Request<{}, {}, AmazonExclusionRuleBatchDto>,
    response: Response
  ) {
    return respond(response, () => this.service.applyBatch(request.body));
  }
}
