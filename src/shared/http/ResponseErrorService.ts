import { Response } from "express";
import { SystemLogService } from "@/shared/logging/services/SystemLogService";
import { isDatabaseUnavailable } from "@/shared/http/isDatabaseUnavailable";

export class ResponseErrorService {
  private response: Response;
  private logger;

  constructor(response: Response, logger = SystemLogService.getInstance()) {
    this.response = response;
    this.logger = logger;
  }

  send(error: any) {
    const status = this.getStatus(error);
    const message = this.getMessage(error);

    this.log(status, message, error);
    this.response.status(status).send(message);
  }

  private log(status: number, message: string | undefined, error: unknown) {
    const request = this.response.req;
    const target = request ? `${request.method} ${request.originalUrl}` : "Request";
    const context = {
      error,
      request: request && {
        method: request.method,
        path: request.originalUrl,
        params: request.params,
        query: request.query,
        body: request.body,
        status,
      },
    };
    const text = `${target} failed with ${status}: ${message}`;

    if (status >= 500) this.logger.error("ResponseErrorService", text, context);
    else this.logger.warn("ResponseErrorService", text, context);
  }

  private getMessage(error: any) {
    if (isDatabaseUnavailable(error)) return "Can't reach database server";

    switch (error?.code) {
      case "P2002":
        return `Unique constraint failed on the '${error?.meta?.driverAdapterError?.cause?.constraint?.index}'`;
      case undefined: {
        const message =
          typeof error?.message === "string" ? error.message : String(error);
        return message.split(/\r?\n/).pop();
      }
      default:
        return error?.code + "::\n\n" + JSON.stringify(error?.meta, null, 2);
    }
  }

  private getStatus(error: any): number {
    if (typeof error?.status === "number") return error.status;
    if (isDatabaseUnavailable(error)) return 503;

    switch (error?.code) {
      case "P2002":
      case "P2003":
        return 422;
      default:
        return 500;
    }
  }
}
