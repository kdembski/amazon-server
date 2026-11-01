import { SettingKey, Settings } from "@/modules/settings/interfaces/Settings";
import { SettingSelectDto } from "@/modules/settings/dtos/SettingDtos";
import { SettingRepository } from "@/modules/settings/repositories/SettingRepository";
import { DiscordChannelRepository } from "@/modules/settings/repositories/DiscordChannelRepository";
import { SettingUpsertMapper } from "@/modules/settings/mappers/SettingUpsertMapper";
import { SettingCache } from "@/modules/settings/services/SettingCache";
import { SETTING_DEFAULTS } from "@/modules/settings/services/SettingDefaults";
import { SettingValidator } from "@/modules/settings/services/SettingValidator";
import { SystemLogService } from "@/shared/logging/services/SystemLogService";

// The worker rereads the settings the api process stores.
const SETTING_TTL_MS = 60_000;

export class SettingService {
  private repository;
  private channelRepository;
  private validator;
  private mapper;
  private cache;
  private logger;

  constructor(
    repository = new SettingRepository(),
    channelRepository = new DiscordChannelRepository(),
    validator = new SettingValidator(),
    mapper = new SettingUpsertMapper(),
    cache = SettingCache.getInstance(),
    logger = SystemLogService.getInstance()
  ) {
    this.repository = repository;
    this.channelRepository = channelRepository;
    this.validator = validator;
    this.mapper = mapper;
    this.cache = cache;
    this.logger = logger;
  }

  async get<K extends SettingKey>(key: K): Promise<Settings[K]> {
    const values = await this.getValues();
    return (values.get(key) ?? SETTING_DEFAULTS[key]) as Settings[K];
  }

  async getAll() {
    const values = await this.getValues();
    return (Object.keys(SETTING_DEFAULTS) as SettingKey[]).map((key) =>
      this.toSelectDto(key, values)
    );
  }

  async getChannels() {
    await this.refresh();
    return this.cache.channels!;
  }

  async set(key: string, value: unknown) {
    const settingKey = this.validator.validateKey(key);
    const channels = await this.channelRepository.getAll();
    const valid = this.validator.validate(
      settingKey,
      value,
      channels.map((channel) => channel.id)
    );
    const old = await this.get(settingKey);

    await this.repository.upsert(
      settingKey,
      this.mapper.toCreateInput(settingKey, valid),
      this.mapper.toUpdateInput(valid)
    );
    this.invalidate();
    this.logger.info("SettingService", `Setting ${settingKey} changed`, {
      key: settingKey,
      old,
      new: valid,
    });
    return this.toSelectDto(settingKey, await this.getValues());
  }

  async reset(key: string) {
    const settingKey = this.validator.validateKey(key);
    const old = await this.get(settingKey);

    await this.repository.delete(settingKey);
    this.invalidate();
    this.logger.info("SettingService", `Setting ${settingKey} reset to the default`, {
      key: settingKey,
      old,
    });
    return this.toSelectDto(settingKey, await this.getValues());
  }

  invalidate() {
    this.cache.refreshedAt = undefined;
  }

  private async getValues() {
    await this.refresh();
    return this.cache.values!;
  }

  // A failed read keeps the last values (defaults on a cold start) until the next TTL.
  private async refresh() {
    const { refreshedAt } = this.cache;
    if (refreshedAt !== undefined && Date.now() - refreshedAt < SETTING_TTL_MS) return;

    try {
      const [rows, channels] = await Promise.all([
        this.repository.getAll(),
        this.channelRepository.getAll(),
      ]);
      this.cache.values = new Map(rows.map((row) => [row.key, row.value]));
      this.cache.channels = channels;
      this.cache.refreshFailing = false;
    } catch (error) {
      if (!this.cache.refreshFailing) {
        this.logger.warn("SettingService", "Settings refresh failed, using the last values", {
          error,
        });
      }
      this.cache.refreshFailing = true;
      this.cache.values ??= new Map();
      this.cache.channels ??= [];
    }
    this.cache.refreshedAt = Date.now();
  }

  private toSelectDto<K extends SettingKey>(
    key: K,
    values: Map<string, unknown>
  ): SettingSelectDto<K> {
    return {
      key,
      value: (values.get(key) ?? SETTING_DEFAULTS[key]) as Settings[K],
      default: SETTING_DEFAULTS[key],
    };
  }
}
