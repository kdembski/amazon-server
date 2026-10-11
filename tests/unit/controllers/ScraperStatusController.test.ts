import { describe, expect, it, vi } from "vitest";
import { ScraperStatusController } from "@/controllers/ScraperStatusController";
import { ScraperStatusService } from "@/services/ScraperStatusService";
import { fakeRequest, fakeResponse } from "../../support/fakes";

const setup = () => {
  const service = {
    setStatus: vi.fn(),
    getCpuUsage: vi.fn().mockReturnValue(12),
    getCount: vi.fn().mockReturnValue(3),
  };
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

  it("getCpuUsage and getCount return json", async () => {
    const { service, controller } = setup();
    const { response, json } = fakeResponse();

    await controller.getCpuUsage(fakeRequest({ params: { name: "pdp-1" } }), response);
    await controller.getCount(response);

    expect(service.getCpuUsage).toHaveBeenCalledWith("pdp-1");
    expect(json).toHaveBeenNthCalledWith(1, 12);
    expect(json).toHaveBeenNthCalledWith(2, 3);
  });

  it("sends error responses when the service throws", async () => {
    const { service, controller } = setup();
    service.setStatus.mockImplementation(() => {
      throw new Error("a");
    });
    service.getCpuUsage.mockImplementation(() => {
      throw new Error("b");
    });
    service.getCount.mockImplementation(() => {
      throw new Error("c");
    });
    const { response, status, send, json } = fakeResponse();

    await controller.setStatus(
      fakeRequest({ params: { name: "x" }, body: {} }),
      response
    );
    await controller.getCpuUsage(fakeRequest({ params: { name: "x" } }), response);
    await controller.getCount(response);

    expect(status).toHaveBeenCalledTimes(3);
    expect(send.mock.calls.map(([m]) => m)).toEqual(["a", "b", "c"]);
    expect(json).not.toHaveBeenCalled();
  });
});
