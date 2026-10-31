# Country outlier

The same listing costs much less in one country than in the others once all prices are converted to PLN.

## Input (marketplace)

1. The marketplace's price update stores the scraped prices and counts `ad_scraped` (flushed once a minute as a `BusinessLog` row with `data.count`), then runs the detectors
   asynchronously.
2. It loads the 5 newest prices of each country of the listing, grouped per country, newest first.
3. Its `ListingPrice` mapper sets `scraped` for prices of countries in this scrape and `reportable` only for those the
   marketplace considers reportable (Amazon: `dispatchFrom === "Amazon"`).
4. It calls `AnomalyManager` with its `CountryOutlierManager` and `PriceDropManager`; both get the same prices.

## Steps (`src/modules/anomalies/country-outlier/`)

1. `CountryOutlierManager.check` drops countries missing from this scrape (`scraped = false`) and stops with fewer
   than 3 countries left.
2. Takes the newest price of each country and converts it to PLN (`CurrencyExchangeRateService.getPlnRates`); the
   copies keep the original `country` object.
3. Sorts the PLN prices ascending; the first one is the cheapest.
4. `CountryOutlierStrategy.getMatchingRules` returns nothing unless the cheapest price is reportable (country
   `active` and `reportable`).
5. `CountryOutlierEvaluator.isOverPercentageDifference` compares the cheapest price with the weighted median of all
   other PLN prices: sorted ascending with weights `n`..`1` from the cheapest, it is the first price whose cumulative
   weight passes half (mean with the next one when it is exactly half). Each rule group reports its first matching rule:

   | Group | Rule | Channel |
   |---|---|---|
   | percentage | at least 90% below the median | `3` |
   | | at least 70% below | `2` |
   | | at least 50% below | `1` |
   | amount (needs at least 70% below the median) | cheapest 0-50 PLN | `4` |
   | | 50-200 PLN | `5` |
   | | over 200 PLN | `6` |

6. Duplicate check (`isNewPrice`) on the cheapest country, in its own currency, only when a rule matched: it goes on
   when the reporter has no reported price for the listing and country (`getReportedPrice`) or the newest price is
   at least 5% below the reported price (`minPriceDrop`); otherwise it stops. Changes of the other countries and of
   the previous scrape never pass it.
7. For each matched channel (at most two, one per group) the marketplace's `CountryOutlierReporter.report` gets the
   listing, the sorted PLN prices, the channel and the change of the cheapest price against the reported one in percent
   (none for a listing never reported; shown next to the cheapest price on Discord); it stores a `country_outlier_sent` event and posts to that
   channel's Discord webhook (Amazon: `DISCORD_COUNTRY_OUTLIER_<channel>_TOKEN`). Then `setReportedPrice` stores
   the cheapest price in its own currency (Amazon: `AmazonCountryOutlierReport`, one row per ad and country).

## Known limits

- A listing that matches for the first time is reported even when its cheapest price did not change (a fourth country
  appeared, other countries rose). After that it is reported again only when its cheapest price is 5% below the
  reported one; a price that rises and comes back is not reported again.
- PLN prices in the event drift with exchange rates; the duplicate check uses the original currency.
