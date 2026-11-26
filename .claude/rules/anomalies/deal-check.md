---
paths:
  - "**/modules/marketplaces/*/services/*DealCheck*"
  - "**/modules/marketplaces/*/helpers/deal-check*"
  - "**/modules/marketplaces/*/types/deal-check*"
  - "**/modules/marketplaces/*/services/*Reporter*"
  - "**/modules/anomalies/interfaces/*ReporterI.ts"
  - "**/shared/claude/**"
---

# Deal check

A rule with `dealCheck: true` (`countryOutlier.ruleGroups`, `priceDrop.ruleGroups`) posts its alert with an AI resale
analysis and its verdict `KUPUJ`, `MOŻE` or `NIE`.

## Steps

1. The anomaly manager calls `checkDeal` of the marketplace reporter instead of `report` for the channel; it stores
   the same `country_outlier_sent`/`price_drop_sent` event as `report`.
2. The Amazon reporter builds the normal alert embed (`buildEmbed` of its Discord service) and passes it with the
   prices (country outlier: PLN; price drop: newest price per country in its own currency) to `AmazonDealCheckService`.
3. Both reporters share `AmazonDealCheckService.getInstance()`; it queues the check, one at a time. An alert of an
   ASIN already queued or being analysed waits for that analysis and gets the same answer on its own channel.
4. `ClaudeCliService` runs `claude -p` with the `AMAZON_DEAL_CHECK_PROMPT` system prompt: model `sonnet`, only
   `WebSearch`/`WebFetch`, env only `PATH`, `HOME`, `CLAUDE_CODE_OAUTH_TOKEN`, timeout 5 min, and the answer as
   `AMAZON_DEAL_CHECK_SCHEMA` (`--json-schema`, read from `structured_output`).
5. Stores a `deal_check_sent` event and posts the alert embed plus the analysis embed to the rule's channel:
   only a description: ✅ **KUPUJ** / ❔ **MOŻE** / ❌ **NIE**, a blank line, then one line each: `Wycena:`
   (`Szacunek:` when `estimated`) with bold `minPrice`–`maxPrice` (`brak cen w wynikach wyszukiwania` when `null`)
   and `Allegro:` with one listing link built by the service from `query` (`&order=p`); then a blank line and
   `Zysk **<n> zł**`, `Sprzedaż`, `Koszt`, `ROI`, `Prowizja` without colons, separated by ` · `, only the profit
   bold (`null` left out, no line when all are); the lines after the verdict at most 700 characters.
6. No known verdict or a failed run: error log, and the alert embed alone goes to the rule's channel.

## Setup

- `CLAUDE_CODE_OAUTH_TOKEN` from `claude setup-token` (Claude subscription) in the server env.
- The Docker image installs `@anthropic-ai/claude-code` at a pinned version.
- Keep `AMAZON_DEAL_CHECK_PROMPT` in sync with the `deal-check` skill.
