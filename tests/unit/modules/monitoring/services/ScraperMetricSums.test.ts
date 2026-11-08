import { describe, expect, it } from "vitest";
import { ScraperMetricSums } from "@/modules/monitoring/services/ScraperMetricSums";

const row = (metric: string, outcome: string | null, value: number) => ({ metric, outcome, value });
const range = { from: new Date("2026-10-18T10:00:00Z"), to: new Date("2026-10-18T10:00:10Z") };

describe("ScraperMetricSums", () => {
  const sums = new ScraperMetricSums([
    row("requests", "ok", 80),
    row("requests", "http_404", 5),
    row("requests", "timeout", 15),
    row("responses", "captcha", 10),
    row("items", "data", 40),
    row("items", "given_up", 10),
    row("item_attempts", null, 75),
    row("connections", null, 20),
    row("bytes_in", "proxy", 1024),
    row("bytes_out", "proxy", 1024),
    row("bytes_in", "direct4", 300),
    row("bytes_out", "direct6", 200),
    row("bytes_in", null, 7),
  ]);

  it("totals a metric, optionally of some outcomes only", () => {
    expect(sums.total("requests")).toBe(100);
    expect(sums.total("requests", ["ok", "timeout"])).toBe(95);
    expect(sums.total("bytes_in", ["proxy"])).toBe(1024);
  });

  it("counts failed requests and bad responses as wasted", () => {
    expect(sums.wasted()).toBe(25);
  });

  it("sums the bytes of the proxy and the direct routes", () => {
    expect(sums.proxyBytes()).toBe(2048);
    expect(sums.directBytes()).toBe(500);
  });

  it("counts items without the given up ones per second of the range", () => {
    expect(sums.itemsPerSecond(range)).toBe(4);
  });

  it("summarizes the KPIs", () => {
    expect(sums.summarize(range)).toEqual({
      itemsPerSecond: 4,
      requests: 100,
      wastedPercent: 25,
      captchaPercent: 10,
      kbPerItem: 2555 / 1024 / 40,
      reusePercent: 80,
      attemptsPerItem: 1.5,
      bytesIn: 1331,
      bytesOut: 1224,
      connections: 20,
    });
  });

  it("zeroes the ratios and nulls the per-item values without requests and items", () => {
    expect(new ScraperMetricSums([]).summarize(range)).toEqual({
      itemsPerSecond: 0,
      requests: 0,
      wastedPercent: 0,
      captchaPercent: 0,
      kbPerItem: null,
      reusePercent: 0,
      attemptsPerItem: null,
      bytesIn: 0,
      bytesOut: 0,
      connections: 0,
    });
  });
});
