import { describe, expect, it, vi } from "vitest";
import { BusinessLogService } from "@/modules/monitoring/services/BusinessLogService";
import { BusinessLogRepository } from "@/modules/monitoring/repositories/BusinessLogRepository";

const setup = () => {
  const repository = {
    getCount: vi.fn().mockResolvedValue(0),
    deleteOlderThan: vi.fn().mockResolvedValue(3),
    create: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
  };
  const service = new BusinessLogService(repository as unknown as BusinessLogRepository);
  return { service, repository };
};

describe("BusinessLogService", () => {
  it("delegates getCount", async () => {
    const { service, repository } = setup();
    const from = new Date(1);
    const to = new Date(2);
    await service.getCount("country_outlier_sent", from, to, "2");
    expect(repository.getCount).toHaveBeenCalledWith(
      "country_outlier_sent",
      from,
      to,
      "2"
    );
  });

  it("delegates deleteOlderThan", async () => {
    const { service, repository } = setup();
    const date = new Date(1);

    expect(await service.deleteOlderThan(date)).toBe(3);
    expect(repository.deleteOlderThan).toHaveBeenCalledWith(date);
  });

  it("wires creatable and deletable to the repository", async () => {
    const { service, repository } = setup();
    await service.creatable.create({
      type: "ad_scraped",
      marketplace: "amazon",
      data: { asin: "B0X" },
    });
    await service.deletable.delete(1);
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "ad_scraped",
        marketplace: "amazon",
        data: { asin: "B0X" },
        createdAt: expect.any(Date),
      })
    );
    expect(repository.delete).toHaveBeenCalledWith(1);
  });
});
