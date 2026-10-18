import { describe, expect, it, vi } from "vitest";
import { SelectableController } from "@/shared/crud/controllers/SelectableController";
import { fakeRequest, fakeResponse } from "../../../../support/fakes";

describe("SelectableController", () => {
  it("parses the id and returns the item as json", async () => {
    const getById = vi.fn().mockResolvedValue({ id: 7 });
    const { response, json } = fakeResponse();

    await new SelectableController({ getById }).getById(
      fakeRequest({ params: { id: "7" } }),
      response
    );

    expect(getById).toHaveBeenCalledWith(7);
    expect(json).toHaveBeenCalledWith({ id: 7 });
  });

  it("sends an error response when the service throws", async () => {
    const getById = vi.fn().mockRejectedValue(new Error("missing"));
    const { response, status, send, json } = fakeResponse();

    await new SelectableController({ getById }).getById(
      fakeRequest({ params: { id: "7" } }),
      response
    );

    expect(status).toHaveBeenCalledWith(500);
    expect(send).toHaveBeenCalledWith("missing");
    expect(json).not.toHaveBeenCalled();
  });
});
