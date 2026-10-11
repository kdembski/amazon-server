import { describe, expect, it, vi } from "vitest";
import { SystemController } from "@/controllers/SystemController";
import { SystemService } from "@/services/SystemService";
import { fakeResponse } from "../../support/fakes";

const setup = () => {
  const service = {
    getCpuUsage: vi.fn().mockReturnValue(10),
    getMemoryUsage: vi.fn().mockResolvedValue(40),
  };
  return {
    service,
    controller: new SystemController(service as unknown as SystemService),
  };
};

describe("SystemController", () => {
  it("returns cpu and memory usage as json", async () => {
    const { controller } = setup();
    const { response, json } = fakeResponse();

    await controller.getCpuUsage(response);
    await controller.getMemoryUsage(response);

    expect(json).toHaveBeenNthCalledWith(1, 10);
    expect(json).toHaveBeenNthCalledWith(2, 40);
  });

  it("sends error responses when the service throws", async () => {
    const { service, controller } = setup();
    service.getCpuUsage.mockImplementation(() => {
      throw new Error("a");
    });
    service.getMemoryUsage.mockRejectedValue(new Error("b"));
    const { response, status, send, json } = fakeResponse();

    await controller.getCpuUsage(response);
    await controller.getMemoryUsage(response);

    expect(status).toHaveBeenCalledTimes(2);
    expect(send.mock.calls.map(([m]) => m)).toEqual(["a", "b"]);
    expect(json).not.toHaveBeenCalled();
  });
});
