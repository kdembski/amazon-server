# CLAUDE.md

Express + Prisma (MySQL) backend for Amazon price monitoring: scrapers (Docker containers) pull ASINs,
post prices and report minute metrics to `POST /scrapers/:name/metrics`; the server detects price anomalies
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

- Before every commit, stop and wait for the user to review the changes; commit only after their approval.
- Commit messages: short English sentence starting with a capitalised past-tense verb (`Added ...`,
  `Fixed ...`). No `Co-Authored-By` or other attribution in commits or PR descriptions.
- An arrow function whose body does not fit on one line gets a block body (`=> { ... }`), not an expression
  wrapped over several lines.
- Comments only for logic the code does not show (non-obvious constraint, ordering, external behaviour).
  No justifications, rejected alternatives or history.
- In CLAUDE.md write only what to do, never why.
- Keep the path aliases `@/*` → `src/*` and `@@prisma/*` → `prisma/*` in sync in `tsconfig.json` and
  `vite.config.ts`.
- Write error messages in English.
- Start the names of methods that read and return data with `get` (`getCount`, `getSumByTypeChannelAndHour`).
- Set `createdAt`/`updatedAt` in mappers. Do not add Prisma migrations or column defaults.
- The app reads env vars only from the runtime environment, never from `.env` files.

## Architecture

- Layout: `src/shared/` (`crud`, `http`, `discord`, `logging`, `system`, `utils`, `interfaces`) and `src/modules/`
  (`currency`, `monitoring`, `exclusion-rules`, `anomalies`, `marketplaces/<name>`). Put no code in other
  top-level `src/` folders.
- Inside a module keep the layers `routes/` → `controllers/` → `services/` → `repositories/` (Prisma);
  `mappers/` turn DTOs into Prisma inputs; `dtos/`, `interfaces/` and `cron/` sit beside them. Generic CRUD
  comes from composable `Selectable`/`Creatable`/`Updatable`/`Deletable` (`src/shared/crud`), exposed as
  public fields and mounted in the entity router's `build()`. Declare specific routes before generic ones
  (`GET /scrap` before `GET /:id`).
- Write logic as classes (services, repositories, mappers, matchers, validators) with dependencies as
  defaulted constructor params. `helpers/` hold only small stateless functions those classes use.
- Export `create<Name>Module()` from `src/modules/<name>/index.ts` (returns `AppModule`: `routers`, `crons`);
  marketplaces live at `src/modules/marketplaces/<name>/index.ts` and return `MarketplaceModule`.
  Register it in `createModules()` in `src/modules.ts`.
- Dependency direction: `marketplaces/*` → `anomalies`, `exclusion-rules`, `monitoring`, `currency` → `shared`;
  `anomalies` → `currency`; `currency` → `monitoring`. `src/shared` imports nothing from
  `src/modules`. `currency`, `monitoring`, `exclusion-rules` and `anomalies` import nothing from
  `src/modules/marketplaces`; pass marketplace implementations in from `src/modules.ts`.
- Add a marketplace: (1) Prisma models and a `src/modules/marketplaces/<name>/` folder with the layers;
  (2) a mapper to `ListingPrice`, implementations of `CountryOutlierReporter`/`PriceDropReporter` that
  store an event and post to Discord, and a call to `AnomalyManager([...])` with the managers of the chosen
  detectors after storing prices; (3) implementations of `ExclusionRuleTarget` and `DailyReportSection`;
  (4) `create<Name>Module()` returning `MarketplaceModule`, added to `marketplaces` in `src/modules.ts`.
- Anomaly detectors work on `ListingPrice` only; each marketplace passes its reporters to the managers. Rule matching goes through `ExclusionRuleTarget`; the daily Discord report gets its
  sections through `DailyReportSection`.
- Cross-cutting services are `getInstance()` singletons. `*SelectDto` types derive from repository return
  types. Controller errors go through `ResponseErrorService` (`error.status` if set, P2002/P2003 → 422, P1001 → 503).
- Exclusion rules are per marketplace (`AmazonExclusionRule`, optional `categoryId`; `NULL` = every category;
  `inverted` only with a `categoryId`: the category keeps only ads matching one of its inverted rules). Change
  them only through `GET|POST /amazon/exclusion-rules`, `PUT|DELETE /amazon/exclusion-rules/:id` and
  `POST /amazon/exclusion-rules/batch` (`{create, update: [{id, ...}], delete: [id]}` in one transaction: deletes,
  updates, then creates; returns all rules) (skill `exclusion-rules`); writes are validated with
  `ExclusionRuleValidator` (invalid → 400).
- Scraping: `GET /amazon/ads/scrap` hands out ads with `excluded = false`, oldest `scrapedAt` first, and stamps
  them; never filter it by `name LIKE` or by category. An ad of an inactive category or matching a rule of its
  category or a rule without one, or matching none of its category's inverted rules, gets `excluded = true`; otherwise
  `excluded = false`. `ExclusionRuleMatchCronService`
  runs every minute: it rematches every ad of an `ExclusionRuleTarget` when its rules (value, category or inverted) or its
  active scopes (`getActiveScopes`) changed since the last run (and after each restart), otherwise only ads with
  `excluded = null`. New ads start with `excluded: null`. Rule
  syntax lives in `ExclusionRuleParser` (`src/modules/exclusion-rules/services/`; `+` and, `|` or, `!` marks an
  exception inside a rule; a rule of only `!` members is invalid; phrases match whole words, `*` at a phrase edge
  matches part of a word). Match rules in JS with `ScopedExclusionRuleMatcher`, not in SQL.
  `GET /amazon/ads/categories/scrap` hands out only active categories. `PUT /amazon/ads/:id` stores prices with one `createMany`,
  counts `ad_scraped` through `ActivityCountService.increment` and asynchronously runs the anomaly managers (`src/modules/anomalies`); their marketplace reporters
  store `*_sent` events and post to Discord. `POST /amazon/ads/batch` (`{ prices: [{ id, prices }], deleted: [id] }`, what the
  scraper sends) does the same for many ads with one `createMany` of all prices (one by one per ad when it fails), running the anomaly checks in the background 10 ads at a time, and deletes
  `deleted` with one `deleteMany`; with an `Idempotency-Key` header the prices of a key are stored once (`IdempotencyCache`, in memory, 10 min, a failed store is forgotten), the delete always runs. `POST /amazon/ads` with an array upserts the category names and inserts the ads with one
  `createMany` that skips existing ASINs, answering `{ count }`. JSON bodies up to 5 MB. Idle keep-alive connections stay open 15 s (`keepAliveTimeout`) so scrapers reuse one socket between batches (every ~5 s).
- Amazon countries: keep Amazon's countries in `AmazonCountry` (`countryId` = `Country.id`, `tld`, `scraped`, `active`, `proxyType` = `datacenter` | `isp`, `pdpSource` = comma-separated list of `aod` | `twister` | `awd` (PDP from the AOD fragment, the twister fragment or the mobile product page; a 404 moves to the next one, e.g. `twister,awd`; fits `VarChar(15)`), `priority`),
  changed through `GET|POST /amazon/countries` and `PUT /amazon/countries/:id`; never delete rows, set `scraped = false`
  instead. `GET /amazon/countries/scrap` hands out `countryId`, `tld`, `active`, `proxyType`, `pdpSource` and `priority` of `scraped` countries.
  `AmazonAdPrice.countryId` references `AmazonCountry`. Build
  listing URLs as `https://www.amazon.<tld>/dp/<asin>` (`ListingPrice.url`). Report anomalies only for countries with
  `AmazonCountry.active = true` (`ListingPrice.country.active`).
- Scraper metrics: scrapers send `POST /scrapers/:name/metrics` every minute; rows go to the `ScraperMetric`
  table (retention 30 days). Build the "Scrapers" field of the hourly Discord report from these metrics via
  `ScraperMetricService.getSummaries`.
- API token: every route requires `Authorization: Bearer <API_TOKEN>` (`ApiTokenMiddleware`); scrapers and
  amazon-admin send it; integration tests get it from `createTestApp()`.
- Stats: `GET /stats/activity|logs` and `GET /scrapers/summaries|series` take `from`/`to` (ISO, at most 30 days,
  `parseTimeRange`) and return hourly series with `t` = UTC hour start.
- Scraper config: `ScraperConfig` (`scraper` = container `name`, `concurrency`, `rps`, `batchSize`) is the only source
  of these parameters, edited by hand in SQL. Scrapers poll `GET /scrapers/:name/config` every minute; an unknown
  name gets a row with the defaults (10 / 0 / 50).
- System log: log every error and significant action through `SystemLogService.getInstance()`
  (`error|warn|info(source, message, context?)`, `source` = class name) into the `SystemLog` table; never use
  `console.*` directly. Pass errors as `{ error }` in `context` plus the ids needed to debug. Keep
  `ActivityEvent` for `ad_scraped`/`*_sent` only.
- Activity counts: count `ad_scraped` in memory with `ActivityCountService.increment(type, marketplace, countryIds)`;
  its rows hold `data.prices` (number of distinct countries → ads) and `data.countries` (countryId → ads). Show
  ads with at least `MIN_COUNTRY_OUTLIER_PRICES` (`src/shared/utils/countryOutlier.ts`) prices next to Scraped in the
  hourly and daily report via `ActivityCountService.getCountWithMinPrices`;
  `ActivityCountFlushCronService` writes one `ActivityEvent` per type and marketplace with `data.count` every minute
  (second 30). Read `ad_scraped` only through `ActivityCountService.getCount` (sums `data.count`, a row without it
  counts as 1); store `*_sent` as single events.
- `src/app.ts` builds the express app and mounts the routers of all modules; `src/index.ts` adds `listen`
  and calls `schedule()` on the crons of all modules.
