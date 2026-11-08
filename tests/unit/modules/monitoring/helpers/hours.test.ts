import { describe, expect, it } from "vitest";
import { floorHour, previousRange, toHourIso } from "@/modules/monitoring/helpers/hours";

describe("previousRange", () => {
  it("is the same length right before the range", () => {
    expect(previousRange({ from: new Date(10_000), to: new Date(13_600) })).toEqual({
      from: new Date(6_400),
      to: new Date(10_000),
    });
  });
});

describe("toHourIso", () => {
  it.each([1792350000n, 1792350000])("turns epoch seconds %s into an ISO string", (hour) => {
    expect(toHourIso(hour)).toBe("2026-10-18T19:00:00.000Z");
  });
});

describe("floorHour", () => {
  it("drops minutes, seconds and milliseconds", () => {
    expect(floorHour(new Date("2026-10-18T10:59:59.990Z"))).toEqual(new Date("2026-10-18T10:00:00Z"));
  });
});
