---
name: exclusion-rules
description: Use when asked to create, extend, review or fix exclusion rules of any marketplace (AmazonExclusionRule and others, excluded), to keep junk of a category or product group out of scraping, or to explain why an ad was or was not scraped or reported to Discord.
---

# Exclusion rules

Marketplace specifics (tables, endpoints, demand sources, scripts) live in sub files; read the one of the
marketplace first:

- Amazon: [amazon/amazon.md](amazon/amazon.md)

## Overview

- Exclusion rules are per marketplace; each marketplace implements `ExclusionRuleTarget`.
- Every ad of an active category is scraped unless a rule matches its name.
- `ExclusionRuleMatchCronService` sets the ad's `excluded` via `ScopedExclusionRuleMatcher`
  (`src/modules/exclusion-rules/services/`): `true` when a rule matches, the category is inactive, or the category
  has inverted rules and none matches, else `false`.
- `categoryId = NULL` rule applies to every category; with `categoryId` only to that category.
- `inverted = true` (needs `categoryId`): the rule says what the category looks for; normal and global rules still
  exclude inside it.
- Rules live in the production database; change them yourself through the marketplace's exclusion-rules API, only
  after verifying the set with the production matcher.
- Only known brands pass: exclude junk product types, accessories, parts and no-name products (see Brands).

## Syntax

Parsed by `ExclusionRuleParser`, same for every marketplace.

- `a + b`: name contains `a` and `b`.
- `a|b`: contains `a` or `b`.
- `!a` inside a rule: exception, names containing `a` are not excluded; a rule of only `!` members is invalid (400).
- `!` once per `+` member, before its first phrase: `x + !a|b|c` excepts `a`, `b` and `c`. `!a|!b` is invalid (400).
- `word`: whole word (letters and digits form words); multi-word or punctuated phrase matches as a whole.
- `word*` / `*word` / `*word*`: starts with / ends with / contains; `*` only at a phrase edge, so a multi-word
  phrase takes `*` only before its first or after its last word (`łańcuszek na smocz*`, `łańcusz* + smocz*`;
  not `łańcusz* na smocz*`).
- Case and diacritics folded on both sides.
- Max 512 characters (`VarChar(512)`); values unique per category.
- Rules cannot see prices; exclude cheap items by product-type words.

## Tools

- Run from the repo root; keep all lists and downloads in the scratchpad; new helpers as plain `.js` (ESM) or `.sh`.
- `check-rules.js` imports the production parser and matcher through `@/`: run with `npx vite-node`, not `node`.

```bash
K=.claude/skills/exclusion-rules/scripts
npx vite-node $K/check-rules.js check <rules.txt> [--category id] [--junk f] [--keep f] [--kept n]
    [--min-rating stars] [--min-reviews n] [--min-bought n] [products.tsv...]
npx vite-node $K/check-rules.js which <rules.txt> [--category id] "<ad name>"
```

- `rules.txt`: one rule per line, `<value>`, `<categoryId>\t<value>` or `<categoryId>\tinverted\t<value>`;
  `check`/`which` use global rules plus the
  `--category` rules; tsv products have no category.
- `products.tsv`: `source, price, reviews, bought/month, rating, title` per line, from the marketplace's parser.
- `--junk` / `--keep`: ad names that must be excluded / must pass.
- `check` prints `COVERAGE` (in-demand passing, kept under 40 zł), in-demand products each rule excludes, and with
  `--kept n` the n cheapest passing products outside demand (candidates for new rules).

## Demand

- Never exclude products with demand above the category average, except no-name products.
- Signals: review count, bought per month, presence in bestsellers; quality floor: star rating.
- Default floors: rating at least 3.5 and 50 reviews or 50 bought per month; agree other floors with the user.
- Sample each category and its child categories from the marketplace's demand sources.

## Brands

- Known brand: manufacturer with a recognisable name in the category (Sony, Bosch, LEGO); not a random letter string
  or seller label (`Generic`). Read it from the first word(s) of the name and the listing's brand field.
- Whitelist per product type: `<type phrases> + !<brand>|<brand>|...`. All brands of a type must fit in that one
  rule (any matching rule excludes); use narrow types and short `stem*` brands.
- Brand list does not fit: exclude the seen no-name brands by name (`generic|...`) with the `categoryId`.
- Names without any brand are no-name.
- Keep list: a product of every known brand; junk list: no-name products.

## Workflow

1. Fetch live rules, never assume the last set you produced; keep the JSON for ids.
2. Junk list: every unwanted ad the user reported; keep list: products that must stay.
3. Fetch and parse the demand sources, read the cheapest passing products outside demand; group junk into product
   types, accessories, parts and no-name brands; list known brands that must pass.
4. Edit rules, rerun the check until no `TOO LONG`, `DUPLICATE`, `PARSE ERROR`, `JUNK KEPT`, `KEEP EXCLUDED`, and
   the user accepted every in-demand product excluded.
5. Apply the difference in one `POST <exclusion-rules>/batch` call, never one call per rule (each change rematches
   the ads of its category, a rule without a category all ads):
   - `{"create": [{"value", "categoryId", "inverted"?}], "update": [{"id", "value"?, "categoryId"?, "inverted"?}],
     "delete": [id]}`; omitted lists are empty; `inverted: true` also needs `categoryId` in the same item.
   - One transaction (deletes, updates, creates); any error rolls back: 400 invalid rule, id or inverted, 422 duplicate or
     unknown `categoryId`, 500 unknown id.
   - Report each change (type, id, value, category), HTTP status, coverage before/after, in-demand items each new
     rule excludes. Cron rematches within a minute.

## Diagnosing a reported ad

1. Fetch live rules; get the ad via the `database` skill (`name`, `excluded`, `scrapedAt`, `categoryId`) and its
   category's `active`; run `which` with the exact name and `--category`.
2. Unwanted, not excluded: add a narrow rule, name to junk list, rerun the check.
3. Wanted, excluded: narrow the printed rule or add a `!` exception, name to keep list, rerun the check.
4. `which` disagrees with `excluded`: stale flag (compare `scrapedAt` with `MAX(createdAt)` of the rule table), other
   rules in the database, wrong `categoryId`, or inactive category (always `excluded = true`, `which` does not see
   it). Say which; leave rules unchanged.

## Rule design

- Narrow: name the product type; add brand or model only when the type alone hits wanted products.
- Accessories and parts: exclude fit/part wording ("do …", "na …", "kompatybilny", "zamiennik", "pasuje", etui,
  kabel, holder, repair words) with the polluted category's `categoryId`; global rules only for words no wanted
  product in any category contains.
- Rule hits a wanted line: add a `!` exception, don't drop the rule.
- Exclude neighbouring classes sharing model names (laptops and PCs in a GPU category).
- Prefer `stem*` over listing Polish word forms.
