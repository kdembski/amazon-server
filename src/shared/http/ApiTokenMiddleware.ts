import { NextFunction, Request, Response } from "express";
import { ResponseErrorService } from "@/shared/http/ResponseErrorService";

export class InvalidApiTokenError extends Error {
  status = 401;

  constructor() {
    super("Invalid API token");
    this.name = "InvalidApiTokenError";
  }
}

export class ApiTokenMiddleware {
  private token;

  constructor(token = process.env.API_TOKEN) {
    this.token = token;
  }

  handle = (request: Request, response: Response, next: NextFunction) => {
    if (this.token && request.header("Authorization") === `Bearer ${this.token}`) {
      return next();
    }
    new ResponseErrorService(response).send(new InvalidApiTokenError());
  };
}
