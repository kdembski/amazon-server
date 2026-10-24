import { describe, expect, it } from "vitest";
import { ScraperConfigController } from "@/modules/monitoring/controllers/ScraperConfigController";
import {
  fakeRequest,
  fakeResponse,
  fakeScraperConfigService,
} from "../../../../support/fakes";

const setup = () => {
  const fake = fakeScraperConfigService();
  return { ...fake, controller: new ScraperConfigController(fake.service) };
};

describe("ScraperConfigController", () => {
  it("getConfig returns the config of the scraper", async () => {
    const { controller, get } = setup();
    get.mockResolvedValue({ concurrency: 150, rps: 150, batchSize: 5000 });
    const { response, json } = fakeResponse();

    await controller.getConfig(
      fakeRequest({ params: { name: "amazon-pdp-1" } }),
      response
    );

    expect(get).toHaveBeenCalledWith("amazon-pdp-1");
    expect(json).toHaveBeenCalledWith({ concurrency: 150, rps: 150, batchSize: 5000 });
  });

  it.each([
    ["empty", ""],
    ["64 character", "n".repeat(64)],
  ])("answers 400 for an %s scraper name", async (_label, name) => {
    const { controller, get } = setup();
    const { response, status, send } = fakeResponse();

    await controller.getConfig(fakeRequest({ params: { name } }), response);

    expect(status).toHaveBeenCalledWith(400);
    expect(send).toHaveBeenCalledWith(expect.stringContaining("1-63"));
    expect(get).not.toHaveBeenCalled();
  });

  it("sends an error response when the service throws", async () => {
    const { controller, get } = setup();
    get.mockRejectedValue(new Error("a"));
    const { response, status, send } = fakeResponse();

    await controller.getConfig(
      fakeRequest({ params: { name: "amazon-pdp-1" } }),
      response
    );

    expect(status).toHaveBeenCalledWith(500);
    expect(send).toHaveBeenCalledWith("a");
  });
});
