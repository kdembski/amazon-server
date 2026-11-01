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
7. Duplicate check per channel on the cheapest country, in its own currency: the channel goes on when the reporter has
   no reported price for the listing, country and channel (`getReportedPrice`) or the newest price is at least
   `dropSinceSentPercent` below it; otherwise that channel is skipped. Changes of the other countries and of the
   previous scrape never pass it.
8. For each remaining channel the marketplace's `CountryOutlierReporter.report` gets the listing, the sorted PLN
   prices, the `channelId` and the change of the cheapest price against that channel's reported one in percent (none
   for a channel that never got the listing; shown next to the cheapest price on Discord); it stores a
   `country_outlier_sent` event (`data.channel` = `String(channelId)`) and posts to the channel's webhook through
   `DiscordChannelService.send` (a missing channel logs an error). Then `setReportedPrice` stores the cheapest price in
   its own currency (Amazon: `AmazonCountryOutlierChannelReport`, one row per ad, country and channel).

## Known limits

- A listing that matches a channel for the first time is reported there even when its cheapest price did not change
  (a fourth country appeared, other countries rose). After that the channel gets it again only when its cheapest price
  is `dropSinceSentPercent` below the price sent there; a price that rises and comes back is not reported again.
- PLN prices in the event drift with exchange rates; the duplicate check uses the original currency.
