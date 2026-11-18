import { describe, expect, it, vi } from "vitest";
import { ScraperConfigService } from "@/modules/monitoring/services/ScraperConfigService";
import type { ScraperConfigRepository } from "@/modules/monitoring/repositories/ScraperConfigRepository";
import { unitLogger } from "../../../../support/fakes";

const config = { concurrency: 10, rps: 0, batchSize: 50 };

const setup = (existing: typeof config | null) => {
  const get = vi.fn().mockResolvedValue(existing);
  const getOrCreate = vi.fn().mockResolvedValue(config);
  const service = new ScraperConfigService({ get, getOrCreate } as unknown as ScraperConfigRepository);
  return { service, get, getOrCreate };
};

describe("ScraperConfigService", () => {
  it("get returns the existing config", async () => {
    const { service, get, getOrCreate } = setup(config);

    expect(await service.get("amazon-1")).toEqual(config);
    expect(get).toHaveBeenCalledWith("amazon-1");
    expect(getOrCreate).not.toHaveBeenCalled();
    expect(unitLogger().info).not.toHaveBeenCalled();
  });

  it("get creates and logs the config of a new scraper", async () => {
    const { service, getOrCreate } = setup(null);

    expect(await service.get("amazon-new")).toEqual(config);
    expect(getOrCreate).toHaveBeenCalledWith("amazon-new");
    expect(unitLogger().info).toHaveBeenCalledWith(
      "ScraperConfigService",
      "Scraper amazon-new registered with the default config",
      { scraper: "amazon-new", config }
    );
  });
});
