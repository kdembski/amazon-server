---
paths:
  - "**/modules/marketplaces/*/services/*DealCheck*"
  - "**/modules/marketplaces/*/services/*Reporter*"
  - "**/modules/anomalies/interfaces/AnomalyReporters.ts"
  - "**/shared/claude/**"
---

# Deal check

A rule with `dealCheck: true` (`countryOutlier.ruleGroups`, `priceDrop.ruleGroups`) posts its alert only when an AI
resale analysis rates the deal `KUPUJ` or `MOŻE`.

## Steps

1. The anomaly manager calls `checkDeal` of the marketplace reporter instead of `report` for the channel.
2. The Amazon reporter builds the normal alert embed (`buildEmbed` of its Discord service) and passes it with the
   prices (country outlier: PLN; price drop: newest price per country in its own currency) to `AmazonDealCheckService`.
3. `AmazonDealCheckService` queues the check, one at a time per reporter.
4. `ClaudeCliService` runs `claude -p` with the `AMAZON_DEAL_CHECK_PROMPT` system prompt: model `sonnet`, only
   `WebSearch`/`WebFetch`, env only `PATH`, `HOME`, `CLAUDE_CODE_OAUTH_TOKEN`, timeout 5 min.
5. The verdict comes from the `Werdykt: KUPUJ | MOŻE | NIE` line of the answer.
6. `KUPUJ`/`MOŻE`: stores a `deal_check_sent` event and posts the alert embed plus the analysis embed (green/yellow,
   at most 3500 characters, a surrounding code fence stripped) to the rule's channel.
7. `NIE`: info log only. No verdict or a failed run: error log, nothing sent.

## Setup

- `CLAUDE_CODE_OAUTH_TOKEN` from `claude setup-token` (Claude subscription) in the server env.
- The Docker image installs `@anthropic-ai/claude-code` at a pinned version.
- Keep `AMAZON_DEAL_CHECK_PROMPT` in sync with the `deal-check` skill.
