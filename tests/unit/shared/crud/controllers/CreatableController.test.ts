import { describe, expect, it, vi } from "vitest";
import { CreatableController } from "@/shared/crud/controllers/CreatableController";
import { fakeRequest, fakeResponse } from "../../../../support/fakes";

const setup = () => {
  const service = {
    create: vi.fn().mockResolvedValue({ id: 1 }),
    createMany: vi.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]),
  };
  return { service, controller: new CreatableController(service) };
};

describe("CreatableController", () => {
  it("creates a single item from an object body", async () => {
    const { service, controller } = setup();
    const { response, json } = fakeResponse();

    await controller.create(fakeRequest({ body: { name: "a" } }), response);

    expect(service.create).toHaveBeenCalledWith({ name: "a" });
    expect(service.createMany).not.toHaveBeenCalled();
    expect(json).toHaveBeenCalledWith({ id: 1 });
  });

  it("creates many items from an array body", async () => {
    const { service, controller } = setup();
    const { response, json } = fakeResponse();

    await controller.create(
      fakeRequest({ body: [{ name: "a" }, { name: "b" }] }),
      response
    );

    expect(service.createMany).toHaveBeenCalledWith([{ name: "a" }, { name: "b" }]);
    expect(service.create).not.toHaveBeenCalled();
    expect(json).toHaveBeenCalledWith([{ id: 1 }, { id: 2 }]);
  });

  it("sends an error response when the service throws", async () => {
    const { service, controller } = setup();
    service.create.mockRejectedValue({ code: "P2002", meta: { target: "x" } });
    const { response, status, send, json } = fakeResponse();

    await controller.create(fakeRequest({ body: {} }), response);

    expect(status).toHaveBeenCalledWith(422);
    expect(send).toHaveBeenCalledWith("Unique constraint failed on the 'x'");
    expect(json).not.toHaveBeenCalled();
  });
});
