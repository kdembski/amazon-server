import { SettingKey, Settings } from "@/modules/settings/interfaces/Settings";

export interface SettingUpdateDto {
  value: unknown;
}

// value is null without a Setting row
export interface SettingSelectDto<K extends SettingKey = SettingKey> {
  key: K;
  value: Settings[K] | null;
}
