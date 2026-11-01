# Country outlier

The same listing costs much less in one country than in the others once all prices are converted to PLN.

## Input (marketplace)

1. The marketplace's price update stores the scraped prices and counts `ad_scraped` (flushed once a minute as a `BusinessLog` row with `data.count`), then runs the detectors
   asynchronously.
2. It loads the 5 newest prices of each country of the listing, grouped per country, newest first.
3. Its `ListingPrice` mapper sets `scraped` for prices of countries in this scrape and `reportable` only for those the
   marketplace considers reportable (Amazon: `dispatchFrom === "Amazon"`).
4. It calls `AnomalyManager` with its `CountryOutlierManager` and `PriceDropManager`; both get the same prices.

## Settings

Every parameter is a row of `Setting` (`src/modules/settings`), changed through `PUT|DELETE /settings/:key`; a key
without a row uses `SETTING_DEFAULTS`. Channels are `DiscordChannel` rows (`id`, `name`, webhook `token`), changed
through `/discord-channels`. `SettingService` caches both for 60 s per process.

- `countryOutlier.minPrices` (3): minimum number of countries in the scrape.
- `countryOutlier.ruleGroups`: groups of rules `{ channelId, belowMedianPercent, minPln?, maxPln?, dropSinceSentPercent? }`.
- `countryOutlier.dropSinceSentPercent` (10): `dropSinceSentPercent` of rules without one.

Default rule groups:

| Group | Rule | Channel |
|---|---|---|
| 1 | at least 90% below the median | `3` |
| | at least 70% below | `2` |
| | at least 50% below | `1` |
| 2 | at least 70% below and cheapest under 50 PLN | `4` |
| | at least 70% below and 50 to under 200 PLN | `5` |
| | at least 70% below and 200 PLN or more | `6` |

## Steps (`src/modules/anomalies/country-outlier/`)

1. `CountryOutlierManager.check` drops countries missing from this scrape (`scraped = false`) and stops with fewer
   than `minPrices` countries left.
2. Takes the newest price of each country and converts it to PLN (`CurrencyExchangeRateService.getPlnRates`); the
   copies keep the original `country` object.
3. Sorts the PLN prices ascending; the first one is the cheapest.
4. `CountryOutlierStrategy.getMatchingRules` returns nothing unless the cheapest price is reportable (country
   `active` and `reportable`).
5. It builds a `CountryOutlierRule` per rule setting and takes the first matching rule of each group, in list order.
   A rule matches when the cheapest PLN price is at most `median × (1 − belowMedianPercent / 100)`
   (`CountryOutlierEvaluator.isOverPercentageDifference`: the weighted median of all other PLN prices, sorted ascending
   with weights `n`..`1` from the cheapest, the first price whose cumulative weight passes half, the mean with the next
   one when it is exactly half) and `minPln ≤ cheapest < maxPln` (`isInRange`, a missing bound is open).
6. Matches are merged by `channelId`; a channel matched in several groups uses the lowest `dropSinceSentPercent`.
7. Duplicate check on the cheapest country, in its own currency, against one reported price per listing and country
   (`getReportedPrice`, the last price sent to any channel): without a reported price every channel goes on;
   otherwise a channel goes on only when the newest price is at least its `dropSinceSentPercent` below the reported
   one. Without a remaining channel it stops. Changes of the other countries and of the previous scrape never pass it.
8. For each remaining channel the marketplace's `CountryOutlierReporter.report` gets the listing, the sorted PLN
   prices, the `channelId` and the change of the cheapest price against the reported one in percent (none for a
   listing never reported; shown next to the cheapest price on Discord); it stores a `country_outlier_sent` event
   (`data.channel` = `String(channelId)`) and posts to the channel's webhook through `DiscordChannelService.send` (a
   missing channel logs an error). Then `setReportedPrice` stores the cheapest price once, in its own currency
   (Amazon: `AmazonCountryOutlierReport`, one row per ad and country).

## Known limits

- A listing that matches for the first time is reported even when its cheapest price did not change (a fourth country
  appeared, other countries rose). After that a channel gets it only when its cheapest price is the channel's
  `dropSinceSentPercent` below the last reported price; a price that rises and comes back is not reported again.
- A channel with a high `dropSinceSentPercent` misses gradual drops reported on other channels (100 → 94 → 80 with 5%
  and 20%: the 20% channel gets neither), and a listing that only moves into a stronger rule without a price drop is
  not reported there.
- PLN prices in the event drift with exchange rates; the duplicate check uses the original currency.
