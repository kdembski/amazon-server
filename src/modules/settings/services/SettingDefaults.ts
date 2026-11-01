import { Settings } from "@/modules/settings/interfaces/Settings";

// Used while a key has no Setting row.
export const SETTING_DEFAULTS: Settings = {
  "countryOutlier.minPrices": 3,
  "countryOutlier.dropSinceSentPercent": 10,
  "countryOutlier.ruleGroups": [
    [
      { channelId: 3, belowMedianPercent: 90 },
      { channelId: 2, belowMedianPercent: 70 },
      { channelId: 1, belowMedianPercent: 50 },
    ],
    [
      { channelId: 4, belowMedianPercent: 70, maxPln: 50 },
      { channelId: 5, belowMedianPercent: 70, minPln: 50, maxPln: 200 },
      { channelId: 6, belowMedianPercent: 70, minPln: 200 },
    ],
  ],
  "priceDrop.dropPercent": 50,
  "priceDrop.channelId": 7,
  "reports.channelId": 8,
};
