# Pricing error

A country's price dropped sharply against its own recent prices, in that country's currency.

## Input (marketplace)

The same as for conversion errors (see [conversion-error.md](conversion-error.md#input-marketplace)): the 5 newest
prices per country, newest first, `reportable` only for countries in this scrape that the marketplace considers
reportable.

## Steps (`src/modules/anomalies/pricing-error/`)

1. `PricingErrorManager.check` evaluates every country on its own; other countries do not affect the result.
2. A country matches when all of these hold (`PricingErrorEvaluator.isOverPercentageDifference`, `isReportable`):
   - it has at least 2 prices;
   - the newest price is at most 50% of the previous one;
   - the newest price is at most 50% of the median of the older prices (mean of the two middle ones
     for an even count), so a single lower older price does not block the report;
   - the newest price is reportable (country `active` and `reportable`).
3. Without a matching country nothing happens. Otherwise the marketplace's `PricingErrorReporter.report` gets the
   listing and the price histories of all matching countries; it stores one `pricing_error_sent` event with the newest
   price of each and posts one Discord message (Amazon: `DISCORD_PRICING_ERROR_TOKEN`). The Amazon message shows per
   country the history oldest first, collapsed to price changes, each with its percentage to the previous change.

## Repeats

The next scrape with the same low price fails "at most 50% of the previous one", so a drop is reported once. A
country missing from the scrape is never reportable, so an old drop of that country is not reported again.
