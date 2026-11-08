# amazon-server
<img width="1296" height="351" alt="1" src="https://github.com/user-attachments/assets/bc0582d6-ea8f-408e-8fa4-f2af9194d104" />

Backend for Amazon price monitoring. Scrapers pull ASINs and countries from it, send back prices. The server stores them, detects price anomalies (country outliers, price drops) and reports them, plus hourly and daily stats, to Discord webhooks.

Processes:

- `api` (`npm start`): HTTP API on `PORT`.
- `worker` (`npm run worker`): crons without HTTP (rule matching, reports, rollups, retention, exchange rates).

## Stack

- Node.js 22, TypeScript (ESM), `vite-node`, built with `pkgroll`
- Express
- Prisma + MySQL 8
- `discord.js` (webhooks), `cron`, `date-fns`, `lodash`
- `vitest` (unit, integration with Testcontainers), `supertest`
- Docker / Docker Compose

## Running

Copy `.env.example` to `.env` and fill it in:

| Variable | Description |
|---|---|
| `PORT` | HTTP port (default `5001`) |
| `API_TOKEN` | token every request sends as `Authorization: Bearer <API_TOKEN>` |
| `DATABASE_URL` | MySQL connection string |
| `MYSQL_*` | credentials of the `db` container |
| `CURRENCY_API_KEY` | freecurrencyapi key |

Settings and Discord channels live in the database (`Setting`, `DiscordChannel`), not in env.

Locally (the app reads env only from the environment, not from `.env`):

```bash
npm install
npx prisma generate
npm start        # api
npm run worker   # worker
```

Docker:

```bash
docker compose up -d --build
```

Type check and tests:

```bash
npx tsc --noEmit
npm run test:unit
npm run test:coverage
npm run test:integration
```
