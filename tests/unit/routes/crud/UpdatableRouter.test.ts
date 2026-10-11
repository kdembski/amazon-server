import { describe, expect, it, vi } from "vitest";
import { UpdatableRouter } from "@/routes/crud/UpdatableRouter";
import { fakeRouter } from "../../../support/fakes";

describe("UpdatableRouter", () => {
  it("registers PUT /:id delegating to controller.update", () => {
    const controller = { update: vi.fn() };
    const { router, calls } = fakeRouter();

    const built = new UpdatableRouter(controller, router).build();

    expect(built.router).toBe(router);
    expect(calls).toEqual([
      { method: "put", path: "/:id", handler: expect.any(Function) },
    ]);
    (calls[0].handler as Function)("req", "res");
    expect(controller.update).toHaveBeenCalledWith("req", "res");
  });
});
