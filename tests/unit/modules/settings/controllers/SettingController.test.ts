import { describe, expect, it } from "vitest";
import { SettingController } from "@/modules/settings/controllers/SettingController";
import { fakeRequest, fakeResponse, fakeSettingService } from "../../../../support/fakes";

const setup = () => {
  const fake = fakeSettingService();
  return { ...fake, controller: new SettingController(fake.service) };
};

const invalid = () => Object.assign(new Error("bad"), { status: 400 });

describe("SettingController", () => {
  it("getAll answers every setting", async () => {
    const { controller, getAll } = setup();
    getAll.mockResolvedValue([{ key: "a" }]);
    const { response, json } = fakeResponse();

    await controller.getAll(response);

    expect(json).toHaveBeenCalledWith([{ key: "a" }]);
  });

  it("getAll sends the error status", async () => {
    const { controller, getAll } = setup();
    getAll.mockRejectedValue(invalid());
    const { response, status, send } = fakeResponse();

    await controller.getAll(response);

    expect(status).toHaveBeenCalledWith(400);
    expect(send).toHaveBeenCalledWith("bad");
  });

  it("set passes the key and the value of the body", async () => {
    const { controller, set } = setup();
    set.mockResolvedValue({ key: "priceDrop.dropPercent", value: 40 });
    const { response, json } = fakeResponse();

    await controller.set(
      fakeRequest({ params: { key: "priceDrop.dropPercent" }, body: { value: 40 } }),
      response
    );

    expect(set).toHaveBeenCalledWith("priceDrop.dropPercent", 40);
    expect(json).toHaveBeenCalledWith({ key: "priceDrop.dropPercent", value: 40 });
  });

  it("set passes undefined without a body", async () => {
    const { controller, set } = setup();
    set.mockRejectedValue(invalid());
    const { response, status } = fakeResponse();

    await controller.set(fakeRequest({ params: { key: "priceDrop.dropPercent" } }), response);

    expect(set).toHaveBeenCalledWith("priceDrop.dropPercent", undefined);
    expect(status).toHaveBeenCalledWith(400);
  });
});
