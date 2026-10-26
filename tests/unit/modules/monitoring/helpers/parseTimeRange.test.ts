import { describe, expect, it } from "vitest";
import {
  InvalidTimeRangeError,
  parseTimeRange,
  previousRange,
  toHourIso,
} from "@/modules/monitoring/helpers/parseTimeRange";

const DAY = 86_400_000;

describe("parseTimeRange", () => {
  it("accepts a range of exactly 30 days", () => {
    expect(
      parseTimeRange({ from: "2026-10-01T00:00:00Z", to: "2026-10-31T00:00:00Z" })
    ).toEqual({
      from: new Date("2026-10-01T00:00:00Z"),
      to: new Date("2026-10-31T00:00:00Z"),
    });
  });

  it.each([
    ["missing from", { to: "2026-10-02T00:00:00Z" }],
    ["missing to", { from: "2026-10-01T00:00:00Z" }],
    ["an invalid date", { from: "abc", to: "2026-10-02T00:00:00Z" }],
    ["from equal to to", { from: "2026-10-01T00:00:00Z", to: "2026-10-01T00:00:00Z" }],
    ["from after to", { from: "2026-10-02T00:00:00Z", to: "2026-10-01T00:00:00Z" }],
    [
      "more than 30 days",
      { from: "2026-10-01T00:00:00Z", to: new Date(Date.parse("2026-10-01T00:00:00Z") + 30 * DAY + 1).toISOString() },
    ],
    ["an array value", { from: ["2026-10-01T00:00:00Z", "x"], to: "2026-10-02T00:00:00Z" }],
    ["no query", undefined],
  ])("rejects %s with a 400 error", (_, query) => {
    expect(() => parseTimeRange(query)).toThrow(InvalidTimeRangeError);
    try {
      parseTimeRange(query);
    } catch (error: any) {
      expect(error.status).toBe(400);
      expect(error.message).toBe(
        "from and to must be ISO dates with from < to and at most 30 days apart"
      );
    }
  });
});

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
