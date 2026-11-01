import { SettingKey, Settings } from "@/modules/settings/interfaces/Settings";

export interface SettingUpdateDto {
  value: unknown;
}

export interface SettingSelectDto<K extends SettingKey = SettingKey> {
  key: K;
  value: Settings[K];
  default: Settings[K];
}
