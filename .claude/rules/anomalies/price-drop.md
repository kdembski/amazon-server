---
paths:
  - "**/modules/anomalies/price-drop/**"
  - "**/modules/marketplaces/*/services/*PriceDrop*"
  - "**/modules/anomalies/*.ts"
  - "**/modules/anomalies/interfaces/**"
  - "**/modules/marketplaces/*/mappers/*ListingPriceMapper*"
  - "**/modules/marketplaces/*/mappers/*RecentPriceMapper*"
  - "**/modules/marketplaces/*/services/*AdService*"
  - "**/modules/marketplaces/*/repositories/*AdPriceRepository*"
  - "**/modules/settings/services/SettingValidator*"
  - "**/modules/settings/interfaces/Settings.ts"
---

# Price drop

A country's price dropped sharply against its own recent prices, in that country's currency.

## Input (marketplace)

The same as for country outliers (`.claude/rules/anomalies/country-outlier.md`; keep both in sync when changing the
marketplace input): per country the newest price and the last seen lowest older price of any seller (180-day retention), `reportable` only for countries in this scrape that
the marketplace considers reportable. Check production with the `database` skill (`BusinessLog` type `price_drop_sent`).

## Settings

`priceDrop.ruleGroups` (`Setting`, changed through `PUT /settings/priceDrop.ruleGroups`): groups of rules
`{ channelId, dropPercent }`; without the row nothing is reported.

Production rule groups:

| Group | Rule | Channel |
|---|---|---|
| 1 | at least 50% below the lowest older price | `7` |

## Steps (`src/modules/anomalies/price-drop/`)

1. `PriceDropManager.check` keeps the countries whose newest price is reportable (country `active` and `reportable`,
   `isReportable`); none left: stops.
2. `PriceDropRuleMatcher.getMatches` checks every country on its own; other countries do not affect its result.
3. Per country each group takes its first rule, in list order, that matches
   (`PriceDropEvaluator.isOverPercentageDifference`): the country has an older price and the newest price is at least
   the rule's `dropPercent` below the lowest older price, so a temporary spike (47 → 111 → 44) is not a drop.
4. A country matching any rule is a matched country; the distinct `channelId`s of all matched rules are the channels.
5. Without a channel nothing happens. Otherwise, per channel, the marketplace's `PriceDropReporter.report` gets the
   listing, the price histories of all matched countries and the `channelId`; it stores one `price_drop_sent` event
   (`data.channel` = `String(channelId)`) with the newest price of each country and posts one Discord message to that
   `DiscordChannel`. The Amazon message shows per country the lowest older and the newest price with the percentage
   between them.

## Repeats

The next scrape with the same low price fails the drop against the lowest older price, which is now the low price
itself, so a drop is reported once. A country missing from the scrape is never reportable, so an old drop of that
country is not reported again.
