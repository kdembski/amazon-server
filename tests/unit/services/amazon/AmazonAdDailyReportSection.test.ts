import { describe, expect, it, vi } from "vitest";
import { AmazonAdDailyReportSection } from "@/services/amazon/AmazonAdDailyReportSection";
import { AmazonAdService } from "@/services/amazon/AmazonAdService";
import { getSpacing } from "@/shared/discord/spacing";

describe("AmazonAdDailyReportSection", () => {
  it("reports the total and the from–to ad counts", async () => {
    const from = new Date("2026-06-01T20:00:00Z");
    const to = new Date("2026-06-02T20:00:00Z");
    const getCount = vi
      .fn()
      .mockResolvedValueOnce(12345)
      .mockResolvedValueOnce(67);
    const section = new AmazonAdDailyReportSection({
      getCount,
    } as unknown as AmazonAdService);

    await expect(section.getField(from, to)).resolves.toEqual({
      name: "Collected asins",
      value: ["Total: **12 345**", "Last 24h: **67**"].join(getSpacing(4)),
    });
    expect(getCount.mock.calls).toEqual([[], [from, to]]);
  });
});
