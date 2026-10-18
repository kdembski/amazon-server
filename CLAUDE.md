# CLAUDE.md

Express + Prisma (MySQL) backend for Amazon price monitoring: scrapers (Docker containers) pull ASINs,
post prices and report their status to `POST /scrapers/:name/status`; the server detects price anomalies
and reports them to Discord webhooks.

## Commands

```bash
npm start                 # run src/index.ts (vite-node); `npm run watch` with file watching
npm run build             # bundle to dist/ (pkgroll)
npx prisma generate       # after editing prisma/schema.prisma and before tests
npx tsc --noEmit          # type-check; there is no linter
npm run test:unit         # tests/unit, no database
npm run test:coverage     # unit tests with coverage
npm run test:integration  # tests/integration, needs a running Docker
```

## Tests

- Integration: start Docker first; `globalSetup.ts` runs a throwaway `mysql:8` container via
  Testcontainers, pushes the schema and stops the container afterwards.
- Coverage: 100% lines/functions/statements, at most 4 uncovered branches, for `src/` except `index.ts`,
  `dtos`, `interfaces` and `declarations.d.ts`.
- One test file per source file under the same relative path; mappers share `tests/unit/mappers/mappers.test.ts`.
- Inject dependencies through constructor default parameters. Use `vi.mock` only for external modules,
  private-constructor singletons (`resetSingleton()`) and composition roots that build dependencies inline.
- Unit fakes and factories: `tests/support`. Put cron job bodies in `run()`; `schedule()` only wires the `CronJob`.
- Integration: `repositories/`, `services/` and `cron/` mirror `src/` (`tests/integration/modules/currency/...`);
  `http/` has one file per router, using supertest on `createApp()`. Seed with `tests/support/integration/seed.ts` and use the returned ids. Wait
  for anomaly managers with `vi.waitFor`. Set env in `tests/integration/env.ts` with plain `process.env`
  assignments, not `vi.stubEnv`.

## Rules

- Commit messages: short English sentence starting with a capitalised past-tense verb (`Added ...`,
  `Fixed ...`). No `Co-Authored-By` or other attribution in commits or PR descriptions.
- Comments only for logic the code does not show (non-obvious constraint, ordering, external behaviour).
  No justifications, rejected alternatives or history.
- In CLAUDE.md write only what to do, never why.
- Keep the path aliases `@/*` → `src/*` and `@@prisma/*` → `prisma/*` in sync in `tsconfig.json` and
  `vite.config.ts`.
- Write error messages in English.
- Set `createdAt`/`updatedAt` in mappers. Do not add Prisma migrations or column defaults.
- The app reads env vars only from the runtime environment, never from `.env` files.

## Architecture

- Layout: `src/shared/` (`crud`, `http`, `discord`, `system`, `utils`, `interfaces`) and `src/modules/`
  (`currency`, `monitoring`, `search-rules`, `anomalies`, `marketplaces/<name>`). Put no code in other
  top-level `src/` folders.
- Inside a module keep the layers `routes/` → `controllers/` → `services/` → `repositories/` (Prisma);
  `mappers/` turn DTOs into Prisma inputs; `dtos/`, `interfaces/` and `cron/` sit beside them. Generic CRUD
  comes from composable `Selectable`/`Creatable`/`Updatable`/`Deletable` (`src/shared/crud`), exposed as
  public fields and mounted in the entity router's `build()`. Declare specific routes before generic ones
  (`GET /scrap` before `GET /:id`).
- Export `create<Name>Module()` from `src/modules/<name>/index.ts` (returns `AppModule`: `routers`, `crons`);
  marketplaces live at `src/modules/marketplaces/<name>/index.ts` and return `MarketplaceModule`.
  Register it in `createModules()` in `src/modules.ts`.
- Dependency direction: `marketplaces/*` → `anomalies`, `search-rules`, `monitoring`, `currency` → `shared`;
  `anomalies` → `currency`, `monitoring`; `currency` → `monitoring`. `src/shared` imports nothing from
  `src/modules`. `currency`, `monitoring`, `search-rules` and `anomalies` import nothing from
  `src/modules/marketplaces`; pass marketplace implementations in from `src/modules.ts`.
- Add a marketplace: (1) Prisma models and a `src/modules/marketplaces/<name>/` folder with the layers;
  (2) a mapper to `Listing`/`ListingPrice` and a call to `AnomalyManager([...])` with the chosen detectors
  after storing prices; (3) implementations of `SearchRuleTarget` and `DailyReportSection`;
  (4) `create<Name>Module()` returning `MarketplaceModule`, added to `marketplaces` in `src/modules.ts`.
- Anomaly detectors work on `Listing`/`ListingPrice` only; each marketplace passes its detectors to
  `AnomalyManager`. Rule matching goes through `SearchRuleTarget`; the daily Discord report gets its
  sections through `DailyReportSection`.
- Cross-cutting services are `getInstance()` singletons. `*SelectDto` types derive from repository return
  types. Controller errors go through `ResponseErrorService` (P2002 → 422, P1001 → 503).
- Change `SearchRule` rows only with SQL (skill `search-rules`); code only reads them.
- Scraping: `GET /amazon/ads/scrap` hands out ads with `matchesRules = true`, oldest `scrapedAt` first, and
  stamps them; never filter it by `name LIKE`. `SearchRuleMatchCronService` runs every minute: it rematches
  every ad when the `SearchRule` values changed since the last run (and after each restart), otherwise only
  ads with `matchesRules = null`. New ads start with `matchesRules: null`. Rule syntax lives in
  `src/modules/search-rules/helpers/searchRule.ts` (`+` and, `|` or, `!` not; a rule of only `!` members
  excludes globally; phrases match whole words, `*` at a phrase edge matches part of a word). Match rules in JS with
  `createSearchRuleMatcher`, not in SQL.
  `GET /amazon/ads/categories/scrap` hands out only active categories. `PUT /amazon/ads/:id` stores prices, logs `ad_scraped` and
  asynchronously runs the anomaly managers (`src/modules/anomalies`), which log `*_sent` events and post to Discord.
- `src/app.ts` builds the express app and mounts the routers of all modules; `src/index.ts` adds `listen`
  and calls `schedule()` on the crons of all modules.
