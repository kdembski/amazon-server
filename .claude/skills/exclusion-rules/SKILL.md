---
name: exclusion-rules
description: Use when asked to create, extend, review or fix AmazonExclusionRule values (exclusion rules, excluded), to keep junk of an Amazon category or product group out of scraping, or to explain why an ad was or was not scraped or reported to Discord.
---

# Exclusion rules

## Overview

`AmazonExclusionRule` rows decide which ads are skipped: every ad of an active `AmazonAdCategory` is scraped unless
a rule matches it. `ExclusionRuleMatchCronService` sets `AmazonAd.excluded` with `ScopedExclusionRuleMatcher` from
`src/modules/exclusion-rules/services/`: `true` when a rule matches, `false` otherwise. With no rules every ad is
scraped; ads of inactive categories are never scraped. A rule with `categoryId = NULL` applies to every category, a
rule with a `categoryId` only to ads of that category. Rules are data in the production database; change them
yourself through `/amazon/exclusion-rules`. Verify every rule set with the production matcher before applying it.

## Syntax

A rule excludes a name when:

| Form | Meaning |
|---|---|
| `a + b` | name contains `a` and `b` |
| `a\|b` | contains `a` or `b`; each alternative alone is enough |
| `!a` inside a rule | exception: the rule does not exclude names containing `a` |
| rule made only of `!` members | invalid (parse error, API answers 400) |
| `word` | whole word (letters and digits form words) |
| `word*` / `*word` / `*word*` | word starts with / ends with / contains |
| multi-word or punctuated phrase | matches as a whole, bounded by non-word characters |

- Case and diacritics are folded on both sides, so brands that differ only by a diacritic collide.
- `*` only at a phrase edge; a `*` inside a phrase is a parse error.
- Max 63 characters per rule (`VarChar(63)`); values are unique per category.
- Rules cannot see prices; exclude cheap items by product-type words.

## Demand

Never exclude products with demand above the category average. Demand signals on amazon.pl listings: review count,
"X+ kupionych w ciągu ostatniego miesiąca" and presence in category bestsellers. The quality floor is the star
rating ("4,5 z 5 gwiazdek"). Sample each category from several sources to see what passes and what each exclusion
drops:

| Source | URL |
|---|---|
| Category by popularity | `https://www.amazon.pl/s?i=<root>&rh=n%3A<node id>&s=exact-aware-popularity-rank&page=<n>` |
| Keyword by popularity | `https://www.amazon.pl/s?k=<words>&s=exact-aware-popularity-rank&page=<n>` |
| Bestsellers | `https://www.amazon.pl/gp/bestsellers/<root>/<node id>` (`?pg=2` for ranks 51–100) |

Child categories come from a bestsellers page sidebar (`child-nodes.js`). Agree the demand floors with the
user when they differ from the defaults (rating at least 4, and 100 reviews or 50 bought per month).

## Tools

Plain `.js` (ESM) and `.sh` scripts, no build step. `check-rules.js` imports the production
`ExclusionRuleParser` and `ExclusionRuleMatcher` through `@/`, so run it with `npx vite-node`, not `node`. Run from
the repo root; keep rule lists, name lists and downloads in the scratchpad directory. Write any new helper
script as plain `.js` (ESM) or `.sh`.

```bash
K=.claude/skills/exclusion-rules/scripts
bash $K/fetch.sh <dir> <url>...                      # WebFetch gets 503 on amazon.pl
node $K/child-nodes.js <bestsellers.html>            # child category ids and names
node $K/parse-listing.js <dir> <products.tsv>        # price, reviews, bought/month, rating, title
npx vite-node $K/check-rules.js check <rules.txt> [--category id] [--junk f] [--keep f] [--kept n]
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
- `--junk` / `--keep` files hold ad names that must be excluded / must pass.
- `check` prints `COVERAGE` (in-demand products that pass, kept products under 40 zł), each rule with the in-demand
  products it excludes, and with `--kept n` the n cheapest passing products outside demand: the candidates for new
  exclusions.
- `api.sh` reads `AMAZON_API_URL` from `.env`. Write request bodies to a JSON file in the scratchpad (UTF-8)
  and pass it as `@<file>`, not inline, so Polish letters survive. Invalid rules get 400, a duplicate
  `(value, categoryId)` or an unknown `categoryId` gets 422.

## Workflow

1. Get the live rules first; never assume the database holds the last set you produced:
   `bash $K/api.sh GET > rules.json`, then
   `node -e 'for (const r of JSON.parse(require("fs").readFileSync(0, "utf8"))) console.log((r.categoryId ? r.categoryId + "\t" : "") + r.value)' < rules.json > rules.txt`.
   Keep `rules.json` for the ids.
2. Collect every unwanted ad the user reported in this conversation into a junk list and the products that must
   stay scraped into a keep list.
3. Fetch the category and its children from the sources in Demand, parse them and read the `--kept` list. Group the
   junk into product types, accessories, parts and brands to exclude.
4. Edit the rules and run `check` until it reports no `TOO LONG`, `DUPLICATE`, `PARSE ERROR`, `JUNK KEPT` or
   `KEEP EXCLUDED` line, and the user accepted every in-demand product a rule excludes.
5. Apply the difference to the live rules in one `api.sh POST /batch @batch.json` call, never one call per
   rule: every rule change makes the cron rematch all ads. `batch.json` is
   `{"create": [{"value", "categoryId"}], "update": [{"id", "value"?, "categoryId"?}], "delete": [id]}` (ids from
   `rules.json`, omitted lists are empty). The batch is one transaction: deletes, then updates, then creates; any
   error (400 invalid rule or id, 422 duplicate or unknown `categoryId`, 500 unknown id) rolls everything back.
   Then report every change made (create/update/delete, id, value, category), the HTTP status, coverage before and
   after and the in-demand items each new rule excludes. The cron rematches all ads within a minute.

## Diagnosing a reported ad

1. Fetch the live rules (Workflow step 1) and the ad with the `database` skill (`name`, `excluded`, `scrapedAt`,
   `categoryId` from `AmazonAd`, by `asin`; `name` has no index) and whether its category is `active`, then run
   `which` with its exact name and `--category <its categoryId>`.
2. Unwanted ad that `which` does not exclude: add a narrow rule, add the name to the junk list and rerun `check` on
   all data.
3. Wanted ad that `which` excludes: narrow the rule it prints or add a `!` exception, add the name to the keep list
   and rerun `check`.
4. `which` disagrees with `excluded`: the flag is stale (set before the cron rematch) or the database holds other
   rules; compare `scrapedAt` with `MAX(createdAt)` of `AmazonExclusionRule` and check the ad's `categoryId` against
   the rule's, say which and leave the rules unchanged. An ad of an inactive category is never scraped, whatever
   the rules say.

## Rule design

- Keep every rule narrow: name the product type, and add the brand or model only when the type alone would hit
  wanted products.
- Accessories and spare parts name the device they fit. Exclude fit and part wording ("do …", "na …",
  "kompatybilny", "zamiennik", "pasuje", etui, kabel, holder, repair words) with the `categoryId` of the category
  they pollute; a rule without a category only for words no wanted product in any category contains.
- When a rule hits a wanted product line, add a `!` exception for it instead of dropping the rule.
- Exclusions also hit wanted listings whose descriptions mention the word; check `check` coverage and the keep list
  after adding one.
- Exclude neighbouring product classes that share model names (laptops and PCs in a GPU category).
- Prefer prefix phrases (`stem*`) for Polish inflection over listing word forms.
