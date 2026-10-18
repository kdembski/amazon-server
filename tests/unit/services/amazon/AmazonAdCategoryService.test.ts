import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AmazonAdCategoryService } from "@/services/amazon/AmazonAdCategoryService";
import { AmazonAdCategoryRepository } from "@/repositories/amazon/AmazonAdCategoryRepository";
import { buildCategory } from "../../../support/factories";
import { deferred } from "../../../support/fakes";

type Category = ReturnType<typeof buildCategory>;

const setup = () => {
  const repository = {
    getById: vi.fn(),
    getAll: vi.fn().mockResolvedValue([]),
    getForScraping: vi.fn().mockResolvedValue(buildCategory()),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
  };
  const service = new AmazonAdCategoryService(
    repository as unknown as AmazonAdCategoryRepository
  );
  return { service, repository };
};

describe("AmazonAdCategoryService", () => {
  it("delegates getAll", async () => {
    const { service, repository } = setup();

    await service.getAll();

    expect(repository.getAll).toHaveBeenCalled();
  });

  it("wires creatable, updatable and deletable to the repository", async () => {
    const { service, repository } = setup();

    await service.creatable.create({ name: "tools" });
    await service.updatable.update(2, { name: "garden" });
    await service.deletable.delete(4);

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: "tools", createdAt: expect.any(Date) })
    );
    expect(repository.update).toHaveBeenCalledWith(
      2,
      expect.objectContaining({ name: "garden", updatedAt: expect.any(Date) })
    );
    expect(repository.delete).toHaveBeenCalledWith(4);
  });

  describe("getForScraping", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-05-05T00:00:00Z"));
    });
    afterEach(() => {
      vi.useRealTimers();
      // A failed assertion before the lock is released would otherwise
      // cascade into every later test in this file.
      (
        AmazonAdCategoryService as unknown as { isGetting: boolean }
      ).isGetting = false;
    });

    it("returns the oldest-scraped category and stamps scrapedAt", async () => {
      const { service, repository } = setup();
      const category = buildCategory({ id: 8 });
      repository.getForScraping.mockResolvedValue(category);

      const result = await service.getForScraping();

      expect(result).toBe(category);
      expect(repository.update).toHaveBeenCalledWith(8, {
        scrapedAt: new Date("2026-05-05T00:00:00Z"),
      });
    });

    it("delays a concurrent call by one second while another is in flight", async () => {
      const { service, repository } = setup();
      const first = deferred<Category>();
      repository.getForScraping
        .mockReturnValueOnce(first.promise)
        .mockResolvedValue(buildCategory());

      const call1 = service.getForScraping();
      const call2 = service.getForScraping();
      await vi.advanceTimersByTimeAsync(0);
      expect(repository.getForScraping).toHaveBeenCalledTimes(1);

      first.resolve(buildCategory());
      await call1;
      await vi.advanceTimersByTimeAsync(999);
      expect(repository.getForScraping).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(1);
      await call2;
      expect(repository.getForScraping).toHaveBeenCalledTimes(2);
    });

    it("resets the lock when fetching throws so the next call can proceed", async () => {
      const { service, repository } = setup();
      repository.getForScraping
        .mockRejectedValueOnce(new Error("db down"))
        .mockResolvedValue(buildCategory());

      await expect(service.getForScraping()).rejects.toThrow("db down");

      const next = service.getForScraping();
      await vi.advanceTimersByTimeAsync(0);
      expect(repository.getForScraping).toHaveBeenCalledTimes(2);
      await next;
    });

    it("keeps waiting while the first call is still in flight after one second", async () => {
      const { service, repository } = setup();
      const first = deferred<Category>();
      repository.getForScraping
        .mockReturnValueOnce(first.promise)
        .mockResolvedValue(buildCategory());

      const call1 = service.getForScraping();
      const call2 = service.getForScraping();
      await vi.advanceTimersByTimeAsync(1000);
      expect(repository.getForScraping).toHaveBeenCalledTimes(1);

      first.resolve(buildCategory());
      await call1;
      await vi.advanceTimersByTimeAsync(1000);
      await call2;
      expect(repository.getForScraping).toHaveBeenCalledTimes(2);
    });
  });
});
