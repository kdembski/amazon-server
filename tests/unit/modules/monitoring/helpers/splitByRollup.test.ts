import { describe, expect, it } from "vitest";
import { floorHour, splitByRollup } from "@/modules/monitoring/helpers/splitByRollup";

const at = (time: string) => new Date(`2026-10-18T${time}Z`);

describe("splitByRollup", () => {
  it("reads whole rolled-up hours hourly and the edges raw", () => {
    expect(splitByRollup({ from: at("10:30:00"), to: at("13:15:00") }, at("13:00:00"))).toEqual([
      { from: at("10:30:00"), to: at("11:00:00"), hourly: false },
      { from: at("11:00:00"), to: at("13:00:00"), hourly: true },
      { from: at("13:00:00"), to: at("13:15:00"), hourly: false },
    ]);
  });

  it("reads hours after the rollup raw and drops empty edges", () => {
    expect(splitByRollup({ from: at("10:00:00"), to: at("13:00:00") }, at("12:00:00"))).toEqual([
      { from: at("10:00:00"), to: at("12:00:00"), hourly: true },
      { from: at("12:00:00"), to: at("13:00:00"), hourly: false },
    ]);
  });

  it.each([
    ["nothing is rolled up", null],
    ["the rollup ends before the first whole hour", at("10:00:00")],
  ])("reads the whole range raw when %s", (_, rolledUpUntil) => {
    const range = { from: at("10:30:00"), to: at("12:30:00") };

    expect(splitByRollup(range, rolledUpUntil)).toEqual([{ ...range, hourly: false }]);
  });

  it("reads a range inside one hour raw", () => {
    const range = { from: at("10:10:00"), to: at("10:50:00") };

    expect(splitByRollup(range, at("12:00:00"))).toEqual([{ ...range, hourly: false }]);
  });

  it("floorHour drops minutes, seconds and milliseconds", () => {
    expect(floorHour(new Date("2026-10-18T10:59:59.990Z"))).toEqual(at("10:00:00"));
  });
});
