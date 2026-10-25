import { afterEach, describe, expect, it } from "vitest";
import { ActivityCounter } from "@/modules/monitoring/services/ActivityCounter";
import { resetSingleton } from "../../../../support/fakes";

describe("ActivityCounter", () => {
  afterEach(() => resetSingleton(ActivityCounter));

  it("returns the same instance and starts empty", () => {
    const counter = ActivityCounter.getInstance();

    expect(ActivityCounter.getInstance()).toBe(counter);
    expect(counter.counts.size).toBe(0);
  });
});
