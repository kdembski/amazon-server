---
name: search-rules
description: Use when asked to create, extend, review or fix SearchRule values (search rules, matchesRules), to cover an Amazon category or product group with rules, or to explain why an ad was scraped or reported to Discord.
---

# Search rules

## Overview

`SearchRule` rows decide which ads get scraped: `SearchRuleMatchCronService` sets `AmazonAd.matchesRules`
with `createSearchRuleMatcher` from `src/modules/search-rules/helpers/searchRule.ts`. Rules are data in the production database,
delivered to the user as SQL. Verify every rule set with the production matcher before handing it over.

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
listings: review count, "X+ kupionych w ciągu ostatniego miesiąca", price, and presence in category
bestsellers. Sample each category from several sources:

| Source | URL |
|---|---|
| Category by popularity | `https://www.amazon.pl/s?i=<root>&rh=n%3A<node id>&s=exact-aware-popularity-rank&page=<n>` |
| Keyword by popularity | `https://www.amazon.pl/s?k=<words>&s=exact-aware-popularity-rank&page=<n>` |
| Bestsellers | `https://www.amazon.pl/gp/bestsellers/<root>/<node id>` (`?pg=2` for ranks 51–100) |

Child categories come from a bestsellers page sidebar (`child-nodes.js`). Agree the demand floors with the
user when they differ from the defaults (60 zł, 100 reviews or 50 bought per month).

## Tools

Plain Node scripts, no build step; `check-rules.js` imports the production `searchRule.ts` through Node's
built-in type stripping (Node 22.18+). Run from the repo root; keep rule lists, name lists and downloads in
the scratchpad directory. Write any new helper script as plain `.js` (ESM) or `.sh`.

```bash
K=.claude/skills/search-rules/scripts
bash $K/fetch.sh <dir> <url>...                      # WebFetch gets 503 on amazon.pl
node $K/child-nodes.js <bestsellers.html>            # child category ids and names
node $K/parse-listing.js <dir> <products.tsv>        # price, reviews, bought/month, title
node $K/check-rules.js check <rules.txt> [--junk f] [--keep f] [--missed n] [--min-price zł]
    [--min-reviews n] [--min-bought n] [products.tsv...]
node $K/check-rules.js which <rules.txt> "<ad name>"
node $K/to-sql.js <rules.txt> > <replace-rules.sql>  # DELETE + INSERT in one transaction
```

`rules.txt` holds one rule per line; `--junk` / `--keep` files hold ad names that must not / must match.

## Workflow

1. Get the live rules first (`SELECT value FROM SearchRule ORDER BY id;`); never assume the database holds
   the last set you produced.
2. Collect every false positive the user reported in this conversation into a junk list and the products the
   rules must cover into a keep list.
3. For new coverage, fetch the category and its children from the sources in Demand, parse them and read the
   `--missed` list. Group the in-demand products into brands, product lines and product types.
4. Edit the rules and run `check` until it reports no `TOO LONG`, `DUPLICATE`, `PARSE ERROR`, `JUNK MATCHED`
   or `KEEP MISSED` line, in-demand coverage does not drop, and every rule listed with cheap hits is reviewed.
5. Hand over the full SQL from `to-sql.js` (paste it and give the file path) with coverage before and after
   and the wanted items each new exclusion drops.

## Diagnosing a reported ad

1. Run `which` with the exact ad name against the live rules.
2. Match: narrow that rule, add the name to the junk list and rerun `check` on all data.
3. No match: the flag is stale (scraped before the cron rematch) or the database holds other rules; say which
   and leave the rules unchanged.

## Rule design

- Give every short, generic or brand-only phrase a second required member naming the product type.
- A brand-wide rule also catches the brand's cheap merchandise; add per-rule exclusions for those types.
- Accessories and spare parts name the device they fit. Exclude fit and part wording ("do …", "na …",
  "kompatybilny", "zamiennik", "pasuje", case, bag, holder, repair words).
- Exclusions also hit wanted listings whose descriptions mention the word; check `check` coverage and the
  keep list after adding one.
- A global exclusion applies to every category; use it only for words no wanted product contains.
- Add exclusions for neighbouring product classes that share model names (laptops and PCs for GPUs).
- Prefer prefix phrases (`stem*`) for Polish inflection over listing word forms.
