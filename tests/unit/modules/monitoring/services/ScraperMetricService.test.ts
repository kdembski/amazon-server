import { describe, expect, it, vi } from "vitest";
import { ScraperMetricService } from "@/modules/monitoring/services/ScraperMetricService";
import { ScraperMetricRepository } from "@/modules/monitoring/repositories/ScraperMetricRepository";
import { ScraperMetricCreateMapper } from "@/modules/monitoring/mappers/ScraperMetricCreateMapper";

const setup = () => {
  const repository = {
    createMany: vi.fn().mockResolvedValue(2),
    deleteOlderThan: vi.fn().mockResolvedValue(7),
  };
  const mapper = {
    toCreateInputs: vi.fn().mockReturnValue([{ a: 1 }, { a: 2 }]),
  };
  return {
    repository,
    mapper,
    service: new ScraperMetricService(
      repository as unknown as ScraperMetricRepository,
      mapper as unknown as ScraperMetricCreateMapper
    ),
  };
};

const dto = (metrics: { metric: string; value: number }[]) => ({
  marketplace: "amazon",
  flow: "pdp",
  periodStart: "2026-10-18T10:00:00.000Z",
  metrics,
});

describe("ScraperMetricService", () => {
  it("add maps the dto and returns the stored count", async () => {
    const { service, repository, mapper } = setup();
    const body = dto([{ metric: "requests", value: 1 }]);

    expect(await service.add("amazon-pdp", body)).toBe(2);

    expect(mapper.toCreateInputs).toHaveBeenCalledWith("amazon-pdp", body);
    expect(repository.createMany).toHaveBeenCalledWith([{ a: 1 }, { a: 2 }]);
  });

  it("add returns 0 without touching the repository when there are no metrics", async () => {
    const { service, repository, mapper } = setup();
    mapper.toCreateInputs.mockReturnValue([]);

    expect(await service.add("amazon-pdp", dto([]))).toBe(0);

    expect(repository.createMany).not.toHaveBeenCalled();
  });

  it("deleteOlderThan delegates to the repository", async () => {
    const { service, repository } = setup();
    const date = new Date(5);

    expect(await service.deleteOlderThan(date)).toBe(7);

    expect(repository.deleteOlderThan).toHaveBeenCalledWith(date);
  });
});
