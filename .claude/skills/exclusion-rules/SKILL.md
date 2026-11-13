---
name: exclusion-rules
description: Use when asked to create, extend, review or fix exclusion rules of any marketplace (e.g. AmazonExclusionRule), when the user sends ads that should not be scraped, or to explain why an ad was or was not scraped.
---

# Exclusion rules

Marketplace specifics (tables, API, queries) live in sub files; read the one of the marketplace first:

- Amazon: [amazon/amazon.md](amazon/amazon.md)

## How matching works

- `ExclusionRuleMatchCronService` sets each ad's `excluded` with `ScopedExclusionRuleMatcher`
  (`src/modules/exclusion-rules/services/`): `true` when a rule matches its name or its category is inactive,
  else `false`.
- Rule with `categoryId = NULL` applies to every category, with `categoryId` only to that category.
- `inverted = true` (needs `categoryId`): the category keeps only names matching one of its inverted rules; normal
  rules still exclude inside it.
- Each rule change rematches its category, a global rule all ads; a full rematch takes over an hour.

## Junk

Exclude only junk:

- Accessories and parts for the category's products: cases, covers, cables, chargers, holders, mounts, straps,
  spare and replacement parts, fit wording ("do …", "na …", "kompatybilny", "zamiennik", "pasuje").
- Small low-value items: stickers, keychains, decorations, party items, themed merch (posters, mugs, clothes).
- Neighbouring classes sharing model names (laptops and PCs in a GPU category).

Everything else passes.

## Syntax

Parsed by `ExclusionRuleParser`:

- `a + b`: name contains `a` and `b`; `a|b`: `a` or `b`.
- `!a`: exception, once per `+` member before its first phrase (`x + !a|b` excepts `a` and `b`); a rule of only `!`
  members and `!a|!b` are invalid.
- `word`: whole word; a multi-word phrase matches as a whole.
- `word*` / `*word` / `*word*`: starts with / ends with / contains; `*` only at a phrase edge
  (`łańcuszek na smocz*`, not `łańcusz* na smocz*`).
- Case and diacritics are folded; max 512 characters; values unique per category.

## Check

Run from the repo root with `npx vite-node` (imports the production matcher); keep files in the scratchpad.

```bash
K=.claude/skills/exclusion-rules/scripts
npx vite-node $K/check-rules.js check <rules.txt> [--category id] [--junk file] [--keep file]
npx vite-node $K/check-rules.js which <rules.txt> [--category id] "<ad name>"
```

- `rules.txt`: one rule per line, `<value>`, `<categoryId>\t<value>` or `<categoryId>\tinverted\t<value>`.
- `--junk` / `--keep`: ad names, one per line, that must be excluded / must pass.
- Done when it prints no `PARSE ERROR`, `TOO LONG`, `DUPLICATE`, `JUNK KEPT` or `KEEP EXCLUDED`.

## Workflow

Both workflows start from the live rules (never reuse a set from earlier), keep the rule count minimal (extend an
existing rule of the same kind with `|phrase` or a wider `stem*`, or merge rules, before adding one), end with the
check and apply the whole diff in one batch call, never one call per rule; report each change and the HTTP status.

### Full review of a category

1. Sample the category's passing ads.
2. Decide what is junk by the Junk section; group it into product types.
3. Change the rules so each type is excluded; add sampled wanted ads the rules hit to the keep list.

### Ads sent by the user

1. Find the general product type of the sent ads and the words they share.
2. Exclude the whole type, not only the sent names: sample passing ads of the category with those words and check
   that the rule hits the type and no wanted products.
3. Add the sent ads to the junk list, wanted ads the rule hits to the keep list.

## Rule design

- Name the product type; add a model or context word only when the type alone hits wanted products.
- A rule hits a wanted product: add a `!` exception, don't drop the rule.
- Use the category's `categoryId`; global only for words no wanted product in any category contains.
- Prefer `stem*` over listing Polish word forms.

## Diagnosing an ad

Get the ad and its category's `active` from the database, run `which` with the exact name and `--category`.
If `which` disagrees with `excluded`: rematch still running, wrong `categoryId`, or inactive category. Say which.
