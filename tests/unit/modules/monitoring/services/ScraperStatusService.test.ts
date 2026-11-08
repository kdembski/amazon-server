import { describe, expect, it, vi } from "vitest";
import { ScraperStatusService } from "@/modules/monitoring/services/ScraperStatusService";
import { ScraperConfigRepository } from "@/modules/monitoring/repositories/ScraperConfigRepository";
import { ScraperMetricRepository } from "@/modules/monitoring/repositories/ScraperMetricRepository";

const setup = () => {
  const repository = {
    getLastReports: vi.fn().mockResolvedValue([]),
    sumStatusMetrics: vi.fn().mockResolvedValue([]),
  };
  const configRepository = { findAll: vi.fn().mockResolvedValue([]) };
  const service = new ScraperStatusService(
    repository as unknown as ScraperMetricRepository,
    configRepository as unknown as ScraperConfigRepository
  );
  return { service, repository, configRepository };
};

describe("ScraperStatusService", () => {
  describe("getStatuses", () => {
    const sum = (
      scraper: string,
      metric: string,
      outcome: string | null,
      value: number,
      reports = 60
    ) => ({ scraper, metric, outcome, value, reports });
    const reportedAt = new Date("2026-10-18T11:59:00Z");

    it("returns the last hour averages of every scraper with a config, stopped ones as 0", async () => {
      const { service, repository, configRepository } = setup();
      vi.useFakeTimers({ now: new Date("2026-10-18T12:00:00Z") });
      repository.getLastReports.mockResolvedValue([
        { scraper: "unconfigured", reportedAt },
        { scraper: "stopped", reportedAt: new Date("2026-10-15T08:00:00Z") },
        { scraper: "a", reportedAt },
      ]);
      repository.sumStatusMetrics.mockResolvedValue([
        sum("unconfigured", "cpu_percent", null, 3),
        sum("a", "cpu_percent", null, 600, 30),
        sum("a", "requests", "ok", 32_400, 30),
        sum("a", "requests", "timeout", 3600, 30),
        sum("a", "items", "data", 7200, 30),
        sum("a", "items", "given_up", 3600, 30),
        sum("a", "pending", null, 1200, 30),
        sum("a", "open_connections", null, 750, 30),
      ]);
      configRepository.findAll.mockResolvedValue([
        { scraper: "a", rps: 12, concurrency: 50 },
        { scraper: "stopped", rps: 5, concurrency: 10 },
      ]);

      expect(await service.getStatuses()).toEqual([
        {
          scraper: "a",
          lastReportAt: "2026-10-18T11:59:00.000Z",
          itemsPerSecond: 2,
          requestsPerSecond: 10,
          rps: 12,
          pending: 40,
          concurrency: 50,
          openConnections: 25,
        },
        {
          scraper: "stopped",
          lastReportAt: "2026-10-15T08:00:00.000Z",
          itemsPerSecond: 0,
          requestsPerSecond: 0,
          rps: 5,
          pending: 0,
          concurrency: 10,
          openConnections: 0,
        },
      ]);

      expect(repository.getLastReports).toHaveBeenCalledWith(new Date("2026-10-11T12:00:00Z"));
      expect(repository.sumStatusMetrics).toHaveBeenCalledWith(new Date("2026-10-18T11:00:00Z"));
      vi.useRealTimers();
    });
  });
});
