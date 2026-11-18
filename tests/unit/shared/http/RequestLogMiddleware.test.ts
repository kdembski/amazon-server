import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { RequestLogMiddleware } from "@/shared/http/RequestLogMiddleware";
import { fakeSystemLogService } from "../../../support/fakes";

const setup = () => {
  const logger = fakeSystemLogService();
  const middleware = new RequestLogMiddleware(
    [{ method: "PUT", path: /^\/amazon\/ads\/\d+$/ }],
    logger.service
  );
  return { logger, middleware };
};

const call = (
  middleware: RequestLogMiddleware,
  method: string,
  path: string,
  statusCode = 200,
  durationMs = 12
) => {
  const request = {
    method,
    path,
    originalUrl: `${path}?dry=1`,
    query: { dry: "1" },
    body: { value: "sony" },
  } as unknown as Request;
  const response = Object.assign(new EventEmitter(), { statusCode });
  const next = vi.fn();

  middleware.handle(request, response as unknown as Response, next);
  vi.advanceTimersByTime(durationMs);
  response.emit("finish");

  return next;
};

describe("RequestLogMiddleware", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("logs a successful write with the request", () => {
    const { logger, middleware } = setup();

    const next = call(middleware, "POST", "/amazon/exclusion-rules", 201);

    expect(next).toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(
      "RequestLogMiddleware",
      "POST /amazon/exclusion-rules?dry=1 201",
      {
        request: {
          method: "POST",
          path: "/amazon/exclusion-rules?dry=1",
          query: { dry: "1" },
          body: { value: "sony" },
          status: 201,
          durationMs: 12,
        },
      }
    );
  });

  it.each(["PUT", "PATCH", "DELETE"])("logs %s", (method) => {
    const { logger, middleware } = setup();

    call(middleware, method, "/amazon/countries/1");

    expect(logger.info).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["GET", "/amazon/ads"],
    ["OPTIONS", "/amazon/ads"],
    ["PUT", "/amazon/ads/5"],
  ])("skips %s %s", (method, path) => {
    const { logger, middleware } = setup();

    const next = call(middleware, method, path);

    expect(next).toHaveBeenCalled();
    expect(logger.info).not.toHaveBeenCalled();
  });

  it("skips failed requests", () => {
    const { logger, middleware } = setup();

    call(middleware, "POST", "/amazon/exclusion-rules", 400);

    expect(logger.info).not.toHaveBeenCalled();
  });

  it("skips no route by default", () => {
    const logger = fakeSystemLogService();
    const middleware = new RequestLogMiddleware(undefined, logger.service);

    call(middleware, "PUT", "/amazon/ads/5");

    expect(logger.info).toHaveBeenCalledTimes(1);
  });

  it("warns about a slow request of any method, at most once a minute", () => {
    const { logger, middleware } = setup();

    call(middleware, "GET", "/stats", 200, 5_000);
    call(middleware, "PUT", "/amazon/ads/5", 200, 6_000);

    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith("RequestLogMiddleware", "GET /stats?dry=1 took 5000 ms", {
      request: { method: "GET", path: "/stats?dry=1", query: { dry: "1" }, status: 200, durationMs: 5_000 },
    });
    expect(logger.info).not.toHaveBeenCalled();

    vi.advanceTimersByTime(60_000);
    call(middleware, "GET", "/stats", 200, 5_000);
    expect(logger.warn).toHaveBeenCalledTimes(2);
  });

  it("does not warn about a fast request", () => {
    const { logger, middleware } = setup();

    call(middleware, "GET", "/stats", 200, 4_999);

    expect(logger.warn).not.toHaveBeenCalled();
  });
});
