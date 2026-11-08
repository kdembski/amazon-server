import { HttpError } from "@/shared/http/HttpError";
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
    const keys = await this.settingService.getKeysReferencingChannel(id);
    if (keys.length) {
      throw new HttpError(422, `Discord channel ${id} is used by the settings ${keys.join(", ")}`);
    }

    const channel = await this.repository.delete(id);
    this.settingService.invalidate();
    this.logger.info("DiscordChannelService", `Discord channel ${channel.name} deleted`, {
      channel: this.mask(channel),
    });
    return this.mask(channel);
  }

  // Does not wait for Discord: DiscordService retries in the background.
  // Without a channel id (missing setting) nothing is sent; SettingService logs the missing setting.
  async send(
    channelId: number | undefined,
    options: string | MessagePayload | WebhookMessageCreateOptions,
    context: Record<string, unknown> = {}
  ) {
    if (channelId === undefined) return;

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

  private mask(channel: DiscordChannelSelectDto) {
    return { ...channel, token: maskToken(channel.token) };
  }
}
