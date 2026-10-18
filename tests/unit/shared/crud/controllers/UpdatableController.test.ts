import { describe, expect, it, vi } from "vitest";
import { UpdatableController } from "@/shared/crud/controllers/UpdatableController";
import { fakeRequest, fakeResponse } from "../../../../support/fakes";

describe("UpdatableController", () => {
  it("parses the id and updates with the body", async () => {
    const update = vi.fn().mockResolvedValue({ id: 3, name: "b" });
    const { response, json } = fakeResponse();

    await new UpdatableController({ update }).update(
      fakeRequest({ params: { id: "3" }, body: { name: "b" } }),
      response
    );

    expect(update).toHaveBeenCalledWith(3, { name: "b" });
    expect(json).toHaveBeenCalledWith({ id: 3, name: "b" });
  });

  it("sends an error response when the service throws", async () => {
    const update = vi.fn().mockRejectedValue(new Error("nope"));
    const { response, status, send, json } = fakeResponse();

    await new UpdatableController({ update }).update(
      fakeRequest({ params: { id: "3" }, body: {} }),
      response
    );

    expect(status).toHaveBeenCalledWith(500);
    expect(send).toHaveBeenCalledWith("nope");
    expect(json).not.toHaveBeenCalled();
  });
});
