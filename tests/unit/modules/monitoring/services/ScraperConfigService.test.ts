import { describe, expect, it, vi } from "vitest";
import { ScraperConfigService } from "@/modules/monitoring/services/ScraperConfigService";
import type { ScraperConfigRepository } from "@/modules/monitoring/repositories/ScraperConfigRepository";

describe("ScraperConfigService", () => {
  it("get returns the config from the repository", async () => {
    const config = { concurrency: 10, rps: 0, batchSize: 50 };
    const getOrCreate = vi.fn().mockResolvedValue(config);
    const service = new ScraperConfigService({
      getOrCreate,
    } as unknown as ScraperConfigRepository);

    expect(await service.get("amazon-new")).toEqual(config);
    expect(getOrCreate).toHaveBeenCalledWith("amazon-new");
  });
});
