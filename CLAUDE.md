# CLAUDE.md

Express + Prisma (MySQL) backend for Amazon price monitoring: scrapers (Docker containers) pull ASINs,
post prices and report their status to `POST /scrapers/:name/status`; the server detects price anomalies,
reports them to Discord webhooks and runs a Discord slash-command bot.

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
  `dtos`, `interfaces`, `types` and `declarations.d.ts`.
- One test file per source file under the same relative path; mappers share `tests/unit/mappers/mappers.test.ts`.
- Inject dependencies through constructor default parameters. Use `vi.mock` only for external modules,
  private-constructor singletons (`resetSingleton()`) and composition roots that build dependencies inline.
- Unit fakes and factories: `tests/support`. Put cron job bodies in `run()`; `schedule()` only wires the `CronJob`.
- Integration: `repositories/` and `services/` mirror `src/`; `http/` has one file per router, using
  supertest on `createApp()`. Seed with `tests/support/integration/seed.ts` and use the returned ids. Wait
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
- Write user-facing Discord bot text in Polish.
- Set `createdAt`/`updatedAt` in mappers. Do not add Prisma migrations or column defaults.
- The app reads env vars only from the runtime environment, never from `.env` files.

## Architecture

- Each entity: `routes/` → `controllers/` → `services/` → `repositories/` (Prisma); `mappers/` turn DTOs
  into Prisma inputs. Generic CRUD comes from composable `Selectable`/`Creatable`/`Updatable`/`Deletable`
  (`*/crud`), exposed as public fields and mounted in the entity router's `build()`. Declare specific routes
  before generic ones (`GET /scrap` before `GET /:id`). Register routers in `src/routes/index.ts`.
- Cross-cutting services are `getInstance()` singletons. `*SelectDto` types derive from repository return
  types. Controller errors go through `ResponseErrorService` (P2002 → 422, P1001 → 503).
- Scraping: `GET /amazon/ads/scrap` hands out ads from active categories, minus the keyword blacklist,
  oldest `scrapedAt` first, and stamps them. `PUT /amazon/ads/:id` stores prices, logs `ad_scraped` and
  asynchronously runs the anomaly managers (`src/managers`), which log `*_sent` events and post to Discord.
- `src/app.ts` builds the express app; `src/index.ts` adds `listen`, websockets, cron jobs
  (`src/services/cron`) and the bot login.
