import { describe, expect, it } from "vitest";
import { StorageService } from "@/services/StorageService";

describe("StorageService", () => {
  it("is a singleton with an empty initial state", () => {
    const a = StorageService.getInstance();
    const b = StorageService.getInstance();

    expect(a).toBe(b);
    expect(a.state.plnExchangeRates).toBeUndefined();
  });
});
