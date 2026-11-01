import { SETTING_DEFAULTS } from "@/modules/settings/services/SettingDefaults";
import {
  CountryOutlierRuleSetting,
  SettingKey,
  Settings,
} from "@/modules/settings/interfaces/Settings";

const RULE_FIELDS = [
  "channelId",
  "belowMedianPercent",
  "minPln",
  "maxPln",
  "dropSinceSentPercent",
];

const invalid = (message: string) => Object.assign(new Error(message), { status: 400 });

export class SettingValidator {
  validateKey(key: string): SettingKey {
    if (!Object.prototype.hasOwnProperty.call(SETTING_DEFAULTS, key)) {
      throw invalid(`Unknown setting "${key}"`);
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
      case "priceDrop.dropPercent":
        return this.validatePercent(path, value, false) as Settings[K];
      case "priceDrop.channelId":
      case "reports.channelId":
        return this.validateChannel(path, value, channelIds) as Settings[K];
      default:
        return this.validateRuleGroups(path, value, channelIds) as Settings[K];
    }
  }

  private validateRuleGroups(path: string, value: unknown, channelIds: number[]) {
    if (!Array.isArray(value)) throw invalid(`${path} must be an array of rule groups`);

    return value.map((group, i) => {
      if (!Array.isArray(group) || !group.length) {
        throw invalid(`${path}[${i}] must be a non-empty array of rules`);
      }
      return group.map((rule, j) => this.validateRule(`${path}[${i}][${j}]`, rule, channelIds));
    });
  }

  private validateRule(path: string, rule: unknown, channelIds: number[]) {
    if (typeof rule !== "object" || rule === null || Array.isArray(rule)) {
      throw invalid(`${path} must be an object`);
    }

    const fields = rule as Record<string, unknown>;
    const unknown = Object.keys(fields).find((field) => !RULE_FIELDS.includes(field));
    if (unknown) throw invalid(`${path} has an unknown field "${unknown}"`);

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
        throw invalid(`${path}.maxPln must be greater than minPln and 0`);
      }
    }
    if (fields.dropSinceSentPercent !== undefined) {
      result.dropSinceSentPercent = this.validatePercent(
        `${path}.dropSinceSentPercent`,
        fields.dropSinceSentPercent,
        true
      );
    }
    return result;
  }

  private validateInteger(path: string, value: unknown, min: number) {
    if (!Number.isInteger(value) || (value as number) < min) {
      throw invalid(`${path} must be an integer of at least ${min}`);
    }
    return value as number;
  }

  // belowMedianPercent and dropPercent need a drop; dropSinceSentPercent may be 0.
  private validatePercent(path: string, value: unknown, allowZero: boolean) {
    const valid =
      typeof value === "number" &&
      (allowZero ? value >= 0 : value > 0) &&
      value <= 100;
    if (!valid) {
      const lowest = allowZero ? "at least 0" : "greater than 0";
      throw invalid(`${path} must be a number ${lowest} and at most 100`);
    }
    return value;
  }

  private validateAmount(path: string, value: unknown) {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      throw invalid(`${path} must be a number of at least 0`);
    }
    return value;
  }

  private validateChannel(path: string, value: unknown, channelIds: number[]) {
    if (!Number.isInteger(value) || !channelIds.includes(value as number)) {
      throw invalid(`${path} must be the id of an existing Discord channel`);
    }
    return value as number;
  }
}
