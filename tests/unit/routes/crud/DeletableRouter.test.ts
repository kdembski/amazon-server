import { describe, expect, it, vi } from "vitest";
import { DeletableRouter } from "@/routes/crud/DeletableRouter";
import { fakeRouter } from "../../../support/fakes";

describe("DeletableRouter", () => {
  it("registers DELETE /:id delegating to controller.delete", () => {
    const controller = { delete: vi.fn() };
    const { router, calls } = fakeRouter();

    const built = new DeletableRouter(controller, router).build();

    expect(built.router).toBe(router);
    expect(calls).toEqual([
      { method: "delete", path: "/:id", handler: expect.any(Function) },
    ]);
    (calls[0].handler as Function)("req", "res");
    expect(controller.delete).toHaveBeenCalledWith("req", "res");
  });
});
