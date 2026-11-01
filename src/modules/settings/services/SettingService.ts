import { SettingKey, Settings } from "@/modules/settings/interfaces/Settings";
import { SettingSelectDto } from "@/modules/settings/dtos/SettingDtos";
import { SettingRepository } from "@/modules/settings/repositories/SettingRepository";
import { DiscordChannelRepository } from "@/modules/settings/repositories/DiscordChannelRepository";
import { SettingUpsertMapper } from "@/modules/settings/mappers/SettingUpsertMapper";
import { SettingCache } from "@/modules/settings/services/SettingCache";
import { SETTING_KEYS, SettingValidator } from "@/modules/settings/services/SettingValidator";
import { SystemLogService } from "@/shared/logging/services/SystemLogService";

// The worker rereads the settings the api process stores.
const SETTING_TTL_MS = 60_000;
const MISSING_ERROR_INTERVAL_MS = 60_000;

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

  // Undefined without a Setting row: the caller skips its work.
  async get<K extends SettingKey>(key: K): Promise<Settings[K] | undefined> {
    const values = await this.getValues();
    const value = values.get(key) as Settings[K] | undefined;
    if (value === undefined) this.logMissing(key);
    return value;
  }

  async getAll() {
    const values = await this.getValues();
    return SETTING_KEYS.map((key) => this.toSelectDto(key, values));
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
    const old = (await this.getValues()).get(settingKey) ?? null;

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

  invalidate() {
    this.cache.refreshedAt = undefined;
  }

  private async getValues() {
    await this.refresh();
    return this.cache.values!;
  }

  // A failed read keeps the last values (none on a cold start) until the next TTL.
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

  // At most once a minute per key
  private logMissing(key: SettingKey) {
    const now = Date.now();
    const loggedAt = this.cache.missingLoggedAt.get(key);
    if (loggedAt !== undefined && now - loggedAt < MISSING_ERROR_INTERVAL_MS) return;

    this.cache.missingLoggedAt.set(key, now);
    this.logger.error("SettingService", `Setting ${key} is missing, its work is skipped`, { key });
  }

  private toSelectDto<K extends SettingKey>(
    key: K,
    values: Map<string, unknown>
  ): SettingSelectDto<K> {
    return { key, value: (values.get(key) ?? null) as Settings[K] | null };
  }
}
