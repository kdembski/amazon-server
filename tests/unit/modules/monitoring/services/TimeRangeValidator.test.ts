import { describe, expect, it } from "vitest";
import { TimeRangeValidator } from "@/modules/monitoring/services/TimeRangeValidator";

const parseTimeRange = (query: unknown) => new TimeRangeValidator().validate(query);

const DAY = 86_400_000;

describe("TimeRangeValidator", () => {
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
    expect(() => parseTimeRange(query)).toThrow(expect.objectContaining({ status: 400 }));
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
