import { HttpError } from "@/shared/http/HttpError";
import {
  CountryOutlierRuleSetting,
  PriceDropRuleSetting,
  SettingKey,
  Settings,
} from "@/modules/settings/types/settings";

export const SETTING_KEYS: SettingKey[] = [
  "countryOutlier.minPrices",
  "countryOutlier.dropSinceSentPercent",
  "countryOutlier.ruleGroups",
  "priceDrop.ruleGroups",
  "reports.channelId",
];

const COUNTRY_OUTLIER_RULE_FIELDS = [
  "channelId",
  "belowMedianPercent",
  "minPln",
  "maxPln",
  "minPrices",
  "dropPercent",
  "dealCheck",
];

const PRICE_DROP_RULE_FIELDS = ["channelId", "dropPercent", "dealCheck"];

export class SettingValidator {
  validateKey(key: string): SettingKey {
    if (!SETTING_KEYS.includes(key as SettingKey)) {
      throw new HttpError(400, `Unknown setting "${key}"`);
    }
    return key as SettingKey;
  }

  validate<K extends SettingKey>(key: K, value: unknown, channelIds: number[]): Settings[K] {
    const path = `Setting "${key}"`;

    switch (key) {
      case "countryOutlier.minPrices":
        return this.validateInteger(path, value, 2) as Settings[K];
      case "countryOutlier.dropSinceSentPercent":
        return this.validatePercent(path, value, true) as Settings[K];
      case "reports.channelId":
        return this.validateChannel(path, value, channelIds) as Settings[K];
      case "priceDrop.ruleGroups":
        return this.validateRuleGroups(path, value, (rulePath, rule) => {
          return this.validatePriceDropRule(rulePath, rule, channelIds);
        }) as Settings[K];
      default:
        return this.validateRuleGroups(path, value, (rulePath, rule) => {
          return this.validateCountryOutlierRule(rulePath, rule, channelIds);
        }) as Settings[K];
    }
  }

  private validateRuleGroups<T>(
    path: string,
    value: unknown,
    validateRule: (path: string, rule: unknown) => T
  ) {
    if (!Array.isArray(value)) throw new HttpError(400, `${path} must be an array of rule groups`);

    return value.map((group, i) => {
      if (!Array.isArray(group) || !group.length) {
        throw new HttpError(400, `${path}[${i}] must be a non-empty array of rules`);
      }
      return group.map((rule, j) => validateRule(`${path}[${i}][${j}]`, rule));
    });
  }

  private getRuleFields(path: string, rule: unknown, allowed: string[]) {
    if (typeof rule !== "object" || rule === null || Array.isArray(rule)) {
      throw new HttpError(400, `${path} must be an object`);
    }

    const fields = rule as Record<string, unknown>;
    const unknown = Object.keys(fields).find((field) => !allowed.includes(field));
    if (unknown) throw new HttpError(400, `${path} has an unknown field "${unknown}"`);
    return fields;
  }

  private validatePriceDropRule(path: string, rule: unknown, channelIds: number[]): PriceDropRuleSetting {
    const fields = this.getRuleFields(path, rule, PRICE_DROP_RULE_FIELDS);
    const result: PriceDropRuleSetting = {
      channelId: this.validateChannel(`${path}.channelId`, fields.channelId, channelIds),
      dropPercent: this.validatePercent(`${path}.dropPercent`, fields.dropPercent, false),
    };
    this.setBoolean(path, fields, result, "dealCheck");
    return result;
  }

  private setBoolean<K extends string>(
    path: string,
    fields: Record<string, unknown>,
    result: { [key in K]?: boolean },
    key: K
  ) {
    if (fields[key] === undefined) return;
    if (typeof fields[key] !== "boolean") {
      throw new HttpError(400, `${path}.${key} must be a boolean`);
    }
    result[key] = fields[key];
  }

  private validateCountryOutlierRule(path: string, rule: unknown, channelIds: number[]) {
    const fields = this.getRuleFields(path, rule, COUNTRY_OUTLIER_RULE_FIELDS);

    const result: CountryOutlierRuleSetting = {
      channelId: this.validateChannel(`${path}.channelId`, fields.channelId, channelIds),
      belowMedianPercent: this.validatePercent(
        `${path}.belowMedianPercent`,
        fields.belowMedianPercent,
        false
      ),
    };

    if (fields.minPln !== undefined) {
      result.minPln = this.validateAmount(`${path}.minPln`, fields.minPln);
    }
    if (fields.maxPln !== undefined) {
      result.maxPln = this.validateAmount(`${path}.maxPln`, fields.maxPln);
      if (result.maxPln <= (result.minPln ?? 0)) {
        throw new HttpError(400, `${path}.maxPln must be greater than minPln and 0`);
      }
    }
    if (fields.dropPercent !== undefined) {
      result.dropPercent = this.validatePercent(`${path}.dropPercent`, fields.dropPercent, false);
    }
    if (fields.minPrices !== undefined) {
      result.minPrices = this.validateInteger(`${path}.minPrices`, fields.minPrices, 2);
    }
    this.setBoolean(path, fields, result, "dealCheck");
    return result;
  }

  private validateInteger(path: string, value: unknown, min: number) {
    if (!Number.isInteger(value) || (value as number) < min) {
      throw new HttpError(400, `${path} must be an integer of at least ${min}`);
    }
    return value as number;
  }

  // belowMedianPercent and dropPercent need a drop; the global dropSinceSentPercent may be 0.
  private validatePercent(path: string, value: unknown, allowZero: boolean) {
    const valid =
      typeof value === "number" &&
      (allowZero ? value >= 0 : value > 0) &&
      value <= 100;
    if (!valid) {
      const lowest = allowZero ? "at least 0" : "greater than 0";
      throw new HttpError(400, `${path} must be a number ${lowest} and at most 100`);
    }
    return value;
  }

  private validateAmount(path: string, value: unknown) {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      throw new HttpError(400, `${path} must be a number of at least 0`);
    }
    return value;
  }

  private validateChannel(path: string, value: unknown, channelIds: number[]) {
    if (!Number.isInteger(value) || !channelIds.includes(value as number)) {
      throw new HttpError(400, `${path} must be the id of an existing Discord channel`);
    }
    return value as number;
  }
}
