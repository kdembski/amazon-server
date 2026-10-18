import { describe, expect, it, vi } from "vitest";
import { CreatableRouter } from "@/shared/crud/routes/CreatableRouter";
import { fakeRouter } from "../../../../support/fakes";

describe("CreatableRouter", () => {
  it("registers POST / delegating to controller.create", () => {
    const controller = { create: vi.fn() };
    const { router, calls } = fakeRouter();

    const built = new CreatableRouter(controller, router).build();

    expect(built.router).toBe(router);
    expect(calls).toEqual([
      { method: "post", path: "/", handler: expect.any(Function) },
    ]);
    (calls[0].handler as Function)("req", "res");
    expect(controller.create).toHaveBeenCalledWith("req", "res");
  });
});
