---
name: database
description: Use when a question needs live production data - ads, prices, categories, exclusion rules, activity events, scraper metrics, currency rates, system logs and server errors - or when another task (e.g. exclusion-rules) needs the current rows from the production MySQL database.
---

# Database

Read-only access to the production MySQL 8 database `amazon` as the `readonly` user (`SELECT`, `SHOW VIEW`).

## Running queries

```bash
bash .claude/skills/database/scripts/query.sh "SELECT ..."
bash .claude/skills/database/scripts/query.sh --raw "SELECT ..." > out.txt   # bare values, no headers
```

- Writes fail with `ERROR 1142`. Do not try them and do not look for other credentials; changes go to the user
  as SQL, except exclusion rules, which the `exclusion-rules` skill changes through `/amazon/exclusion-rules`.
- The script opens the SSH tunnel itself (`ssh -f -N amazon-db`, port 3308) and closes it on exit; a tunnel
  left on the port is closed first. Run queries one at a time, never in parallel. When it fails or the
  config is missing, stop and pass the script's message to the user.
- Never print or read `~/.mysql-readonly.cnf` or `~/.ssh/amazon_db`.
- Queries time out after 30 s. Always add `LIMIT` (start with 50) and filter by indexed columns or date
  ranges; `AmazonAdPrice` and `BusinessLog` are large. Run `COUNT(*)`/aggregates before listing rows.

## Schema

- Read `prisma/schema/*.prisma` before writing queries. Table names equal Prisma model names and are
  case-sensitive (`AmazonAd`, not `amazonad`); column names equal field names.
- `DESCRIBE <Table>;` or `SHOW INDEX FROM <Table>;` for the live structure.

## System log

For errors and server actions query `SystemLog` (`level` error/warn/info, `source` = class name, `context`
JSON with `error.stack`, `request`, ids; kept 30 days):

```sql
SELECT createdAt, level, source, message FROM SystemLog
WHERE level = 'error' AND createdAt > NOW() - INTERVAL 1 DAY ORDER BY createdAt DESC LIMIT 50;
SELECT source, level, COUNT(*) FROM SystemLog WHERE createdAt > NOW() - INTERVAL 1 DAY GROUP BY source, level;
SELECT context->>'$.error.stack' FROM SystemLog WHERE id = ?;
```

## Answer

Give the answer, the SQL you ran and the relevant rows trimmed to what matters. Say plainly when the data
does not answer the question.
