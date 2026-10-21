import { NextFunction, Request, Response } from "express";
import { SystemLogService } from "@/shared/logging/services/SystemLogService";

export interface SkippedRoute {
  method: string;
  path: RegExp;
}

const LOGGED_METHODS = ["POST", "PUT", "PATCH", "DELETE"];

// Logs successful writes; failed requests are logged by ResponseErrorService.
export class RequestLogMiddleware {
  private skipped;
  private logger;

  constructor(skipped: SkippedRoute[] = [], logger = SystemLogService.getInstance()) {
    this.skipped = skipped;
    this.logger = logger;
  }

  handle = (request: Request, response: Response, next: NextFunction) => {
    if (this.isLogged(request)) {
      const startedAt = Date.now();
      response.on("finish", () => this.log(request, response, startedAt));
    }
    next();
  };

  private isLogged({ method, path }: Request) {
    return (
      LOGGED_METHODS.includes(method) &&
      !this.skipped.some((route) => route.method === method && route.path.test(path))
    );
  }

  private log(request: Request, response: Response, startedAt: number) {
    const { method, originalUrl, query, body } = request;
    const status = response.statusCode;
    if (status >= 400) return;

    this.logger.info("RequestLogMiddleware", `${method} ${originalUrl} ${status}`, {
      request: {
        method,
        path: originalUrl,
        query,
        body,
        status,
        durationMs: Date.now() - startedAt,
      },
    });
  }
}
