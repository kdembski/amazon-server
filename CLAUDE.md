# CLAUDE.md

Express + Prisma (MySQL) backend for Amazon price monitoring: Docker scrapers pull ASINs, post prices and metrics; the
server detects price anomalies and reports them to Discord.

## Commands

```bash
npm start                 # src/index.ts (vite-node); `npm run watch` with watching
npm run worker            # src/worker.ts (crons, no HTTP)
npm run build             # bundle to dist/ (pkgroll)
npx prisma generate       # after editing prisma/schema/*.prisma and before tests
npx tsc --noEmit          # type-check; no linter
npm run test:unit         # tests/unit, no database
npm run test:coverage     # unit tests with coverage
npm run test:integration  # tests/integration, needs Docker running
```

## Tests

- Coverage: 100% lines/functions/statements, max 4 uncovered branches, for `src/` except `index.ts`, `dtos`,
  `interfaces`, `declarations.d.ts`.
- One test file per source file, same relative path; mappers share `tests/unit/mappers/mappers.test.ts`.
- Inject dependencies through defaulted constructor params. `vi.mock` only for external modules, private-constructor
  singletons (`resetSingleton()`) and composition roots.
- Fakes, factories and integration seed: `tests/support`.
- Integration tests mirror `src/`; `http/` has one file per router (supertest on `createApp()`). Set env in
  `tests/integration/env.ts` with plain `process.env`.

## Rules

- Before every commit, wait for the user's review; commit only after approval.
- Commit messages: short English sentence starting with a capitalised past-tense verb (`Added ...`). No attribution in
  commits or PR descriptions.
- An arrow function whose body does not fit on one line gets a block body.
- Comments only for logic the code does not show.
- In CLAUDE.md write only what to do, never why.
- `.claude/rules/`: short, one fact per step, no repetition.
- Keep path aliases `@/*` and `@@prisma/*` in sync in `tsconfig.json` and `vite.config.ts`.
- Error messages in English.
- Methods that read and return data start with `get`.
- Prisma models in `prisma/schema/<module>.prisma`; `generator`, `datasource`, shared enums in `main.prisma`.
- Set `createdAt`/`updatedAt` in mappers. No Prisma migrations or column defaults.
- Env vars only from the runtime environment, never `.env` files.

## Architecture

- `src/shared/` holds cross-cutting code, `src/modules/` the modules (`settings`, `currency`, `monitoring`,
  `exclusion-rules`, `anomalies`, `marketplaces/<name>`). No other top-level `src/` folders.
- Module layers: `routes/` → `controllers/` → `services/` → `repositories/`, plus `mappers/`, `dtos/`, `interfaces/`,
  `cron/`. Generic CRUD from `src/shared/crud`. Specific routes before generic ones.
- Logic as classes with dependencies as defaulted constructor params; `helpers/` only small stateless functions.
- Each module exports `create<Name>Module()` from its `index.ts`, registered in `src/modules.ts`.
- Dependencies: `marketplaces/*` → other modules → `shared`; `src/shared` imports nothing from modules; other modules
  import nothing from `marketplaces`, which get passed in from `src/modules.ts`. Any module may import `settings`.
- A marketplace maps its prices to `ListingPrice` and implements the anomaly reporters, `ExclusionRuleTarget` and
  `DailyReportSection`.
- Settings: anomaly parameters only from the `Setting` table via `SettingService.get(key)`, no defaults in code; a
  missing row means the caller skips its work. New key: add it to `SettingValidator` and insert the row in production.
- Discord webhooks live only in `DiscordChannel` rows, never in env.
- Controllers answer via `respond()`; throw `HttpError(status, message)` for 4xx.
- Exclusion rules: syntax in `ExclusionRuleParser`, matching in JS (`ScopedExclusionRuleMatcher`), not SQL (skill
  `exclusion-rules`).
- Never delete `AmazonCountry` rows; set `scraped = false`.
- Every route requires `Authorization: Bearer <API_TOKEN>`.
- Log errors and significant actions via `SystemLogService.getInstance()`, never `console.*`. `BusinessLog` only for
  `ad_scraped`/`*_sent`.
- `src/index.ts` runs HTTP and `crons`, `src/worker.ts` runs `workerCrons`. A cron goes to `crons` only when it reads
  memory filled by HTTP requests.
- A cron extends `CronService`; retention cleanup uses `RetentionCleanupCronService`.
