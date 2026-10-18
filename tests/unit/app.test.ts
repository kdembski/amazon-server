import { describe, expect, it, vi } from "vitest";
import { createApp } from "@/app";
import { AppModule } from "@/shared/interfaces/AppModule";

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
  it("mounts json, cors and every module router under its path, in module order", () => {
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
      ["/a", "/a-router"],
      ["/b", "/b-router"],
      ["/c", "/c-router"],
    ]);
  });

  it("uses the default module list when none is given", () => {
    createApp();

    expect(use.mock.calls).toEqual([["json-middleware"], ["cors-middleware"]]);
  });
});
