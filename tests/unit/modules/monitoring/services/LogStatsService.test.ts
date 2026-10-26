import { describe, expect, it, vi } from "vitest";
import { LogStatsService } from "@/modules/monitoring/services/LogStatsService";
import { SystemLogRepository } from "@/shared/logging/repositories/SystemLogRepository";

const HOUR = 3600;
const range = { from: new Date(10 * HOUR * 1000), to: new Date(12 * HOUR * 1000) };

const setup = (
  current: { hours?: unknown[]; sources?: unknown[] },
  previous: { hours?: unknown[] } = {}
) => {
  const repository = {
    getCountByLevelAndHour: vi
      .fn()
      .mockResolvedValueOnce(current.hours ?? [])
      .mockResolvedValueOnce(previous.hours ?? []),
    getCountBySourceAndLevel: vi.fn().mockResolvedValue(current.sources ?? []),
  };
  const service = new LogStatsService(repository as unknown as SystemLogRepository);
  return { service, repository };
};

describe("LogStatsService", () => {
  it("builds hourly error and warning series and totals of both periods", async () => {
    const { service, repository } = setup(
      {
        hours: [
          { level: "warn", hour: 11 * HOUR, value: 4 },
          { level: "error", hour: 11 * HOUR, value: 1 },
          { level: "error", hour: 10 * HOUR, value: 2 },
        ],
      },
      { hours: [{ level: "error", hour: 9 * HOUR, value: 9 }] }
    );

    const stats = await service.get(range);

    expect(repository.getCountByLevelAndHour.mock.calls).toEqual([
      [range.from, range.to],
      [new Date(8 * HOUR * 1000), range.from],
    ]);
    expect(repository.getCountBySourceAndLevel).toHaveBeenCalledWith(range.from, range.to);
    expect(stats.series).toEqual([
      {
        level: "error",
        points: [
          { t: "1970-01-01T10:00:00.000Z", value: 2 },
          { t: "1970-01-01T11:00:00.000Z", value: 1 },
        ],
      },
      { level: "warn", points: [{ t: "1970-01-01T11:00:00.000Z", value: 4 }] },
    ]);
    expect(stats.totals).toEqual({ error: 3, warn: 4 });
    expect(stats.previousTotals).toEqual({ error: 9, warn: 0 });
  });

  it("returns the 10 sources with most errors and warnings, ties by name", async () => {
    const sources = Array.from({ length: 12 }, (_, i) => ({
      source: `S${String(i).padStart(2, "0")}`,
      level: "warn",
      value: i < 2 ? 1 : 5,
    }));
    sources.push({ source: "S03", level: "error", value: 10 });
    const { service } = setup({ sources });

    const { topSources } = await service.get(range);

    expect(topSources).toHaveLength(10);
    expect(topSources[0]).toEqual({ source: "S03", error: 10, warn: 5 });
    expect(topSources.slice(1, 3).map((s) => s.source)).toEqual(["S02", "S04"]);
    expect(topSources.map((s) => s.source)).not.toContain("S00");
  });

  it("returns empty series and zero totals without logs", async () => {
    const { service } = setup({});

    expect(await service.get(range)).toEqual({
      series: [
        { level: "error", points: [] },
        { level: "warn", points: [] },
      ],
      totals: { error: 0, warn: 0 },
      previousTotals: { error: 0, warn: 0 },
      topSources: [],
    });
  });
});
