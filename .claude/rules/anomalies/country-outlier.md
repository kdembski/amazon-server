---
paths:
  - "**/modules/anomalies/country-outlier/**"
  - "**/modules/marketplaces/*/services/*CountryOutlier*"
  - "**/modules/marketplaces/*/repositories/*CountryOutlier*"
  - "**/modules/anomalies/*.ts"
  - "**/modules/anomalies/interfaces/**"
  - "**/modules/anomalies/types/**"
  - "**/modules/marketplaces/*/mappers/*ListingPriceMapper*"
  - "**/modules/marketplaces/*/mappers/*RecentPriceMapper*"
  - "**/modules/marketplaces/*/services/*AdService*"
  - "**/modules/marketplaces/*/repositories/*AdPriceRepository*"
  - "**/modules/settings/services/SettingValidator*"
  - "**/modules/settings/types/settings.ts"
---

# Country outlier

The same listing costs much less in one country than in the others once all prices are converted to PLN.

## Input (marketplace)

1. The marketplace's price update stores the scraped prices and counts `ad_scraped` (flushed once a minute as a `BusinessLog` row with `data.count`), then runs the detectors
   asynchronously.
2. It loads per country of the listing the newest price and the last seen lowest older price of any seller (180-day retention),
   newest first.
3. Its `ListingPrice` mapper sets `scraped` for prices of countries in this scrape and `reportable` only for those the
   marketplace considers reportable (Amazon: `dispatchFrom === "Amazon"`).
4. It calls `AnomalyManager` with its `CountryOutlierManager` and `PriceDropManager`; both get the same prices.
   Keep `.claude/rules/anomalies/price-drop.md` in sync when changing this input.

Check production with the `database` skill (`BusinessLog` types `country_outlier_sent`, `ad_scraped` — one row per
minute, sum `data.count`).

## Settings

Every parameter is a row of `Setting` (`src/modules/settings`), changed through `PUT /settings/:key`; without its
row a detector skips its work (no defaults in code). Channels are `DiscordChannel` rows (`id`, `name`, webhook `token`), changed
through `/discord-channels`. `SettingService` caches both for 60 s per process.

- `countryOutlier.minPrices` (3): minimum number of countries in the scrape.
- `countryOutlier.ruleGroups`: groups of rules
  `{ channelId, belowMedianPercent, minPln?, maxPln?, minPrices?, dropPercent?, dealCheck? }`.
- `countryOutlier.dropSinceSentPercent` (10): drop since the reported price needed by every channel.

Production rule groups (the values in parentheses are the production values too):

| Group | Rule | Channel |
|---|---|---|
| 1 | at least 70% below the median and cheapest price 50% below its lowest older price, deal check | `10` |
| | at least 90% below, deal check | `3` |
| | at least 70% below | `2` |
| | at least 50% below | `1` |
| 2 | at least 70% below and cheapest under 50 PLN | `4` |
| | at least 70% below and 50 to under 200 PLN | `5` |
| | at least 70% below and 200 PLN or more | `6` |

## Steps (`src/modules/anomalies/country-outlier/`)

1. `CountryOutlierManager.check` drops countries with `scraped = false`.
2. Stops with fewer than `minPrices` countries left.
3. Converts the newest price of each country to PLN (`CurrencyExchangeRateService.getPlnRates`), keeping the original
   `country` object.
4. Sorts the PLN prices ascending; the first is the cheapest.
5. `CountryOutlierRuleMatcher.getMatches` returns nothing unless the cheapest country is `active` and `reportable`.
6. Builds a `CountryOutlierRule` per rule setting and takes the first matching rule of each group, in list order.
7. A rule matches when the cheapest is at most `median × (1 − belowMedianPercent / 100)`
   (`CountryOutlierEvaluator.isOverPercentageDifference`), `minPln ≤ cheapest < maxPln` (`isInRange`, a missing
   bound is open) and the scrape has at least `max(countryOutlier.minPrices, rule minPrices)` countries; otherwise
   the next rule of the group is tried. A rule with `dropPercent` also needs the newest price of the cheapest country
   at least `dropPercent` below its lowest older price, in its own currency (`PriceDropEvaluator`); without an older
   price it does not match.
8. Median: weighted median of the other PLN prices, ascending, weights `n`..`1` from the cheapest; the first price whose
   cumulative weight passes half, or the mean with the next one at exactly half.
9. Merges matches by `channelId`; a channel in several groups is reported once, with the `dealCheck` of its rule in
   the earliest group.
10. No match: stops. Then it stops when the newest price of the cheapest country is above its lowest older price
    (`CountryOutlierEvaluator.isAtLowest`); without an older price it goes on.
11. Without the `countryOutlier.dropSinceSentPercent` row: stops. Gets the reported price of the cheapest country
    (`getReportedPrice`: the last price sent to any channel, in its own currency); with one, stops unless the newest
    price is at least `dropSinceSentPercent` below it. Changes of other countries or since the previous scrape never
    pass.
12. Per matched channel, `CountryOutlierReporterI.report` gets the listing, the sorted PLN prices, the `channelId` and
    the cheapest price's change in percent against the lowest older price of its country (none without one; shown next
    to the cheapest price on Discord); a `dealCheck` channel goes to `CountryOutlierReporterI.checkDeal` with the same
    arguments instead.
13. The reporter stores a `country_outlier_sent` event (`data.channel` = `String(channelId)`) and posts through
    `DiscordChannelService.send` (a missing channel logs an error).
14. `setReportedPrice` stores the cheapest price once, in its own currency (Amazon: `AmazonCountryOutlierReport`, one
    row per ad and country).

## Known limits

- A listing whose cheapest country had a lower price of any seller at any time in the last 180 days is not reported,
  however far below the median it is.
- A listing that matches for the first time is reported even when its cheapest price equals its lowest older price (a
  fourth country appeared, other countries rose). After that it is reported only when its cheapest price is
  `dropSinceSentPercent` below the last reported price; a price that rises and comes back is not reported again.
- A listing that only moves into a stronger rule without a price drop is not reported there.
- A `dropPercent` rule never matches a cheapest country without an older price.
- PLN prices in the event drift with exchange rates; the duplicate check uses the original currency.
