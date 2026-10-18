import { describe, expect, it, vi } from "vitest";
import { LogService } from "@/services/LogService";
import { LogRepository } from "@/repositories/LogRepository";

const setup = () => {
  const repository = {
    getCountByEvent: vi.fn().mockResolvedValue(0),
    deleteOlderThan: vi.fn().mockResolvedValue(3),
    create: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
  };
  const service = new LogService(repository as unknown as LogRepository);
  return { service, repository };
};

describe("LogService", () => {
  it("delegates getCountByEvent", async () => {
    const { service, repository } = setup();
    const from = new Date(1);
    const to = new Date(2);
    await service.getCountByEvent("ad_scraped", from, to);
    expect(repository.getCountByEvent).toHaveBeenCalledWith(
      "ad_scraped",
      from,
      to
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
    await service.creatable.create({ event: "x" });
    await service.deletable.delete(1);
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ event: "x", createdAt: expect.any(Date) })
    );
    expect(repository.delete).toHaveBeenCalledWith(1);
  });
});
