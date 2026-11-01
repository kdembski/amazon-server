import { describe, expect, it } from "vitest";
import { SettingValidator } from "@/modules/settings/services/SettingValidator";

const validator = new SettingValidator();
const CHANNELS = [1, 2, 3];

const ruleGroups = (rule: Record<string, unknown>) => [[{ channelId: 1, belowMedianPercent: 50, ...rule }]];

const expectInvalid = (fn: () => unknown, message: string) => {
  try {
    fn();
  } catch (error: any) {
    expect(error.status).toBe(400);
    expect(error.message).toBe(message);
    return;
  }
  throw new Error("expected a validation error");
};

describe("SettingValidator.validateKey", () => {
  it("returns a known key", () => {
    expect(validator.validateKey("priceDrop.dropPercent")).toBe("priceDrop.dropPercent");
  });

  it.each(["unknown", "toString"])("rejects the key %s", (key) => {
    expectInvalid(() => validator.validateKey(key), `Unknown setting "${key}"`);
  });
});

describe("SettingValidator.validate", () => {
  it.each([2, 5])("accepts minPrices %s", (value) => {
    expect(validator.validate("countryOutlier.minPrices", value, CHANNELS)).toBe(value);
  });

  it.each([1, 2.5, "3"])("rejects minPrices %s", (value) => {
    expectInvalid(
      () => validator.validate("countryOutlier.minPrices", value, CHANNELS),
      'Setting "countryOutlier.minPrices" must be an integer of at least 2'
    );
  });

  it.each([0, 10, 100])("accepts dropSinceSentPercent %s", (value) => {
    expect(validator.validate("countryOutlier.dropSinceSentPercent", value, CHANNELS)).toBe(value);
  });

  it.each([-1, 101, "10"])("rejects dropSinceSentPercent %s", (value) => {
    expectInvalid(
      () => validator.validate("countryOutlier.dropSinceSentPercent", value, CHANNELS),
      'Setting "countryOutlier.dropSinceSentPercent" must be a number at least 0 and at most 100'
    );
  });

  it.each([0, 101])("rejects dropPercent %s", (value) => {
    expectInvalid(
      () => validator.validate("priceDrop.dropPercent", value, CHANNELS),
      'Setting "priceDrop.dropPercent" must be a number greater than 0 and at most 100'
    );
  });

  it("accepts the channel of price drops and reports when it exists", () => {
    expect(validator.validate("priceDrop.channelId", 2, CHANNELS)).toBe(2);
    expect(validator.validate("reports.channelId", 3, CHANNELS)).toBe(3);
  });

  it.each([4, 1.5, "1"])("rejects the price drop channel %s", (value) => {
    expectInvalid(
      () => validator.validate("priceDrop.channelId", value, CHANNELS),
      'Setting "priceDrop.channelId" must be the id of an existing Discord channel'
    );
  });

  it("returns the rule groups with only the given fields", () => {
    const groups = [
      [
        { channelId: 3, belowMedianPercent: 90, dropSinceSentPercent: 0 },
        { channelId: 1, belowMedianPercent: 50 },
      ],
      [{ channelId: 2, belowMedianPercent: 70, minPln: 0, maxPln: 50 }],
      [{ channelId: 2, belowMedianPercent: 70, minPln: 200 }],
    ];

    expect(validator.validate("countryOutlier.ruleGroups", groups, CHANNELS)).toEqual(groups);
  });

  it("accepts no rule groups", () => {
    expect(validator.validate("countryOutlier.ruleGroups", [], CHANNELS)).toEqual([]);
  });

  it.each([
    ["not an array", {}, 'Setting "countryOutlier.ruleGroups" must be an array of rule groups'],
    ["an empty group", [[]], 'Setting "countryOutlier.ruleGroups"[0] must be a non-empty array of rules'],
    ["a group that is no array", [{}], 'Setting "countryOutlier.ruleGroups"[0] must be a non-empty array of rules'],
    ["a rule that is no object", [[[1]]], 'Setting "countryOutlier.ruleGroups"[0][0] must be an object'],
    ["a null rule", [[null]], 'Setting "countryOutlier.ruleGroups"[0][0] must be an object'],
    [
      "an unknown field",
      ruleGroups({ percent: 50 }),
      'Setting "countryOutlier.ruleGroups"[0][0] has an unknown field "percent"',
    ],
    [
      "a missing channel",
      ruleGroups({ channelId: 9 }),
      'Setting "countryOutlier.ruleGroups"[0][0].channelId must be the id of an existing Discord channel',
    ],
    [
      "a missing belowMedianPercent",
      [[{ channelId: 1 }]],
      'Setting "countryOutlier.ruleGroups"[0][0].belowMedianPercent must be a number greater than 0 and at most 100',
    ],
    [
      "a negative minPln",
      ruleGroups({ minPln: -1 }),
      'Setting "countryOutlier.ruleGroups"[0][0].minPln must be a number of at least 0',
    ],
    [
      "an infinite maxPln",
      ruleGroups({ maxPln: Infinity }),
      'Setting "countryOutlier.ruleGroups"[0][0].maxPln must be a number of at least 0',
    ],
    [
      "maxPln not above minPln",
      ruleGroups({ minPln: 50, maxPln: 50 }),
      'Setting "countryOutlier.ruleGroups"[0][0].maxPln must be greater than minPln and 0',
    ],
    [
      "maxPln 0",
      ruleGroups({ maxPln: 0 }),
      'Setting "countryOutlier.ruleGroups"[0][0].maxPln must be greater than minPln and 0',
    ],
    [
      "a dropSinceSentPercent over 100",
      ruleGroups({ dropSinceSentPercent: 101 }),
      'Setting "countryOutlier.ruleGroups"[0][0].dropSinceSentPercent must be a number at least 0 and at most 100',
    ],
  ])("rejects rule groups with %s", (_, value, message) => {
    expectInvalid(() => validator.validate("countryOutlier.ruleGroups", value, CHANNELS), message);
  });
});
