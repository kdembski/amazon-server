import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SettingService } from "@/modules/settings/services/SettingService";
import { SettingCache } from "@/modules/settings/services/SettingCache";
import { SETTING_KEYS } from "@/modules/settings/services/SettingValidator";
import { SettingRepository } from "@/modules/settings/repositories/SettingRepository";
import { DiscordChannelRepository } from "@/modules/settings/repositories/DiscordChannelRepository";
import { FIXED_DATE } from "../../../../support/factories";
import { fakeSystemLogService, resetSingleton } from "../../../../support/fakes";

const channel = (id: number) => ({
  id,
  name: `channel-${id}`,
  token: `${id}/token`,
  createdAt: FIXED_DATE,
  updatedAt: FIXED_DATE,
});

const setup = (rows: { key: string; value: unknown }[] = [], channels = [channel(1)]) => {
  const repository = {
    getAll: vi.fn().mockResolvedValue(rows),
    upsert: vi.fn().mockResolvedValue(undefined),
  };
  const channelRepository = { getAll: vi.fn().mockResolvedValue(channels) };
  const logger = fakeSystemLogService();
  const service = new SettingService(
    repository as unknown as SettingRepository,
    channelRepository as unknown as DiscordChannelRepository,
    undefined,
    undefined,
    SettingCache.getInstance(),
    logger.service
  );
  return { service, repository, channelRepository, logger };
};

beforeEach(() => {
  vi.useFakeTimers({ now: FIXED_DATE });
});

afterEach(() => {
  vi.useRealTimers();
  resetSingleton(SettingCache);
});

describe("SettingService", () => {
  it("get returns the stored value", async () => {
    const { service, logger } = setup([{ key: "priceDrop.dropPercent", value: 40 }]);

    expect(await service.get("priceDrop.dropPercent")).toBe(40);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("get returns undefined for a missing row and logs an error once a minute per key", async () => {
    const { service, logger } = setup();

    expect(await service.get("countryOutlier.minPrices")).toBeUndefined();
    await service.get("countryOutlier.minPrices");
    await service.get("priceDrop.dropPercent");
    vi.advanceTimersByTime(60_000);
    await service.get("countryOutlier.minPrices");

    expect(logger.error.mock.calls).toEqual([
      [
        "SettingService",
        "Setting countryOutlier.minPrices is missing, its work is skipped",
        { key: "countryOutlier.minPrices" },
      ],
      [
        "SettingService",
        "Setting priceDrop.dropPercent is missing, its work is skipped",
        { key: "priceDrop.dropPercent" },
      ],
      [
        "SettingService",
        "Setting countryOutlier.minPrices is missing, its work is skipped",
        { key: "countryOutlier.minPrices" },
      ],
    ]);
  });

  it("reads the database once per 60 s", async () => {
    const { service, repository, channelRepository } = setup();

    await service.getChannels();
    vi.advanceTimersByTime(59_999);
    await service.getChannels();
    expect(repository.getAll).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1);
    await service.getChannels();
    expect(repository.getAll).toHaveBeenCalledTimes(2);
    expect(channelRepository.getAll).toHaveBeenCalledTimes(2);
  });

  it("getAll returns every key with its value or null", async () => {
    const { service } = setup([{ key: "countryOutlier.minPrices", value: 4 }]);

    const settings = await service.getAll();

    expect(settings.map((setting) => setting.key)).toEqual(SETTING_KEYS);
    expect(settings[0]).toEqual({ key: "countryOutlier.minPrices", value: 4 });
    expect(settings[1]).toEqual({ key: "countryOutlier.dropSinceSentPercent", value: null });
  });

  it("getChannels returns the cached channels", async () => {
    const { service } = setup([], [channel(1), channel(2)]);

    expect(await service.getChannels()).toEqual([channel(1), channel(2)]);
  });

  it("has no values and warns once when the database cannot be read", async () => {
    const { service, repository, logger } = setup();
    const error = new Error("db down");
    repository.getAll.mockRejectedValue(error);

    expect(await service.getChannels()).toEqual([]);
    expect(await service.getAll()).toContainEqual({ key: "priceDrop.channelId", value: null });
    vi.advanceTimersByTime(60_000);
    await service.getChannels();

    expect(repository.getAll).toHaveBeenCalledTimes(2);
    expect(logger.warn.mock.calls).toEqual([
      ["SettingService", "Settings refresh failed, using the last values", { error }],
    ]);
  });

  it("keeps the last values when a refresh fails and warns again after a success", async () => {
    const { service, repository, logger } = setup([{ key: "priceDrop.dropPercent", value: 40 }]);
    await service.get("priceDrop.dropPercent");

    repository.getAll.mockRejectedValueOnce(new Error("db down"));
    vi.advanceTimersByTime(60_000);
    expect(await service.get("priceDrop.dropPercent")).toBe(40);

    vi.advanceTimersByTime(60_000);
    await service.get("priceDrop.dropPercent");
    repository.getAll.mockRejectedValueOnce(new Error("db down"));
    vi.advanceTimersByTime(60_000);
    await service.get("priceDrop.dropPercent");

    expect(logger.warn).toHaveBeenCalledTimes(2);
  });

  it("set validates against the current channels, stores the value and logs the change", async () => {
    const { service, repository, logger } = setup([], [channel(1), channel(5)]);
    repository.getAll
      .mockResolvedValueOnce([{ key: "priceDrop.channelId", value: 1 }])
      .mockResolvedValue([{ key: "priceDrop.channelId", value: 5 }]);

    const result = await service.set("priceDrop.channelId", 5);

    expect(repository.upsert).toHaveBeenCalledWith(
      "priceDrop.channelId",
      { key: "priceDrop.channelId", value: 5, createdAt: FIXED_DATE, updatedAt: FIXED_DATE },
      { value: 5, updatedAt: FIXED_DATE }
    );
    expect(logger.info).toHaveBeenCalledWith("SettingService", "Setting priceDrop.channelId changed", {
      key: "priceDrop.channelId",
      old: 1,
      new: 5,
    });
    expect(result).toEqual({ key: "priceDrop.channelId", value: 5 });
  });

  it("set logs null as the old value of a new row", async () => {
    const { service, logger } = setup();

    await service.set("priceDrop.dropPercent", 40);

    expect(logger.info.mock.calls[0][2]).toMatchObject({ old: null, new: 40 });
  });

  it("set rejects an unknown key or an invalid value without storing", async () => {
    const { service, repository } = setup();

    await expect(service.set("nope", 1)).rejects.toMatchObject({ status: 400 });
    await expect(service.set("priceDrop.channelId", 9)).rejects.toMatchObject({ status: 400 });
    expect(repository.upsert).not.toHaveBeenCalled();
  });

  it("invalidate makes the next read refresh", async () => {
    const { service, repository } = setup();
    await service.getChannels();

    service.invalidate();
    await service.getChannels();

    expect(repository.getAll).toHaveBeenCalledTimes(2);
  });
});
