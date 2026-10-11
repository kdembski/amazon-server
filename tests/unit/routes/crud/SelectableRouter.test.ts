import { describe, expect, it, vi } from "vitest";
import { SelectableRouter } from "@/routes/crud/SelectableRouter";
import { fakeRouter } from "../../../support/fakes";

describe("SelectableRouter", () => {
  it("registers GET /:id delegating to controller.getById", () => {
    const controller = { getById: vi.fn() };
    const { router, calls } = fakeRouter();

    const built = new SelectableRouter(controller, router).build();

    expect(built.router).toBe(router);
    expect(calls).toEqual([
      { method: "get", path: "/:id", handler: expect.any(Function) },
    ]);
    (calls[0].handler as Function)("req", "res");
    expect(controller.getById).toHaveBeenCalledWith("req", "res");
  });
});
