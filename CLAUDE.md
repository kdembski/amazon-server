# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Express + Prisma (MySQL) backend for an Amazon price-monitoring system. External scraper processes (managed by pm2, names containing `pdp`) pull ASINs to scrape from this server, post back prices, and the server detects price anomalies and reports them to Discord. It also runs a Discord bot with slash commands for managing countries, categories and a keyword blacklist.

## Commands

```bash
npm start            # run src/index.ts with vite-node
npm run watch        # same, with file watching
npm run build        # bundle to dist/ with pkgroll
npx prisma generate  # regenerate client after editing prisma/schema.prisma
npx tsc --noEmit     # type-check (no dedicated lint/typecheck script exists)
npm test             # unit tests (vitest project "unit"), tests/unit, no database needed
npm run test:watch   # same, watch mode
npm run test:coverage # unit tests with v8 coverage report
npm run test:integration # MySQL + HTTP tests (vitest project "integration"), needs TEST_DATABASE_URL
npm run test:all     # both projects
```

Unit tests live in `tests/unit` (mirror of `src/`), shared factories and fakes in `tests/support`.
Integration tests live in `tests/integration`. `vitest.config.ts` merges `vite.config.ts` and defines
the `unit` and `integration` projects. There is no linter configured.

Before running tests:

- Run `npx prisma generate`.
- Integration tests need `TEST_DATABASE_URL` (shell or `.env.test.local`): MySQL 8 at `127.0.0.1`, a
  pre-created database whose name ends with `_test`.
- Before running integration tests, get the user's explicit consent to reset the test database and pass
  their exact message in `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION`. Never write it yourself.

Test conventions:

- Coverage thresholds in `vitest.config.ts`: 100% lines/functions/statements, at most 4 uncovered
  branches (the unreachable guards listed there). Scope: all of `src/` except `index.ts` and type-only
  files (`dtos`, `interfaces`, `types`, `declarations.d.ts`).
- One test file per source file under the same relative path. Exceptions: mappers share
  `tests/unit/mappers/mappers.test.ts`; the abstract `DiscordCommandBuilder` is covered through its subclasses.
- Inject dependencies through the existing constructor default parameters. Use `vi.mock` only for
  external modules (`pm2`, `node-os-utils`, `hercai`, `discord.js`, `ws`, `cron`, `express`, `cors`),
  singletons with private constructors (`resetSingleton()` in `tests/support/fakes.ts`) and composition
  roots that construct dependencies inline (`app.ts`, `routes/index.ts`, `websockets/index.ts`, the builders inside
  `DiscordCommandService`, `AmazonAdService` inside `AmazonAdWebSocketController`).
- Repositories: fake Prisma client (`fakePrisma`, query shape only). Routers: `fakeRouter`/`routeTable`.
  Controllers: `fakeRequest`/`fakeResponse`. Discord replies: `tests/support/discord.ts`.
- Cron services expose `run()` for the job body; `schedule()` only wires the `CronJob`.
- Integration tests: `repositories/` and `services/` mirror `src/`; `http/` has one file per router,
  using supertest on `createApp()`. Seed with `tests/support/integration/seed.ts` and use the returned
  ids. Wait for anomaly managers with `vi.waitFor`. Set env in `tests/integration/env.ts` with plain
  `process.env` assignments, not `vi.stubEnv`.

Path aliases: `@/*` → `src/*`, `@@prisma/*` → `prisma/*` (defined in both `tsconfig.json` and `vite.config.ts`; keep them in sync).

## Commits

Commit messages are short English sentences starting with a capitalised past-tense verb (e.g. `Added vitest setup`, `Fixed ...`). Do NOT add any `Co-Authored-By` trailer or other attribution lines to commits or PR descriptions.

## Code comments

Write a comment only when it adds information about the logic that the code itself does not show: a non-obvious constraint, invariant, ordering requirement or behaviour of an external system. Do NOT write comments that justify why something was added or changed, compare it with rejected alternatives or describe history; that belongs in the commit message or the PR description.

## Editing CLAUDE.md

Write instructions as what to do. Do NOT explain why a rule exists, what happens if it is broken or how it was discovered; that belongs in the commit message or the PR description.

## Environment variables

Provide them through the runtime or pm2. The app reads them from `process.env` and does not load `.env` files:

- `DATABASE_URL` (MySQL, used by Prisma), `PORT` (default 5001), `NODE_ENV`
- `DISCORD_BOT_TOKEN`, `DISCORD_APP_ID`, `DISCORD_SERVER_ID` – slash-command bot
- Webhook tokens (appended to `https://discord.com/api/webhooks/`): `DISCORD_LOGS_TOKEN`, `DISCORD_PRICING_ERROR_TOKEN`, `DISCORD_CONVERSION_ERROR_{1..6}_TOKEN`
- `CURRENCY_API_KEY` – freecurrencyapi
- `TEST_DATABASE_URL` – integration tests only, see `Before running tests`

## Architecture

### Layered CRUD pattern

Every entity follows the same vertical slice: `routes/` → `controllers/` → `services/` → `repositories/` (Prisma), with `mappers/` converting DTOs (`dtos/`) into Prisma `CreateInput`/`UpdateInput`.

Generic CRUD is composed, not inherited. `src/routes/crud`, `src/controllers/crud`, `src/services/crud` and `src/interfaces/crud` provide `Selectable`/`Creatable`/`Updatable`/`Deletable` building blocks. An entity opts into a capability by exposing it as a public field (e.g. `service.creatable`, `controller.deletable`) and mounting the matching router inside its own `build()`. Entity-specific endpoints are declared in the entity router before the generic ones are mounted (route order matters: e.g. `GET /scrap` must precede `GET /:id`).

Registering a new entity: create router implementing `SubRouterI` (with `readonly path`) and add it to the list in `src/routes/index.ts`.

Dependency injection is done via constructor default parameters (`constructor(repository = new XRepository(), ...)`). Cross-cutting services (`PrismaClient`, `StorageService`, `AiChatService`, `SystemService`, `ScraperStatusService`, `DiscordCommandService`, websocket controllers) are singletons via `getInstance()`.

`*SelectDto` types are derived from repository return types (`Awaited<ReturnType<Repo["getById"]>>`), so changing a repository `select` structure changes the DTO everywhere.

Errors in controllers go through `ResponseErrorService`, which maps Prisma error codes (P2002 → 422, P1001 → 503) to HTTP responses.

### Scraping workflow

1. Scrapers call `GET /amazon/ads/scrap?count=N`. `AmazonAdService.getForScraping` is guarded by a static `isGetting` flag so concurrent callers are serialized; it picks ads from active categories, excludes names matching blacklisted keywords (a keyword containing `+` means all parts must match), ordered by oldest `scrapedAt` (nulls first), then bumps `scrapedAt` via raw SQL.
2. Scrapers post prices with `PUT /amazon/ads/:id` body `{ prices: AmazonAdPriceCreateDto[] }`. `updatePrices` stores them, logs an `ad_scraped` event, then asynchronously runs the anomaly managers on the last 5 prices per country.
3. Scrapers report status with `POST /scrapers/:name/status` (`{ speed, pending }`).

### Anomaly detection (`src/managers`)

- `AmazonAdConversionErrorManager` – compares the most recent price across countries. Converts all to PLN using exchange rates cached in `StorageService` (populated lazily and refreshed by the currency cron), sorts ascending, and requires ≥3 countries, cheapest country active and `dispatchFrom === "Amazon"`. Then:
  - `PercentageManager`: cheapest ≤ second by 90/70/50 % → Discord channel 3/2/1 (`conversion_error_N_sent` log).
  - `RangeManager`: ≥70 % cheaper and cheapest price in 0–50 / 50–200 / 200+ PLN → channel 4/5/6.
- `AmazonAdPricingErrorManager` – per country, newest price ≤ 50 % of previous and lower than all older ones, Amazon dispatch, active country → `DISCORD_PRICING_ERROR_TOKEN` webhook (`pricing_error_sent` log).

Each sent alert is recorded in the `Log` table; the cron reports count those events.

### Scheduled jobs (`src/services/cron`)

- Hourly: counts of `ad_scraped` and each alert event over the last hour, scraper speeds/CPU (from pm2 via `ScraperStatusService`) and server CPU/RAM → Discord logs webhook.
- Daily 20:00: total/24h ASIN count, PLN exchange rates, disk usage.
- Daily 20:00: fetch EUR/SEK → PLN rates from freecurrencyapi, update `CurrencyExchangeRate` and the `StorageService` cache.

### Discord bot (`src/services/discord`, `src/builders/discord`)

`DiscordService` wraps a webhook client (token chosen by env var name). `DiscordCommandService` logs in the bot, merges commands from the `*CommandBuilder` classes and re-registers guild slash commands on every startup. Builders extend `DiscordCommandBuilder` for ephemeral reply helpers; user-facing bot text is in Polish.

### Other

- `AiChatService` (hercai) is throttled through `RequestQueueService` (one request per 10 s).
- `WebSocketController` upgrades HTTP connections on `/amazon/ads` and pings clients every 40 s; the Amazon websocket currently has no message handling.
- Prisma schema uses explicit `@map` constraint names and `Timestamp(2)` columns; `createdAt`/`updatedAt` are set manually in mappers, not by Prisma defaults. There is no `prisma/migrations` directory – the schema mirrors an existing database.
- `src/app.ts` (`createApp()`) assembles express + json + cors + `useRouter()`; `src/index.ts` only adds `listen`, websockets, cron jobs and the Discord bot login.
