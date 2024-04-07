import { Response } from "express";
import { OlxAdCategoryService } from "@/services/olx/OlxAdCategoryService";

export class OlxAdCategoryController {
  private service;

  constructor(service = new OlxAdCategoryService()) {
    this.service = service;
  }

  async getAll(response: Response) {
    try {
      const results = await this.service.getAll();
      response.json(results);
    } catch (error) {
      response.json(error);
    }
  }
}
