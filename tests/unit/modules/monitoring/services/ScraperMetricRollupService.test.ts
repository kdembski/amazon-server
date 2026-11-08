import { describe, expect, it, vi } from "vitest";
import { ScraperMetricRollupService } from "@/modules/monitoring/services/ScraperMetricRollupService";
import { ScraperMetricRepository } from "@/modules/monitoring/repositories/ScraperMetricRepository";

const at = (time: string) => new Date(`2026-10-18T${time}Z`);

const setup = () => {
  const repository = {
    getRolledUpUntil: vi.fn().mockResolvedValue(null),
    getOldestPeriodStart: vi.fn().mockResolvedValue(null),
    rollUpHour: vi.fn().mockResolvedValue(1),
  };
  const service = new ScraperMetricRollupService(repository as unknown as ScraperMetricRepository);
  return { service, repository };
};

describe("ScraperMetricRollupService", () => {
  it("getRolledUpUntil delegates to the repository", async () => {
    const { service, repository } = setup();
    repository.getRolledUpUntil.mockResolvedValue(at("09:00:00"));

    expect(await service.getRolledUpUntil()).toEqual(at("09:00:00"));
  });

  it("sumParts reads every part and concatenates the rows", async () => {
    const { service } = setup();
    const read = vi.fn(async (part: { hourly: boolean }) => [part.hourly]);

    expect(await service.sumParts({ from: at("10:30:00"), to: at("12:15:00") }, at("12:00:00"), read)).toEqual([
      false,
      true,
      false,
    ]);
  });

  describe("rollUp", () => {
    it("rolls up the finished hours after the newest rolled-up one", async () => {
      const { service, repository } = setup();
      repository.getRolledUpUntil.mockResolvedValue(at("09:00:00"));

      expect(await service.rollUp(at("12:04:00"))).toBe(2);

      expect(repository.rollUpHour.mock.calls).toEqual([[at("09:00:00")], [at("10:00:00")]]);
    });

    it("starts at the hour of the oldest raw row when nothing is rolled up", async () => {
      const { service, repository } = setup();
      repository.getOldestPeriodStart.mockResolvedValue(at("10:42:00"));

      expect(await service.rollUp(at("11:05:00"))).toBe(1);

      expect(repository.rollUpHour).toHaveBeenCalledWith(at("10:00:00"));
    });

    it("does nothing without metrics", async () => {
      const { service, repository } = setup();

      expect(await service.rollUp(at("11:05:00"))).toBe(0);

      expect(repository.rollUpHour).not.toHaveBeenCalled();
    });
  });

  describe("getParts", () => {
    const service = setup().service;
    it("reads whole rolled-up hours hourly and the edges raw", () => {
      expect(service.getParts({ from: at("10:30:00"), to: at("13:15:00") }, at("13:00:00"))).toEqual([
        { from: at("10:30:00"), to: at("11:00:00"), hourly: false },
        { from: at("11:00:00"), to: at("13:00:00"), hourly: true },
        { from: at("13:00:00"), to: at("13:15:00"), hourly: false },
      ]);
    });

    it("reads hours after the rollup raw and drops empty edges", () => {
      expect(service.getParts({ from: at("10:00:00"), to: at("13:00:00") }, at("12:00:00"))).toEqual([
        { from: at("10:00:00"), to: at("12:00:00"), hourly: true },
        { from: at("12:00:00"), to: at("13:00:00"), hourly: false },
      ]);
    });

    it.each([
      ["nothing is rolled up", null],
      ["the rollup ends before the first whole hour", at("10:00:00")],
    ])("reads the whole range raw when %s", (_, rolledUpUntil) => {
      const range = { from: at("10:30:00"), to: at("12:30:00") };

      expect(service.getParts(range, rolledUpUntil)).toEqual([{ ...range, hourly: false }]);
    });

    it("reads a range inside one hour raw", () => {
      const range = { from: at("10:10:00"), to: at("10:50:00") };

      expect(service.getParts(range, at("12:00:00"))).toEqual([{ ...range, hourly: false }]);
    });

  });
});
