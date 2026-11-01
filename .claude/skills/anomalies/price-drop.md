# Price drop

A country's price dropped sharply against its own recent prices, in that country's currency.

## Input (marketplace)

The same as for country outliers (see [country-outlier.md](country-outlier.md#input-marketplace)): the 5 newest
prices per country, newest first, `reportable` only for countries in this scrape that the marketplace considers
reportable.

## Steps (`src/modules/anomalies/price-drop/`)

1. `PriceDropManager.check` evaluates every country on its own; other countries do not affect the result.
2. A country matches when all of these hold (`PriceDropEvaluator.isOverPercentageDifference`, `isReportable`):
   - it has at least 2 prices;
   - the newest price is at least `priceDrop.dropPercent` (`Setting`, default 50) below the previous one;
   - the newest price is at least `priceDrop.dropPercent` below the median of the older prices (mean of the two
     middle ones for an even count), so a single lower older price does not block the report;
   - the newest price is reportable (country `active` and `reportable`).
3. Without a matching country nothing happens. Otherwise the marketplace's `PriceDropReporter.report` gets the
   listing and the price histories of all matching countries; it stores one `price_drop_sent` event with the newest
   price of each and posts one Discord message to the `DiscordChannel` of `priceDrop.channelId` (default 7). The Amazon message shows per
   country the history oldest first, collapsed to price changes, each with its percentage to the previous change.

## Repeats

The next scrape with the same low price fails the drop against the previous one, so a drop is reported once. A
country missing from the scrape is never reportable, so an old drop of that country is not reported again.
