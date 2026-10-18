import { describe, expect, it, vi } from "vitest";
import { ActivityEventService } from "@/modules/monitoring/services/ActivityEventService";
import { ActivityEventRepository } from "@/modules/monitoring/repositories/ActivityEventRepository";

const setup = () => {
  const repository = {
    getCount: vi.fn().mockResolvedValue(0),
    deleteOlderThan: vi.fn().mockResolvedValue(3),
    create: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
  };
  const service = new ActivityEventService(repository as unknown as ActivityEventRepository);
  return { service, repository };
};

describe("ActivityEventService", () => {
  it("delegates getCount", async () => {
    const { service, repository } = setup();
    const from = new Date(1);
    const to = new Date(2);
    await service.getCount("conversion_error_sent", from, to, "2");
    expect(repository.getCount).toHaveBeenCalledWith(
      "conversion_error_sent",
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
