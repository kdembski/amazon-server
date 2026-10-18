import { describe, expect, it, vi } from "vitest";
import { DeletableController } from "@/shared/crud/controllers/DeletableController";
import { fakeRequest, fakeResponse } from "../../../../support/fakes";

describe("DeletableController", () => {
  it("parses the id and deletes", async () => {
    const del = vi.fn().mockResolvedValue({ id: 4 });
    const { response, json } = fakeResponse();

    await new DeletableController({ delete: del }).delete(
      fakeRequest({ params: { id: "4" } }),
      response
    );

    expect(del).toHaveBeenCalledWith(4);
    expect(json).toHaveBeenCalledWith({ id: 4 });
  });

  it("sends an error response when the service throws", async () => {
    const del = vi.fn().mockRejectedValue(new Error("nope"));
    const { response, status, send, json } = fakeResponse();

    await new DeletableController({ delete: del }).delete(
      fakeRequest({ params: { id: "4" } }),
      response
    );

    expect(status).toHaveBeenCalledWith(500);
    expect(send).toHaveBeenCalledWith("nope");
    expect(json).not.toHaveBeenCalled();
  });
});
