import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RetentionCleanupCronService } from "@/shared/system/RetentionCleanupCronService";
import { unitLogger } from "../../../support/fakes";

describe("RetentionCleanupCronService", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T03:30:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("keeps the cron time", () => {
    const service = new RetentionCleanupCronService("00 30 03 * * *", "rows", 30, {
      deleteOlderThan: vi.fn(),
    });

    expect(service["cronTime"]).toBe("00 30 03 * * *");
  });

  it("deletes rows older than the retention and reports the count", async () => {
    const deleteOlderThan = vi.fn().mockResolvedValue(42);
    const service = new RetentionCleanupCronService("* * * * * *", "activity events", 30, {
      deleteOlderThan,
    });

    await service.run();

    const before = new Date("2026-05-02T03:30:00Z");
    expect(deleteOlderThan).toHaveBeenCalledWith(before);
    expect(unitLogger().info).toHaveBeenCalledWith(
      "RetentionCleanupCronService",
      `Deleted 42 activity events older than ${before.toISOString()}`,
      { deleted: 42, before, label: "activity events" }
    );
  });
});

describe("RetentionCleanupCronService failure", () => {
  it("names the rows in the failure log", () => {
    const service = new RetentionCleanupCronService("* * * * * *", "system logs", 30, { deleteOlderThan: vi.fn() });

    expect(service["getFailureContext"]()).toEqual({ label: "system logs" });
  });
});
