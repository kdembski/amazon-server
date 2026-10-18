import { describe, expect, it } from "vitest";
import {
  InvalidScraperMetricsError,
  parseScraperMetrics,
} from "@/modules/monitoring/helpers/parseScraperMetrics";

const valid = () => ({
  marketplace: "amazon",
  flow: "pdp",
  periodStart: "2026-10-18T10:00:00.000Z",
  metrics: [
    { metric: "requests", country: "de", outcome: "ok", value: 120 },
    { metric: "bytes_in", value: 1843200 },
  ],
});

const withMetric = (metric: Record<string, unknown>) => ({
  ...valid(),
  metrics: [{ metric: "requests", value: 1, ...metric }],
});

describe("parseScraperMetrics", () => {
  it("returns the dto for a valid body", () => {
    expect(parseScraperMetrics(valid())).toEqual(valid());
  });

  it("accepts an empty metrics array", () => {
    const body = { ...valid(), metrics: [] };

    expect(parseScraperMetrics(body).metrics).toEqual([]);
  });

  it("accepts the maximum lengths and 1000 metrics", () => {
    const body = {
      ...valid(),
      flow: "f".repeat(15),
      metrics: Array.from({ length: 1000 }, () => ({
        metric: "m".repeat(63),
        country: "c".repeat(7),
        outcome: "o".repeat(31),
        value: 0,
      })),
    };

    expect(parseScraperMetrics(body).metrics).toHaveLength(1000);
  });

  it.each([
    ["null body", null],
    ["missing metrics", { ...valid(), metrics: undefined }],
    ["non-array metrics", { ...valid(), metrics: {} }],
    [
      "1001 metrics",
      { ...valid(), metrics: Array(1001).fill({ metric: "m", value: 1 }) },
    ],
    ["null metric item", { ...valid(), metrics: [null] }],
    ["empty marketplace", { ...valid(), marketplace: "" }],
    ["unknown marketplace", { ...valid(), marketplace: "zalando" }],
    ["non-string marketplace", { ...valid(), marketplace: 1 }],
    ["empty flow", { ...valid(), flow: "" }],
    ["16 char flow", { ...valid(), flow: "f".repeat(16) }],
    ["invalid periodStart", { ...valid(), periodStart: "yesterday" }],
    ["non-string periodStart", { ...valid(), periodStart: 5 }],
    ["empty metric", withMetric({ metric: "" })],
    ["64 char metric", withMetric({ metric: "m".repeat(64) })],
    ["8 char country", withMetric({ country: "c".repeat(8) })],
    ["non-string country", withMetric({ country: 1 })],
    ["32 char outcome", withMetric({ outcome: "o".repeat(32) })],
    ["non-string outcome", withMetric({ outcome: 1 })],
    ["string value", withMetric({ value: "12" })],
    ["NaN value", withMetric({ value: NaN })],
    ["Infinity value", withMetric({ value: Infinity })],
    ["negative value", withMetric({ value: -1 })],
  ])("throws InvalidScraperMetricsError for %s", (_name, body) => {
    expect(() => parseScraperMetrics(body)).toThrow(InvalidScraperMetricsError);
  });
});
