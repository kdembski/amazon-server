import { MessagePayload, WebhookMessageCreateOptions } from "discord.js";
import { DiscordChannelSelectDto } from "@/modules/settings/dtos/DiscordChannelDtos";
import { DiscordChannelRepository } from "@/modules/settings/repositories/DiscordChannelRepository";
import { DiscordChannelCreateMapper } from "@/modules/settings/mappers/DiscordChannelCreateMapper";
import { DiscordChannelUpdateMapper } from "@/modules/settings/mappers/DiscordChannelUpdateMapper";
import { DiscordChannelValidator } from "@/modules/settings/services/DiscordChannelValidator";
import { SettingCache } from "@/modules/settings/services/SettingCache";
import { SettingService } from "@/modules/settings/services/SettingService";
import { DiscordService } from "@/shared/discord/DiscordService";
import { SystemLogService } from "@/shared/logging/services/SystemLogService";

export const maskToken = (token: string) => `…${token.slice(-4)}`;

export class DiscordChannelService {
  private repository;
  private settingService;
  private validator;
  private createMapper;
  private updateMapper;
  private cache;
  private logger;
  private createClient;

  constructor(
    repository = new DiscordChannelRepository(),
    settingService = new SettingService(),
    validator = new DiscordChannelValidator(),
    createMapper = new DiscordChannelCreateMapper(),
    updateMapper = new DiscordChannelUpdateMapper(),
    cache = SettingCache.getInstance(),
    logger = SystemLogService.getInstance(),
    createClient = () => new DiscordService()
  ) {
    this.repository = repository;
    this.settingService = settingService;
    this.validator = validator;
    this.createMapper = createMapper;
    this.updateMapper = updateMapper;
    this.cache = cache;
    this.logger = logger;
    this.createClient = createClient;
  }

  async getAll() {
    const channels = await this.repository.getAll();
    return channels.map((channel) => this.mask(channel));
  }

  async create(dto: unknown) {
    const valid = this.validator.validateCreate(dto);
    const channel = await this.repository.create(this.createMapper.toCreateInput(valid));

    this.settingService.invalidate();
    this.logger.info("DiscordChannelService", `Discord channel ${channel.name} created`, {
      channel: this.mask(channel),
    });
    return this.mask(channel);
  }

  async update(id: number, dto: unknown) {
    const valid = this.validator.validateUpdate(dto);
    const channel = await this.repository.update(id, this.updateMapper.toUpdateInput(valid));

    this.settingService.invalidate();
    this.logger.info("DiscordChannelService", `Discord channel ${channel.name} updated`, {
      channel: this.mask(channel),
      tokenChanged: valid.token !== undefined,
    });
    return this.mask(channel);
  }

  async delete(id: number) {
    const keys = await this.getReferencingKeys(id);
    if (keys.length) {
      throw Object.assign(
        new Error(`Discord channel ${id} is used by the settings ${keys.join(", ")}`),
        { status: 422 }
      );
    }

    const channel = await this.repository.delete(id);
    this.settingService.invalidate();
    this.logger.info("DiscordChannelService", `Discord channel ${channel.name} deleted`, {
      channel: this.mask(channel),
    });
    return this.mask(channel);
  }

  // Does not wait for Discord: DiscordService retries in the background.
  async send(
    channelId: number,
    options: string | MessagePayload | WebhookMessageCreateOptions,
    context: Record<string, unknown> = {}
  ) {
    const channels = await this.settingService.getChannels();
    const channel = channels.find((channel) => channel.id === channelId);
    if (!channel) {
      this.logger.error("DiscordChannelService", `Discord channel ${channelId} does not exist`, {
        channelId,
        ...context,
      });
      return;
    }

    this.getClient(channel).send(options);
  }

  private getClient(channel: DiscordChannelSelectDto) {
    let client = this.cache.clients.get(channel.token);
    if (!client) {
      client = this.createClient();
      client.setToken(channel.token, channel.name);
      this.cache.clients.set(channel.token, client);
    }
    return client;
  }

  private async getReferencingKeys(id: number) {
    const settings = await this.settingService.getAll();
    return settings
      .filter(({ key, value }) => {
        if (key.endsWith(".channelId")) return value === id;
        if (key === "countryOutlier.ruleGroups") {
          return (value as { channelId: number }[][]).some((group) =>
            group.some((rule) => rule.channelId === id)
          );
        }
        return false;
      })
      .map(({ key }) => key);
  }

  private mask(channel: DiscordChannelSelectDto) {
    return { ...channel, token: maskToken(channel.token) };
  }
}
