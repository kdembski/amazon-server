import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DiscordChannelService, maskToken } from "@/modules/settings/services/DiscordChannelService";
import { DiscordChannelRepository } from "@/modules/settings/repositories/DiscordChannelRepository";
import { SettingCache } from "@/modules/settings/services/SettingCache";
import { SETTING_DEFAULTS } from "@/modules/settings/services/SettingDefaults";
import { DiscordService } from "@/shared/discord/DiscordService";
import { FIXED_DATE } from "../../../../support/factories";
import {
  fakeDiscordService,
  fakeSettingService,
  fakeSystemLogService,
  resetSingleton,
} from "../../../../support/fakes";

const webhookSend = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock("discord.js", () => ({
  WebhookClient: vi.fn(function () {
    return { send: webhookSend };
  }),
}));

const channel = (id: number, token = `${id}/secret-${id}`) => ({
  id,
  name: `channel-${id}`,
  token,
  createdAt: FIXED_DATE,
  updatedAt: FIXED_DATE,
});

const masked = (id: number) => ({ ...channel(id), token: `…et-${id}` });

const setup = (channels = [channel(1)]) => {
  const repository = {
    getAll: vi.fn().mockResolvedValue(channels),
    create: vi.fn(async () => channel(8)),
    update: vi.fn(async () => channel(2)),
    delete: vi.fn(async () => channel(9)),
  };
  const settings = fakeSettingService({}, channels);
  settings.getAll.mockResolvedValue(
    Object.entries(SETTING_DEFAULTS).map(([key, value]) => ({ key, value, default: value }))
  );
  const logger = fakeSystemLogService();
  const clients: ReturnType<typeof fakeDiscordService>[] = [];
  const createClient = vi.fn(() => {
    const client = fakeDiscordService();
    clients.push(client);
    return client.service;
  });
  const service = new DiscordChannelService(
    repository as unknown as DiscordChannelRepository,
    settings.service,
    undefined,
    undefined,
    undefined,
    SettingCache.getInstance(),
    logger.service,
    createClient as unknown as () => DiscordService
  );
  return { service, repository, settings, logger, clients, createClient };
};

beforeEach(() => {
  vi.useFakeTimers({ now: FIXED_DATE });
});

afterEach(() => {
  vi.useRealTimers();
  resetSingleton(SettingCache);
});

describe("maskToken", () => {
  it("keeps the last 4 characters", () => {
    expect(maskToken("123/abcdef")).toBe("…cdef");
  });
});

describe("DiscordChannelService", () => {
  it("getAll masks the tokens", async () => {
    const { service } = setup([channel(1), channel(2)]);

    expect(await service.getAll()).toEqual([masked(1), masked(2)]);
  });

  it("create validates, stores, refreshes the settings and logs the masked channel", async () => {
    const { service, repository, settings, logger } = setup();

    const result = await service.create({ name: "channel-8", token: "8/secret-8" });

    expect(repository.create).toHaveBeenCalledWith({
      name: "channel-8",
      token: "8/secret-8",
      createdAt: FIXED_DATE,
      updatedAt: FIXED_DATE,
    });
    expect(settings.invalidate).toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(
      "DiscordChannelService",
      "Discord channel channel-8 created",
      { channel: masked(8) }
    );
    expect(result).toEqual(masked(8));
  });

  it("create rejects an invalid channel without storing", async () => {
    const { service, repository } = setup();

    await expect(service.create({ name: "x" })).rejects.toMatchObject({ status: 400 });
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("update stores the given fields and logs whether the token changed", async () => {
    const { service, repository, settings, logger } = setup();

    const result = await service.update(2, { name: "channel-2" });

    expect(repository.update).toHaveBeenCalledWith(2, {
      name: "channel-2",
      token: undefined,
      updatedAt: FIXED_DATE,
    });
    expect(settings.invalidate).toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(
      "DiscordChannelService",
      "Discord channel channel-2 updated",
      { channel: masked(2), tokenChanged: false }
    );
    expect(result).toEqual(masked(2));

    await service.update(2, { token: "2/new" });
    expect(logger.info.mock.calls[1][2]).toMatchObject({ tokenChanged: true });
  });

  it("delete removes a channel no setting uses", async () => {
    const { service, repository, settings, logger } = setup();

    expect(await service.delete(9)).toEqual(masked(9));
    expect(repository.delete).toHaveBeenCalledWith(9);
    expect(settings.invalidate).toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(
      "DiscordChannelService",
      "Discord channel channel-9 deleted",
      { channel: masked(9) }
    );
  });

  it.each([
    [3, "countryOutlier.ruleGroups"],
    [7, "priceDrop.channelId"],
    [8, "reports.channelId"],
  ])("delete answers 422 for channel %s used by %s", async (id, key) => {
    const { service, repository } = setup();

    await expect(service.delete(id)).rejects.toMatchObject({
      status: 422,
      message: `Discord channel ${id} is used by the settings ${key}`,
    });
    expect(repository.delete).not.toHaveBeenCalled();
  });

  it("send posts through one client per token, named after the channel", async () => {
    const { service, settings, clients, createClient } = setup([channel(1), channel(2)]);
    const options = { content: "hi" };

    await service.send(1, options);
    await service.send(1, options);
    await service.send(2, options);
    settings.getChannels.mockResolvedValue([channel(1, "1/rotated"), channel(2)]);
    await service.send(1, options);

    expect(createClient).toHaveBeenCalledTimes(3);
    expect(clients.map((client) => client.setToken.mock.calls[0])).toEqual([
      ["1/secret-1", "channel-1"],
      ["2/secret-2", "channel-2"],
      ["1/rotated", "channel-1"],
    ]);
    expect(clients.map((client) => client.send.mock.calls.length)).toEqual([2, 1, 1]);
    expect(clients[0].send).toHaveBeenCalledWith(options);
  });

  it("send logs an error for a missing channel", async () => {
    const { service, logger, createClient } = setup();

    await service.send(5, { content: "hi" }, { asin: "B0X" });

    expect(createClient).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      "DiscordChannelService",
      "Discord channel 5 does not exist",
      { channelId: 5, asin: "B0X" }
    );
  });

  it("builds a DiscordService per token by default", async () => {
    const settings = fakeSettingService({}, [channel(1)]);
    const service = new DiscordChannelService({} as DiscordChannelRepository, settings.service);

    await service.send(1, { content: "hi" });

    expect(webhookSend).toHaveBeenCalledWith({ content: "hi" });
  });
});
