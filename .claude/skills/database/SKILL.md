---
name: database
description: Use when a question needs live production data - ads, prices, categories, search rules, activity events, scraper metrics, currency rates - or when another task (e.g. search-rules) needs the current rows from the production MySQL database.
---

# Database

Read-only access to the production MySQL 8 database `amazon` as the `readonly` user (`SELECT`, `SHOW VIEW`).

## Running queries

```bash
bash .claude/skills/database/scripts/query.sh "SELECT ..."
bash .claude/skills/database/scripts/query.sh --raw "SELECT ..." > out.txt   # bare values, no headers
```

- Writes fail with `ERROR 1142`. Do not try them and do not look for other credentials; changes go to the user
  as SQL, except search rules, which the `search-rules` skill changes through `/amazon/search-rules`.
- On a missing config or a closed tunnel, stop and pass the script's message to the user; do not open the
  tunnel yourself.
- Never print or read `~/.mysql-readonly.cnf`.
- Queries time out after 30 s. Always add `LIMIT` (start with 50) and filter by indexed columns or date
  ranges; `AmazonAdPrice` and `ActivityEvent` are large. Run `COUNT(*)`/aggregates before listing rows.

## Schema

- Read `prisma/schema.prisma` before writing queries. Table names equal Prisma model names and are
  case-sensitive (`AmazonAd`, not `amazonad`); column names equal field names.
- `DESCRIBE <Table>;` or `SHOW INDEX FROM <Table>;` for the live structure.

## Answer

Give the answer, the SQL you ran and the relevant rows trimmed to what matters. Say plainly when the data
does not answer the question.
