import { describe, expect, it } from "vitest";
import { SETTING_KEYS, SettingValidator } from "@/modules/settings/services/SettingValidator";
import { TEST_SETTINGS } from "../../../../support/factories";

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
    expect(validator.validateKey("priceDrop.ruleGroups")).toBe("priceDrop.ruleGroups");
  });

  it.each(["unknown", "toString"])("rejects the key %s", (key) => {
    expectInvalid(() => validator.validateKey(key), `Unknown setting "${key}"`);
  });
});

describe("SettingValidator.validate", () => {
  it.each(SETTING_KEYS)("accepts the production value of %s", (key) => {
    expect(validator.validate(key, TEST_SETTINGS[key], [1, 2, 3, 4, 5, 6, 7, 8])).toEqual(TEST_SETTINGS[key]);
  });

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

  it("accepts the reports channel when it exists", () => {
    expect(validator.validate("reports.channelId", 3, CHANNELS)).toBe(3);
  });

  it.each([4, 1.5, "1"])("rejects the reports channel %s", (value) => {
    expectInvalid(
      () => validator.validate("reports.channelId", value, CHANNELS),
      'Setting "reports.channelId" must be the id of an existing Discord channel'
    );
  });

  it("returns the price drop rule groups", () => {
    const groups = [
      [
        { channelId: 1, dropPercent: 70 },
        { channelId: 2, dropPercent: 50 },
      ],
      [{ channelId: 3, dropPercent: 100 }],
    ];

    expect(validator.validate("priceDrop.ruleGroups", groups, CHANNELS)).toEqual(groups);
  });

  it.each([
    ["not an array", {}, 'Setting "priceDrop.ruleGroups" must be an array of rule groups'],
    ["an empty group", [[]], 'Setting "priceDrop.ruleGroups"[0] must be a non-empty array of rules'],
    ["a rule that is no object", [[1]], 'Setting "priceDrop.ruleGroups"[0][0] must be an object'],
    [
      "a country outlier field",
      [[{ channelId: 1, dropPercent: 50, minPln: 10 }]],
      'Setting "priceDrop.ruleGroups"[0][0] has an unknown field "minPln"',
    ],
    [
      "a missing channel",
      [[{ channelId: 9, dropPercent: 50 }]],
      'Setting "priceDrop.ruleGroups"[0][0].channelId must be the id of an existing Discord channel',
    ],
    [
      "a dropPercent of 0",
      [[{ channelId: 1, dropPercent: 0 }]],
      'Setting "priceDrop.ruleGroups"[0][0].dropPercent must be a number greater than 0 and at most 100',
    ],
    [
      "a dropPercent over 100",
      [[{ channelId: 1, dropPercent: 101 }]],
      'Setting "priceDrop.ruleGroups"[0][0].dropPercent must be a number greater than 0 and at most 100',
    ],
  ])("rejects price drop rule groups with %s", (_, value, message) => {
    expectInvalid(() => validator.validate("priceDrop.ruleGroups", value, CHANNELS), message);
  });

  it("returns the rule groups with only the given fields", () => {
    const groups = [
      [
        { channelId: 3, belowMedianPercent: 90, dropPercent: 50 },
        { channelId: 1, belowMedianPercent: 50 },
      ],
      [{ channelId: 2, belowMedianPercent: 70, minPln: 0, maxPln: 50 }],
      [{ channelId: 2, belowMedianPercent: 70, minPln: 200, minPrices: 2 }],
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
      "a dropPercent of 0",
      ruleGroups({ dropPercent: 0 }),
      'Setting "countryOutlier.ruleGroups"[0][0].dropPercent must be a number greater than 0 and at most 100',
    ],
    [
      "a minPrices below 2",
      ruleGroups({ minPrices: 1 }),
      'Setting "countryOutlier.ruleGroups"[0][0].minPrices must be an integer of at least 2',
    ],
    [
      "a fractional minPrices",
      ruleGroups({ minPrices: 4.5 }),
      'Setting "countryOutlier.ruleGroups"[0][0].minPrices must be an integer of at least 2',
    ],
  ])("rejects rule groups with %s", (_, value, message) => {
    expectInvalid(() => validator.validate("countryOutlier.ruleGroups", value, CHANNELS), message);
  });

  it("keeps dealCheck of a country outlier rule", () => {
    const groups = ruleGroups({ dealCheck: true });
    expect(validator.validate("countryOutlier.ruleGroups", groups, CHANNELS)).toEqual(groups);
  });

  it("keeps dealCheck of a price drop rule", () => {
    const groups = [[{ channelId: 1, dropPercent: 80, dealCheck: false }]];
    expect(validator.validate("priceDrop.ruleGroups", groups, CHANNELS)).toEqual(groups);
  });

  it("omits dealCheck when absent", () => {
    const groups = [[{ channelId: 1, dropPercent: 80 }]];
    const [[rule]] = validator.validate("priceDrop.ruleGroups", groups, CHANNELS);
    expect(rule).not.toHaveProperty("dealCheck");
  });

  it.each([
    ["priceDrop.ruleGroups", [[{ channelId: 1, dropPercent: 80, dealCheck: "yes" }]]],
    ["countryOutlier.ruleGroups", ruleGroups({ dealCheck: 1 })],
  ] as const)("rejects a non-boolean dealCheck in %s", (key, value) => {
    expectInvalid(
      () => validator.validate(key, value, CHANNELS),
      `Setting "${key}"[0][0].dealCheck must be a boolean`
    );
  });

  it("rejects the removed requireSent and dropSinceSentPercent of a country outlier rule", () => {
    expectInvalid(
      () => validator.validate("countryOutlier.ruleGroups", ruleGroups({ requireSent: true }), CHANNELS),
      'Setting "countryOutlier.ruleGroups"[0][0] has an unknown field "requireSent"'
    );
    expectInvalid(
      () => validator.validate("countryOutlier.ruleGroups", ruleGroups({ dropSinceSentPercent: 10 }), CHANNELS),
      'Setting "countryOutlier.ruleGroups"[0][0] has an unknown field "dropSinceSentPercent"'
    );
  });
});
