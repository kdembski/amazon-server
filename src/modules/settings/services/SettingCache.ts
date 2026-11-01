import { DiscordChannelSelectDto } from "@/modules/settings/dtos/DiscordChannelDtos";
import { DiscordService } from "@/shared/discord/DiscordService";

export class SettingCache {
  private static instance: SettingCache;
  values?: Map<string, unknown>;
  channels?: DiscordChannelSelectDto[];
  refreshedAt?: number;
  refreshFailing = false;
  // keyed by token, so a changed token gets a new client
  clients = new Map<string, DiscordService>();

  private constructor() {}

  public static getInstance(): SettingCache {
    if (!SettingCache.instance) {
      SettingCache.instance = new SettingCache();
    }

    return SettingCache.instance;
  }
}
