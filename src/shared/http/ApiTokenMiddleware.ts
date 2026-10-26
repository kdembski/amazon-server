import { NextFunction, Request, Response } from "express";

export class ApiTokenMiddleware {
  private token;

  constructor(token = process.env.API_TOKEN) {
    this.token = token;
  }

  // Rejections are not logged: unauthenticated traffic on the public port would flood SystemLog.
  handle = (request: Request, response: Response, next: NextFunction) => {
    if (this.token && request.header("Authorization") === `Bearer ${this.token}`) {
      return next();
    }
    response.status(401).send("Invalid API token");
  };
}
