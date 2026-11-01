import { Request, Response } from "express";
import { DiscordChannelService, maskToken } from "@/modules/settings/services/DiscordChannelService";
import { ResponseErrorService } from "@/shared/http/ResponseErrorService";

export class DiscordChannelController {
  private service;

  constructor(service = new DiscordChannelService()) {
    this.service = service;
  }

  async getAll(response: Response) {
    try {
      response.json(await this.service.getAll());
    } catch (error: any) {
      new ResponseErrorService(response).send(error);
    }
  }

  async create(request: Request, response: Response) {
    try {
      response.json(await this.service.create(request.body));
    } catch (error: any) {
      this.sendError(request, response, error);
    }
  }

  async update(request: Request<{ id: string }>, response: Response) {
    try {
      const id = parseInt(request.params.id);
      response.json(await this.service.update(id, request.body));
    } catch (error: any) {
      this.sendError(request, response, error);
    }
  }

  async delete(request: Request<{ id: string }>, response: Response) {
    try {
      const id = parseInt(request.params.id);
      response.json(await this.service.delete(id));
    } catch (error: any) {
      new ResponseErrorService(response).send(error);
    }
  }

  // ResponseErrorService logs the request body.
  private sendError(request: Request, response: Response, error: unknown) {
    const { token } = request.body ?? {};
    if (typeof token === "string") request.body = { ...request.body, token: maskToken(token) };
    new ResponseErrorService(response).send(error);
  }
}
