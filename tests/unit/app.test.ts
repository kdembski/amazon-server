import { describe, expect, it, vi } from "vitest";
import { createApp } from "@/app";

const { app, use, json, corsMiddleware, router } = vi.hoisted(() => {
  const use = vi.fn();
  return {
    use,
    app: { use },
    json: vi.fn(() => "json-middleware"),
    corsMiddleware: "cors-middleware",
    router: "api-router",
  };
});

vi.mock("express", () => ({
  default: Object.assign(
    vi.fn(() => app),
    { json }
  ),
}));
vi.mock("cors", () => ({ default: vi.fn(() => corsMiddleware) }));
vi.mock("@/routes", () => ({ useRouter: () => ({ router }) }));

describe("createApp", () => {
  it("mounts json, cors and the api router on a new express app, in that order", () => {
    expect(createApp()).toBe(app);

    expect(use.mock.calls).toEqual([
      ["json-middleware"],
      ["cors-middleware"],
      ["api-router"],
    ]);
  });
});
