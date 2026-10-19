---
name: search-rules
description: Use when asked to create, extend, review or fix AmazonSearchRule values (search rules, matchesRules), to cover an Amazon category or product group with rules, or to explain why an ad was scraped or reported to Discord.
---

# Search rules

## Overview

`AmazonSearchRule` rows decide which ads get scraped: `SearchRuleMatchCronService` sets `AmazonAd.matchesRules`
with `ScopedSearchRuleMatcher` from `src/modules/search-rules/services/`. A rule with `categoryId = NULL` applies to
every category, a rule with a `categoryId` only to ads of that `AmazonAdCategory` (exclusion-only rules too). Rules
are data in the production database; change them yourself through `/amazon/search-rules`. Verify every rule set
with the production matcher before applying it.

## Syntax

| Form | Meaning |
|---|---|
| `a + b` | name contains `a` and `b` |
| `a\|b` | contains `a` or `b`; each alternative alone is enough |
| `!a` inside a rule | that rule rejects names containing `a` |
| rule made only of `!` members | global exclusion, rejects the name for every rule |
| `word` | whole word (letters and digits form words) |
| `word*` / `*word` / `*word*` | word starts with / ends with / contains |
| multi-word or punctuated phrase | matches as a whole, bounded by non-word characters |

- Case and diacritics are folded on both sides, so brands that differ only by a diacritic collide.
- `*` only at a phrase edge; a `*` inside a phrase is a parse error.
- Max 63 characters per rule (`VarChar(63)`); values are unique.
- Rules cannot see prices; keep cheap items out with product-type words and exclusions.

## Demand

Target products with demand above the category average, not only bestsellers. Demand signals on amazon.pl
listings: review count, "X+ kupionych w ciągu ostatniego miesiąca" and presence in category bestsellers.
The quality floor is the star rating ("4,5 z 5 gwiazdek"). Sample each category from several sources:

| Source | URL |
|---|---|
| Category by popularity | `https://www.amazon.pl/s?i=<root>&rh=n%3A<node id>&s=exact-aware-popularity-rank&page=<n>` |
| Keyword by popularity | `https://www.amazon.pl/s?k=<words>&s=exact-aware-popularity-rank&page=<n>` |
| Bestsellers | `https://www.amazon.pl/gp/bestsellers/<root>/<node id>` (`?pg=2` for ranks 51–100) |

Child categories come from a bestsellers page sidebar (`child-nodes.js`). Agree the demand floors with the
user when they differ from the defaults (rating at least 4, and 100 reviews or 50 bought per month).

## Tools

Plain `.js` (ESM) and `.sh` scripts, no build step. `check-rules.js` imports the production
`SearchRuleParser` and `SearchRuleMatcher` through `@/`, so run it with `npx vite-node`, not `node`. Run from
the repo root; keep rule lists, name lists and downloads in the scratchpad directory. Write any new helper
script as plain `.js` (ESM) or `.sh`.

```bash
K=.claude/skills/search-rules/scripts
bash $K/fetch.sh <dir> <url>...                      # WebFetch gets 503 on amazon.pl
node $K/child-nodes.js <bestsellers.html>            # child category ids and names
node $K/parse-listing.js <dir> <products.tsv>        # price, reviews, bought/month, rating, title
npx vite-node $K/check-rules.js check <rules.txt> [--category id] [--junk f] [--keep f] [--missed n]
    [--min-rating stars] [--min-reviews n] [--min-bought n] [products.tsv...]
npx vite-node $K/check-rules.js which <rules.txt> [--category id] "<ad name>"
bash $K/api.sh GET                                   # all rules as JSON
bash $K/api.sh POST "" @<rule.json>                  # {"value": "...", "categoryId": 12 | null}
bash $K/api.sh PUT /<id> @<rule.json>                # changes only the fields given; categoryId null = all
bash $K/api.sh DELETE /<id>
bash $K/api.sh POST /batch @<batch.json>             # every change at once, see Workflow step 5
```

- `rules.txt` holds one rule per line, `<value>` or `<categoryId>\t<value>`. `check` and `which` use the rules
  without a category plus, with `--category`, that category's rules; products in the tsv files have no category.
- `--junk` / `--keep` files hold ad names that must not / must match.
- `api.sh` reads `AMAZON_API_URL` from `.env`. Write request bodies to a JSON file in the scratchpad (UTF-8)
  and pass it as `@<file>`, not inline, so Polish letters survive. Invalid rules get 400, a duplicate
  `(value, categoryId)` or an unknown `categoryId` gets 422.

## Workflow

1. Get the live rules first; never assume the database holds the last set you produced:
   `bash $K/api.sh GET > rules.json`, then
   `node -e 'for (const r of JSON.parse(require("fs").readFileSync(0, "utf8"))) console.log((r.categoryId ? r.categoryId + "\t" : "") + r.value)' < rules.json > rules.txt`.
   Keep `rules.json` for the ids.
2. Collect every false positive the user reported in this conversation into a junk list and the products the
   rules must cover into a keep list.
3. For new coverage, fetch the category and its children from the sources in Demand, parse them and read the
   `--missed` list. Group the in-demand products into brands, product lines and product types.
4. Edit the rules and run `check` until it reports no `TOO LONG`, `DUPLICATE`, `PARSE ERROR`, `JUNK MATCHED`
   or `KEEP MISSED` line, in-demand coverage does not drop, and every rule listed with cheap hits is reviewed.
5. Apply the difference to the live rules in one `api.sh POST /batch @batch.json` call, never one call per
   rule: every rule change makes the cron rematch all ads. `batch.json` is
   `{"create": [{"value", "categoryId"}], "update": [{"id", "value"?, "categoryId"?}], "delete": [id]}` (ids from
   `rules.json`, omitted lists are empty). The batch is one transaction: deletes, then updates, then creates; any
   error (400 invalid rule or id, 422 duplicate or unknown `categoryId`, 500 unknown id) rolls everything back.
   Then report every change made (create/update/delete, id, value, category), the HTTP status, coverage before and
   after and the wanted items each new exclusion drops. The cron rematches all ads within a minute.

## Diagnosing a reported ad

1. Fetch the live rules (Workflow step 1) and the ad with the `database` skill (`name`, `matchesRules`,
   `scrapedAt`, `categoryId` from `AmazonAd`, by `asin`; `name` has no index), then run `which` with its exact name
   and `--category <its categoryId>`.
2. Match: narrow that rule, add the name to the junk list and rerun `check` on all data.
3. No match: the flag is stale (scraped before the cron rematch) or the database holds other rules; compare
   `scrapedAt` with `MAX(createdAt)` of `AmazonSearchRule` and check the ad's `categoryId` against the rule's, say which and leave the rules unchanged.

## Rule design

- Give every short, generic or brand-only phrase a second required member naming the product type.
- A brand-wide rule also catches the brand's cheap merchandise; add per-rule exclusions for those types.
- Accessories and spare parts name the device they fit. Exclude fit and part wording ("do …", "na …",
  "kompatybilny", "zamiennik", "pasuje", case, bag, holder, repair words).
- Exclusions also hit wanted listings whose descriptions mention the word; check `check` coverage and the
  keep list after adding one.
- An exclusion-only rule without a category applies to every category; use it only for words no wanted product
  contains, otherwise give it the `categoryId` of the category it is meant for.
- Add exclusions for neighbouring product classes that share model names (laptops and PCs for GPUs).
- Prefer prefix phrases (`stem*`) for Polish inflection over listing word forms.
