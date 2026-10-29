import { describe, expect, it, vi } from "vitest";
import type { NextFunction, Request, Response } from "express";
import { createApp, handleError } from "@/app";
import { AppModule } from "@/shared/interfaces/AppModule";
import { fakeResponse, unitLogger } from "../support/fakes";

const { app, use, json, corsMiddleware } = vi.hoisted(() => {
  const use = vi.fn();
  return {
    use,
    app: { use },
    json: vi.fn(() => "json-middleware"),
    corsMiddleware: "cors-middleware",
  };
});

vi.mock("express", () => ({
  default: Object.assign(
    vi.fn(() => app),
    { json }
  ),
}));
vi.mock("cors", () => ({ default: vi.fn(() => corsMiddleware) }));
vi.mock("@/modules", () => ({ createModules: vi.fn(() => []) }));

describe("createApp", () => {
  it("mounts json, cors, the request log, the API token guard, every module router in module order and the error handler", () => {
    const router = (path: string) => ({
      path,
      build: () => ({ router: `${path}-router` }),
    });
    const modules = [
      { routers: [router("/a"), router("/b")] },
      { crons: [] },
      { routers: [router("/c")] },
    ];

    expect(createApp(modules as unknown as AppModule[])).toBe(app);
    expect(use.mock.calls).toEqual([
      ["json-middleware"],
      ["cors-middleware"],
      [expect.any(Function)],
      [expect.any(Function)],
      ["/a", "/a-router"],
      ["/b", "/b-router"],
      ["/c", "/c-router"],
      [handleError],
    ]);
    expect(json).toHaveBeenCalledWith({ limit: "5mb" });
  });

  it("uses the default module list when none is given", () => {
    createApp();

    expect(use.mock.calls).toEqual([
      ["json-middleware"],
      ["cors-middleware"],
      [expect.any(Function)],
      [expect.any(Function)],
      [handleError],
    ]);
  });
});

describe("handleError", () => {
  it("answers with the error status and logs it", () => {
    const { response, status, send } = fakeResponse();
    const next = vi.fn();
    const error = Object.assign(new SyntaxError("Unexpected token"), { status: 400 });

    handleError(error, {} as Request, response, next as NextFunction);

    expect(status).toHaveBeenCalledWith(400);
    expect(send).toHaveBeenCalledWith("Unexpected token");
    expect(unitLogger().warn).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it("passes the error on when the response was already sent", () => {
    const response = { headersSent: true } as Response;
    const next = vi.fn();
    const error = new Error("late");

    handleError(error, {} as Request, response, next as NextFunction);

    expect(next).toHaveBeenCalledWith(error);
  });
});
