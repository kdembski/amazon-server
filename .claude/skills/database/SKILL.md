---
name: database
description: Use when a question needs live production data - ads, prices, categories, exclusion rules, activity events, scraper metrics, currency rates, system logs and server errors - or when another task (e.g. exclusion-rules) needs the current rows from the production MySQL database.
---

# Database

Read-only access to the production MySQL 8 database `amazon` as the `readonly` user (`SELECT`, `SHOW VIEW`).

## Running queries

```bash
bash ~/.claude/skills/database/scripts/query.sh "SELECT ..."
bash ~/.claude/skills/database/scripts/query.sh --raw "SELECT ..." > out.txt   # bare values, no headers
```

- The script opens the SSH tunnel itself on the first free port from 3308 up, reuses it for later queries
  and the tunnel closes after 10 min without queries. Run queries one at a time, never in parallel. When it
  fails or the config is missing, stop and pass the script's message to the user.
- Never print or read `~/.mysql-readonly.cnf` or `~/.ssh/amazon_db`.
- Queries time out after 30 s. Always add `LIMIT` (start with 50) and filter by indexed columns or date
  ranges; some tables are large. Run `COUNT(*)`/aggregates before listing rows.

## Schema

- Read `~/Documents/projects/amazon-server/prisma/schema/*.prisma` before writing queries. Table names equal Prisma model names and are
  case-sensitive (`AmazonAd`, not `amazonad`); column names equal field names.
- `DESCRIBE <Table>;` or `SHOW INDEX FROM <Table>;` for the live structure.

## Answer

Give the answer, the SQL you ran and the relevant rows trimmed to what matters. Say plainly when the data
does not answer the question.
