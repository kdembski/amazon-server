import { describe, expect, it } from "vitest";
import { SETTING_DEFAULTS } from "@/modules/settings/services/SettingDefaults";
import { SettingValidator } from "@/modules/settings/services/SettingValidator";
import { SettingKey } from "@/modules/settings/interfaces/Settings";

describe("SETTING_DEFAULTS", () => {
  it.each(Object.keys(SETTING_DEFAULTS) as SettingKey[])(
    "%s passes the validation with the channels 1-8",
    (key) => {
      const value = SETTING_DEFAULTS[key];
      expect(new SettingValidator().validate(key, value, [1, 2, 3, 4, 5, 6, 7, 8])).toEqual(value);
    }
  );
});
