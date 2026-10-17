import { describe, expect, it, vi } from "vitest";
import { ScraperStatusController } from "@/controllers/ScraperStatusController";
import { ScraperStatusService } from "@/services/ScraperStatusService";
import { fakeRequest, fakeResponse } from "../../support/fakes";

const setup = () => {
  const service = { setStatus: vi.fn() };
  return {
    service,
    controller: new ScraperStatusController(
      service as unknown as ScraperStatusService
    ),
  };
};

describe("ScraperStatusController", () => {
  it("setStatus stores the dto under the scraper name and echoes it", async () => {
    const { service, controller } = setup();
    const { response, json } = fakeResponse();
    const dto = { speed: 1, pending: 2 };

    await controller.setStatus(
      fakeRequest({ params: { name: "pdp-1" }, body: dto }),
      response
    );

    expect(service.setStatus).toHaveBeenCalledWith("pdp-1", dto);
    expect(json).toHaveBeenCalledWith(dto);
  });

  it("sends an error response when the service throws", async () => {
    const { service, controller } = setup();
    service.setStatus.mockImplementation(() => {
      throw new Error("a");
    });
    const { response, status, send, json } = fakeResponse();

    await controller.setStatus(
      fakeRequest({ params: { name: "x" }, body: {} }),
      response
    );

    expect(status).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith("a");
    expect(json).not.toHaveBeenCalled();
  });
});
