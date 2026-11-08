import { describe, expect, it } from "vitest";
import { LogThrottle } from "@/shared/logging/services/LogThrottle";

describe("LogThrottle", () => {
  it("lets one log per key through per interval", () => {
    const throttle = new LogThrottle(60_000);

    expect(throttle.shouldLog("a", 0)).toBe(true);
    expect(throttle.shouldLog("a", 59_999)).toBe(false);
    expect(throttle.shouldLog("b", 59_999)).toBe(true);
    expect(throttle.shouldLog("a", 60_000)).toBe(true);
    expect(throttle.shouldLog("a", 60_001)).toBe(false);
  });

  it("uses one key without one and forgets everything on clear", () => {
    const throttle = new LogThrottle(60_000);

    expect(throttle.shouldLog()).toBe(true);
    expect(throttle.shouldLog()).toBe(false);
    throttle.clear();
    expect(throttle.shouldLog()).toBe(true);
  });
});
