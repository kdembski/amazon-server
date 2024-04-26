import { Response } from "express";

export class ResponseErrorService {
  private response: Response;

  constructor(response: Response) {
    this.response = response;
  }

  send(error: any) {
    this.response.status(this.getStatus(error)).send(this.getMessage(error));
  }

  private getMessage(error: any) {
    switch (error?.code) {
      case "P2002":
        return `Unique constraint failed on the '${error?.meta?.target}'`;
      default:
        return `Unknown error code: ${error?.code}`;
    }
  }

  private getStatus(error: any) {
    switch (error?.code) {
      case "P2002":
        return 422;
      default:
        return 500;
    }
  }
}
