export interface CountryOutlierRuleSetting {
  channelId: number;
  belowMedianPercent: number;
  minPln?: number;
  maxPln?: number;
  dropSinceSentPercent?: number;
}

export interface Settings {
  "countryOutlier.minPrices": number;
  "countryOutlier.dropSinceSentPercent": number;
  "countryOutlier.ruleGroups": CountryOutlierRuleSetting[][];
  "priceDrop.dropPercent": number;
  "priceDrop.channelId": number;
  "reports.channelId": number;
}

export type SettingKey = keyof Settings;
