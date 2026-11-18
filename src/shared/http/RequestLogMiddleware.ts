import { NextFunction, Request, Response } from "express";
import { LogThrottle } from "@/shared/logging/services/LogThrottle";
import { SystemLogService } from "@/shared/logging/services/SystemLogService";

export interface SkippedRoute {
  method: string;
  path: RegExp;
}

const LOGGED_METHODS = ["POST", "PUT", "PATCH", "DELETE"];
const SLOW_REQUEST_MS = 5_000;
const SLOW_WARNING_INTERVAL_MS = 60_000;

// Logs successful writes and slow requests of any method; failed requests are logged by ResponseErrorService.
export class RequestLogMiddleware {
  private skipped;
  private logger;
  private slowThrottle;

  constructor(
    skipped: SkippedRoute[] = [],
    logger = SystemLogService.getInstance(),
    slowThrottle = new LogThrottle(SLOW_WARNING_INTERVAL_MS)
  ) {
    this.skipped = skipped;
    this.logger = logger;
    this.slowThrottle = slowThrottle;
  }

  handle = (request: Request, response: Response, next: NextFunction) => {
    const startedAt = Date.now();
    const logged = this.isLogged(request);
    response.on("finish", () => this.log(request, response, logged, Date.now() - startedAt));
    next();
  };

  private isLogged({ method, path }: Request) {
    return (
      LOGGED_METHODS.includes(method) &&
      !this.skipped.some((route) => route.method === method && route.path.test(path))
    );
  }

  private log(request: Request, response: Response, logged: boolean, durationMs: number) {
    const { method, originalUrl, query, body } = request;
    const status = response.statusCode;

    if (durationMs >= SLOW_REQUEST_MS && this.slowThrottle.shouldLog()) {
      this.logger.warn("RequestLogMiddleware", `${method} ${originalUrl} took ${durationMs} ms`, {
        request: { method, path: originalUrl, query, status, durationMs },
      });
    }
    if (!logged || status >= 400) return;

    this.logger.info("RequestLogMiddleware", `${method} ${originalUrl} ${status}`, {
      request: {
        method,
        path: originalUrl,
        query,
        body,
        status,
        durationMs,
      },
    });
  }
}
