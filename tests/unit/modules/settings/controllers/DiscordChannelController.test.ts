import { describe, expect, it } from "vitest";
import { DiscordChannelController } from "@/modules/settings/controllers/DiscordChannelController";
import { fakeDiscordChannelService, fakeRequest, fakeResponse } from "../../../../support/fakes";

const setup = () => {
  const fake = fakeDiscordChannelService();
  return { ...fake, controller: new DiscordChannelController(fake.service) };
};

const invalid = () => Object.assign(new Error("bad"), { status: 400 });

describe("DiscordChannelController", () => {
  it("getAll answers the channels", async () => {
    const { controller, getAll } = setup();
    getAll.mockResolvedValue([{ id: 1 }]);
    const { response, json } = fakeResponse();

    await controller.getAll(response);

    expect(json).toHaveBeenCalledWith([{ id: 1 }]);
  });

  it("create passes the body", async () => {
    const { controller, create } = setup();
    create.mockResolvedValue({ id: 8 });
    const { response, json } = fakeResponse();
    const body = { name: "outlier", token: "1/abcdef" };

    await controller.create(fakeRequest({ body }), response);

    expect(create).toHaveBeenCalledWith(body);
    expect(json).toHaveBeenCalledWith({ id: 8 });
  });

  it("update passes the id and the body", async () => {
    const { controller, update } = setup();
    update.mockResolvedValue({ id: 2 });
    const { response, json } = fakeResponse();

    await controller.update(fakeRequest({ params: { id: "2" }, body: { name: "x" } }), response);

    expect(update).toHaveBeenCalledWith(2, { name: "x" });
    expect(json).toHaveBeenCalledWith({ id: 2 });
  });

  it("delete passes the id", async () => {
    const { controller, delete: remove } = setup();
    remove.mockResolvedValue({ id: 3 });
    const { response, json } = fakeResponse();

    await controller.delete(fakeRequest({ params: { id: "3" } }), response);

    expect(remove).toHaveBeenCalledWith(3);
    expect(json).toHaveBeenCalledWith({ id: 3 });
  });

  it("masks the token of the body before the error is logged", async () => {
    const { controller, create, update } = setup();
    create.mockRejectedValue(invalid());
    update.mockRejectedValue(invalid());
    const created = fakeRequest({ body: { name: "x", token: "1/abcdef" } });
    const updated = fakeRequest({ params: { id: "2" }, body: { name: "x" } });
    const { response, status } = fakeResponse();

    await controller.create(created, response);
    await controller.update(updated, response);

    expect(created.body).toEqual({ name: "x", token: "…cdef" });
    expect(updated.body).toEqual({ name: "x" });
    expect(status).toHaveBeenCalledWith(400);
  });

  it("sends the error status of getAll and delete", async () => {
    const { controller, getAll, delete: remove } = setup();
    getAll.mockRejectedValue(invalid());
    remove.mockRejectedValue(Object.assign(new Error("used"), { status: 422 }));
    const { response, status } = fakeResponse();

    await controller.getAll(response);
    await controller.delete(fakeRequest({ params: { id: "3" } }), response);

    expect(status.mock.calls).toEqual([[400], [422]]);
  });

  it("answers an error for a request without a body", async () => {
    const { controller, create } = setup();
    create.mockRejectedValue(invalid());
    const { response, status } = fakeResponse();

    await controller.create(fakeRequest(), response);

    expect(status).toHaveBeenCalledWith(400);
  });
});
