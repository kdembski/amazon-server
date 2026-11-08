import { Request, Response } from "express";
import { DiscordChannelService, maskToken } from "@/modules/settings/services/DiscordChannelService";
import { ResponseErrorService } from "@/shared/http/ResponseErrorService";
import { respond } from "@/shared/http/respond";

export class DiscordChannelController {
  private service;

  constructor(service = new DiscordChannelService()) {
    this.service = service;
  }

  getAll(response: Response) {
    return respond(response, () => this.service.getAll());
  }

  create(request: Request, response: Response) {
    return respond(
      response,
      () => this.service.create(request.body),
      (error) => this.sendError(request, response, error)
    );
  }

  update(request: Request<{ id: string }>, response: Response) {
    return respond(
      response,
      () => this.service.update(parseInt(request.params.id), request.body),
      (error) => this.sendError(request, response, error)
    );
  }

  delete(request: Request<{ id: string }>, response: Response) {
    return respond(response, () => this.service.delete(parseInt(request.params.id)));
  }

  // ResponseErrorService logs the request body.
  private sendError(request: Request, response: Response, error: unknown) {
    const { token } = request.body ?? {};
    if (typeof token === "string") request.body = { ...request.body, token: maskToken(token) };
    new ResponseErrorService(response).send(error);
  }
}
