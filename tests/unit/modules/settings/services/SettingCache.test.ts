import { afterEach, describe, expect, it } from "vitest";
import { SettingCache } from "@/modules/settings/services/SettingCache";
import { resetSingleton } from "../../../../support/fakes";

afterEach(() => resetSingleton(SettingCache));

describe("SettingCache", () => {
  it("returns one instance that starts empty", () => {
    const cache = SettingCache.getInstance();

    expect(SettingCache.getInstance()).toBe(cache);
    expect(cache.values).toBeUndefined();
    expect(cache.channels).toBeUndefined();
    expect(cache.refreshedAt).toBeUndefined();
    expect(cache.refreshFailing).toBe(false);
    expect(cache.clients.size).toBe(0);
  });
});
