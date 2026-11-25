---
paths:
  - "**/modules/anomalies/country-outlier/**"
  - "**/modules/marketplaces/*/services/*CountryOutlier*"
  - "**/modules/marketplaces/*/repositories/*CountryOutlier*"
  - "**/modules/anomalies/*.ts"
  - "**/modules/anomalies/interfaces/**"
  - "**/modules/marketplaces/*/mappers/*ListingPriceMapper*"
  - "**/modules/marketplaces/*/mappers/*RecentPriceMapper*"
  - "**/modules/marketplaces/*/services/*AdService*"
  - "**/modules/marketplaces/*/repositories/*AdPriceRepository*"
  - "**/modules/settings/services/SettingValidator*"
  - "**/modules/settings/interfaces/Settings.ts"
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
  `{ channelId, belowMedianPercent, minPln?, maxPln?, minPrices?, dropSinceSentPercent?, dealCheck?, requireSent? }`.
- `countryOutlier.dropSinceSentPercent` (10): `dropSinceSentPercent` of rules without one.

Production rule groups (the values in parentheses are the production values too):

| Group | Rule | Channel |
|---|---|---|
| 1 | at least 90% below the median | `3` |
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
   the next rule of the group is tried. With a reported price (step 11) a rule also needs the newest price at least
   its `dropSinceSentPercent` below it; without one a rule matches unless it has `requireSent`, so the
   first alert of a listing falls through to the next rule.
8. Median: weighted median of the other PLN prices, ascending, weights `n`..`1` from the cheapest; the first price whose
   cumulative weight passes half, or the mean with the next one at exactly half.
9. Merges matches by `channelId`; a channel in several groups is reported once, with the `dealCheck` of its rule in
   the earliest group.
10. This first pass treats every drop since the reported price as passing; no match: stops. Then it stops when the
    newest price of the cheapest country is above its lowest older price (`CountryOutlierEvaluator.isAtLowest`);
    without an older price it goes on.
11. Gets the reported price of the cheapest country (`getReportedPrice`: the last price sent to any channel, in its own
    currency) and matches the rules again (steps 6–9) with it.
12. No channel left: stops. Changes of other countries or since the previous scrape never pass.
13. Per remaining channel, `CountryOutlierReporter.report` gets the listing, the sorted PLN prices, the `channelId` and
    the cheapest price's change in percent against the lowest older price of its country (none without one; shown next
    to the cheapest price on Discord); a `dealCheck` channel goes to `CountryOutlierReporter.checkDeal` with the same
    arguments instead (`.claude/rules/anomalies/deal-check.md`).
14. The reporter stores a `country_outlier_sent` event (`data.channel` = `String(channelId)`) and posts through
    `DiscordChannelService.send` (a missing channel logs an error).
15. `setReportedPrice` stores the cheapest price once, in its own currency (Amazon: `AmazonCountryOutlierReport`, one
    row per ad and country).

## Known limits

- A listing whose cheapest country had a lower price of any seller at any time in the last 180 days is not reported,
  however far below the median it is.
- A listing that matches for the first time is reported even when its cheapest price equals its lowest older price (a
  fourth country appeared, other countries rose). After that a channel gets it only when its cheapest price is the
  channel's `dropSinceSentPercent` below the last reported price; a price that rises and comes back is not reported
  again.
- A channel with a high `dropSinceSentPercent` misses gradual drops reported on other channels (100 → 94 → 80 with 5%
  and 20%: the 20% channel gets neither), and a listing that only moves into a stronger rule without a price drop is
  not reported there.
- PLN prices in the event drift with exchange rates; the duplicate check uses the original currency.
