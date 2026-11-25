export interface CountryOutlierRuleSetting {
  channelId: number;
  belowMedianPercent: number;
  minPln?: number;
  maxPln?: number;
  minPrices?: number;
  dropSinceSentPercent?: number;
  dealCheck?: boolean;
  requireSent?: boolean;
}

export interface PriceDropRuleSetting {
  channelId: number;
  dropPercent: number;
  dealCheck?: boolean;
}

export interface Settings {
  "countryOutlier.minPrices": number;
  "countryOutlier.dropSinceSentPercent": number;
  "countryOutlier.ruleGroups": CountryOutlierRuleSetting[][];
  "priceDrop.ruleGroups": PriceDropRuleSetting[][];
  "reports.channelId": number;
}

export type SettingKey = keyof Settings;
