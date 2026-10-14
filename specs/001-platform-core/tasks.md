---

description: "Task list for 001-platform-core"
---

# Tasks: Platform Core

**Input**: Design documents from `specs/001-platform-core/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included. Constitution Principle VI requires them:
- test-first unit tests for domain logic and services;
- integration tests for server actions against a real test database;
- one end-to-end happy path per user story on a 360 px viewport.

Test tasks come before the implementation they cover and must fail first.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested on
its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: The user story the task belongs to (US1–US6 from spec.md)

## Path Conventions

These follow the plan's single Next.js project:
- `src/app/` holds routes, with one route group per surface.
- `src/features/<domain>/` holds feature code; `src/shared/` holds shared code.
- `drizzle/` holds migrations; `seed/` holds the demo catalogue; `e2e/` holds Playwright tests.
- Unit tests are `*.test.ts` and integration tests are `*.int.test.ts`, each next to the code it
  covers.

## Conventions for every task

- **Copy**: no user-facing text in code. Every string is a key in `src/shared/i18n/messages/en.json`
  **and** `kn.json`. Kannada drafted by the agent is listed in `machine-drafted.json`
  (Principle II).
- **Server actions**: every action follows
  [contracts/server-actions.md](./contracts/server-actions.md): parse with Zod, check the session
  for the surface, scope to the kitchen, write in a transaction, stamp `updated_by_*`, return
  `Result`, log unexpected errors.
- **Modules**: every module that touches the database, sessions, env or adapters starts with
  `import 'server-only'`.
- **Actions are thin wrappers over services**:
  - A server action is a `'use server'` wrapper. It parses the input, resolves the actor (session,
    `currentActor`, `resolveKitchenScope`), calls a **service** `(actor, input) => Promise<Result<T>>`,
    and then revalidates or redirects.
  - Services live in `src/features/<feature>/services/`. They are `server-only` and **never import
    `next/headers` or `next/navigation`**, so integration tests call them directly with test actors.
  - Action wrappers are named `<operation>Action` (for example `saveDishAction`); the operation names
    in contracts/server-actions.md are the service names.
- **Page-level session checks**: every page under a `(protected)` route group calls
  `requireSession(surface)` itself. The `(protected)` layout's call only drives navigation and
  sign-out; it is not the access check, because layouts don't re-run on every navigation.
  `requireSession` and `getOptionalSession` are wrapped in React `cache()`, so repeated calls in
  one request hit the database once.
- **E2E isolation**: every e2e spec file calls `resetDemoData()` from `e2e/reset.ts` (which
  runs `resetDemo`) in `test.beforeAll`. Playwright keeps `workers: 1`.
- **Catalogue-independent tests**: end-to-end tests and quickstart scenarios never name seed
  kitchens or dishes. They select subjects from `seed/catalogue.json` by flags and keys through
  `e2e/catalogue.ts`, so they keep passing when the researched catalogue replaces the stand-in.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialisation and tooling

- [X] T001 Initialise the Next.js 16.4 App Router project in the repository root (no `create-next-app` sample content):
  - `package.json` with `"type": "module"` and `"engines": { "node": ">=24" }`.
  - `tsconfig.json` with `strict: true`, `noUncheckedIndexedAccess: true`, `moduleResolution: "bundler"`, path alias `@/*` → `src/*`.
  - `next.config.ts`, with the server actions body size limit set to `'6mb'` (`experimental.serverActions.bodySizeLimit`, or its Next 16 equivalent), so 5 MB photos fit.
  - `src/app/` directory.
  - No `.js` source files.
- [X] T002 Install the dependencies from research.md "Dependencies added": `next react react-dom next-intl drizzle-orm postgres zod sharp server-only`, and dev dependencies `typescript@6 @types/node @types/react @types/react-dom tailwindcss @tailwindcss/postcss drizzle-kit vitest @playwright/test eslint eslint-config-next prettier tsx`. Add these npm scripts to `package.json`:
  - `dev`, `build`, `start`
  - `lint` (`eslint .`), `typecheck` (`tsc --noEmit`), `format` (`prettier --write .`)
  - `test` (`vitest run`), `test:unit` (`vitest run --project unit`), `test:int` (`vitest run --project integration`)
  - `test:e2e` (`NODE_OPTIONS=--conditions=react-server playwright test`, so `e2e/reset.ts` can import `server-only` modules; the Playwright web server clears `NODE_OPTIONS`)
  - `db:generate` (`drizzle-kit generate`)
  - `demo:reset` (`tsx --env-file-if-exists=.env.local --conditions=react-server src/features/demo/reset.ts`)
- [X] T003 Record the one dependency not in the plan's table, `tsx` ("runs TypeScript scripts such as the demo reset with tsconfig path aliases"), as a new row in the "Dependencies added" table in specs/001-platform-core/research.md
- [X] T004 [P] Configure Tailwind CSS 4 through `.postcssrc.json` (`{"plugins":{"@tailwindcss/postcss":{}}}`) and create `src/app/globals.css` with `@import "tailwindcss"` and theme tokens:
  - primary action colour, secondary, danger;
  - veg green and non-veg brown-red;
  - a minimum touch-target size of 48px.
- [X] T005 [P] Create `eslint.config.ts`:
  - extend `eslint-config-next`;
  - enable `react/jsx-no-literals` as `error` with `noStrings: true`, `allowedStrings` limited to punctuation such as `·`, `₹`, `/`, `:`;
  - add `no-console: error` except in `src/shared/log.ts`;
  - if ESLint cannot load a TypeScript config without `jiti`, add `jiti` as a dev dependency and record its reason in research.md.
- [X] T006 [P] Create `.prettierrc.json` (`{"singleQuote":true,"printWidth":100}`) and `.prettierignore` (`drizzle/`, `.next/`, `playwright-report/`)
- [X] T007 [P] Create `docker-compose.yml` with a `db` service. It uses image `postgres:17`, user/password/db `hfd`, port 5432, and a named volume. `docker/init-test-db.sql` runs `CREATE DATABASE hfd_test;` on first start.
- [X] T008 [P] Create `.env.example` documenting `DATABASE_URL`, `TEST_DATABASE_URL`, `DEFAULT_LOCALE` (`en`|`kn`, default `en`), `DEMO_MODE` (`true`|`false`) and `DEMO_OTP_CODE` (6 digits, default `123456`), with a one-line comment each. Extend `.gitignore` with `.env.local`, `.next/`, `node_modules/`, `playwright-report/` and `test-results/`.
- [X] T009 [P] Create `vitest.config.ts` with two projects:
  - `unit`: `include: ['src/**/*.test.ts']`, excluding `*.int.test.ts`.
  - `integration`: `include: ['src/**/*.int.test.ts']`, `globalSetup: 'src/shared/db/test/global-setup.ts'`, `fileParallelism: false`, and `resolve.conditions: ['react-server']` so `server-only` imports resolve.
  - Path alias `@` → `src` in both.
- [X] T010 [P] Create `playwright.config.ts`:
  - project `mobile`: Chromium, viewport 360×780, `isMobile: true`, `hasTouch: true`, matching `e2e/us{1,2,3,5,6}-*.spec.ts`;
  - project `desktop`: Chromium, 1280×800, matching `e2e/us4-*.spec.ts`;
  - `webServer`: `npm run build && npm run demo:reset && npm run start` on port 3000, with `reuseExistingServer: !process.env.CI` and `env: { DEMO_MODE: 'true', DEMO_OTP_CODE: process.env.DEMO_OTP_CODE ?? '123456', NODE_OPTIONS: '' }`; the config loads `.env.local` with `process.loadEnvFile` when it exists (in addition to the inherited environment);
  - `workers: 1`, since tests share the demo database.
  - A header comment in `playwright.config.ts`, and the `test:e2e` entry in `.env.example`, state that **`test:e2e` resets the database named by `DATABASE_URL`**, so it must point at a disposable database.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The schema, domain functions, i18n, UI primitives, sessions, adapters, image storage,
the demo catalogue loader and surface shells that every story depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Core utilities

- [X] T011 Create `src/shared/env.ts` (`server-only`). It parses `process.env` with Zod, fails closed with a message naming the bad variable, and exports a typed `env`:
  - `DATABASE_URL` (url, required);
  - `TEST_DATABASE_URL` (url, optional);
  - `DEFAULT_LOCALE` (`'en'|'kn'`, default `'en'`);
  - `DEMO_MODE` (`'true'|'false'`, converted to boolean, default false);
  - `DEMO_OTP_CODE` (`/^\d{6}$/`, default `'123456'`).
- [X] T012 [P] Create `src/shared/result.ts` exporting `Result<T> = { ok: true; data: T } | { ok: false; error: { code: string; fieldErrors?: Record<string, string> } }` and helpers `ok(data)` and `err(code, fieldErrors?)`
- [X] T013 [P] Create `src/shared/log.ts`. It exports `log.info`, `log.warn` and `log.error(message, context)`, writing one JSON line to stdout or stderr with an ISO timestamp, level, message and context. It is the only file allowed to use `console`.

### Database schema and migrations

- [X] T014 [P] Create `src/shared/db/schema/identity.ts` with Drizzle tables and enums:
  - **`customers`**: `id` uuid PK default random; `phone` varchar(10) unique not null; `display_name` varchar(60) nullable; `created_at` timestamptz default now.
  - **`admins`**: `id`; `phone` varchar(10) unique not null; `name` varchar(60) not null.
  - **enum `vehicle_type`**: `bicycle`, `two_wheeler`, `other`.
  - **`agents`**: `id`; `phone` varchar(10) unique; `name` varchar(60) not null; `vehicle_type` not null; `vehicle_reg` varchar(20) nullable; `active` boolean default true; `created_at`, `updated_at`.
  - **enum `surface`**: `customer`, `partner`, `agent`, `admin`.
  - **`sessions`**: `token_hash` char(64) PK; `surface`; `phone` varchar(10); `subject_id` uuid; `kitchen_id` uuid nullable; `created_at`, `last_seen_at`, `expires_at` timestamptz; index on (`surface`, `subject_id`).
- [X] T015 [P] Create `src/shared/db/schema/kitchens.ts`:
  - **Enums**: `kitchen_type` (`restaurant`, `home_kitchen`, `cloud_kitchen`); `kitchen_status` (`pending`, `active`, `suspended`); `actor_role` (`admin`, `partner`); `verification_kind` (`fssai_licence`, `hygiene_check`).
  - **`kitchens`**:
    - `id` uuid PK;
    - `name_en` and `name_kn` varchar(80) nullable, with CHECK "at least one is non-empty";
    - `description_en` and `description_kn` varchar(300) nullable;
    - `type`, `pure_veg` boolean;
    - `address` varchar(200) not null; `landmark` varchar(100) not null;
    - `photo_image_id` uuid FK → images nullable;
    - `status` default `pending`; `suspension_reason` varchar(200), with CHECK required when status = `suspended`;
    - `closed_at` and `reopens_at` timestamptz nullable;
    - `closure_updated_by_role`, `closure_updated_by_phone`, `closure_updated_at`;
    - `hours_updated_by_role`, `hours_updated_by_phone`, `hours_updated_at`;
    - `created_at`, `updated_at`.
  - **`kitchen_contacts`**: `id`; `kitchen_id` FK cascade; `phone` varchar(10); `is_primary` boolean; `position` smallint; a partial unique index on (`kitchen_id`) WHERE `is_primary`.
  - **`kitchen_signins`**: `id`; `kitchen_id` FK cascade; `phone` varchar(10) **unique across all kitchens**; `person_name` varchar(60) not null; `created_at`.
  - **`kitchen_hours`**: `kitchen_id` FK cascade; `weekday` smallint (1 = Monday … 7 = Sunday); `slot` smallint (1 or 2); `opens_min` smallint 0–1439; `closes_min` smallint 1–1440; CHECK `opens_min < closes_min`; PK (`kitchen_id`, `weekday`, `slot`).
  - **`verifications`**: `kitchen_id` uuid PK FK; `kind`; `reference` varchar(40); `verified_by_admin_id` FK → admins; `verified_at`.
- [X] T016 [P] Create `src/shared/db/schema/menu.ts`:
  - **`menu_categories`**: `id`; `kitchen_id` FK cascade; `name_en` and `name_kn` varchar(60), with CHECK at least one; `position` integer; `updated_by_role`, `updated_by_phone`, `updated_at`.
  - **`dishes`**:
    - `id`; `kitchen_id` FK cascade;
    - `category_id` FK → menu_categories **on delete restrict**;
    - `name_en` and `name_kn` varchar(80), with CHECK at least one;
    - `description_en` and `description_kn` varchar(300) nullable;
    - `price_rupees` integer, with CHECK 1–100000;
    - `is_veg` boolean; `photo_image_id` FK → images nullable; `available` boolean default true;
    - `position` integer; `updated_by_role`, `updated_by_phone`, `updated_at`.
- [X] T017 [P] Create `src/shared/db/schema/images.ts` with `images`: `id` uuid PK; `sha256` char(64) unique; `small` bytea (WebP 320 px); `large` bytea (WebP 800 px); `created_at`.
- [X] T018 Create `src/shared/db/schema/index.ts` re-exporting all schema modules, and `drizzle.config.ts` (schema path, `out: 'drizzle'`, dialect postgresql, `DATABASE_URL`). Run `npm run db:generate` to produce the first migration in `drizzle/`, and check that the generated SQL contains every CHECK and the partial unique index from T014–T017.
- [X] T019 Create `src/shared/db/client.ts` (`server-only`) exporting a `db` Drizzle instance over postgres.js using `env.DATABASE_URL`, and `migrateDatabase(url)` using `drizzle-orm/postgres-js/migrator` with `migrationsFolder: 'drizzle'`.
- [X] T020 Create the integration test harness:
  - `src/shared/db/test/global-setup.ts`: requires `TEST_DATABASE_URL`, drops and recreates schema `public`, and runs `migrateDatabase`.
  - `src/shared/db/test/helpers.ts`: `testDb`, `truncateAll()`, and factory helpers `makeKitchen()`, `makeSignin()`, `makeAgent()`, `makeAdmin()`, `makeCategory()` and `makeDish()` with valid defaults.

### Domain functions (test-first)

- [X] T021 [P] Write failing unit tests for phone normalisation in `src/features/auth/domain/phone.test.ts`:
  - accepts `9876543210`, `+91 98765 43210`, `09876543210` and `98765-43210`, all normalising to `9876543210`;
  - rejects 9 or 11 digits, numbers starting 0–5, and letters.
- [X] T022 Implement `normalizePhone(input): string | null` in `src/features/auth/domain/phone.ts` to pass T021
- [X] T023 [P] Write failing unit tests for opening hours in `src/features/kitchens/domain/hours.test.ts`:
  - `"HH:MM"` ↔ minutes conversion, including `"24:00"` = 1440;
  - `validateWeekHours` rejects opens ≥ closes with code `range_order`, rejects overlapping slot 1 and 2 with `range_overlap` (keyed by day), rejects more than 2 ranges, and accepts an empty day.
- [X] T024 Implement `src/features/kitchens/domain/hours.ts` (`toMinutes`, `toHHMM`, `validateWeekHours`, `WeekHours` type) to pass T023
- [X] T025 [P] Write failing unit tests for kitchen state in `src/features/kitchens/domain/state.test.ts`. They use a fixed IST offset of +05:30 with UTC `now` values and cover:
  - `open` inside a range;
  - `closed { nextOpening }` before the first range, between ranges, after the last range (next day), and across Sunday → Monday;
  - exact boundaries: open at `opens`, closed at `closes`;
  - `closed { hoursNotSet }` with no ranges at all;
  - `temporarilyClosed { reopensAt }` while `closed_at` is set and `reopens_at` is in the future or null;
  - normal state again once `now ≥ reopens_at`.
- [X] T026 Implement `kitchenState(kitchen: { closedAt, reopensAt }, hours: WeekHours, now: Date)` in `src/features/kitchens/domain/state.ts` to pass T025. Use the IST offset constant `330` minutes and no time-zone library.
- [X] T027 [P] Write failing unit tests for closure end in `src/features/kitchens/domain/closure.test.ts`:
  - closing during lunch (12:00, ranges 11:00–15:00 and 18:00–22:00) reopens at 18:00 the same day;
  - closing at 08:00 before an 11:00 range cancels that range, so it reopens at 18:00;
  - closing during the last range reopens at the next day's first range;
  - closing between ranges (16:00) cancels the 18:00 range, so it reopens at the next day's first range;
  - no future range returns `null`;
  - recalculating with edited hours from the original `closedAt` uses the new hours.
- [X] T028 Implement `closureEnd(hours: WeekHours, closedAt: Date): Date | null` in `src/features/kitchens/domain/closure.ts` to pass T027 (spec FR-031)

### Internationalisation

- [X] T029 Configure next-intl without locale routing:
  - `src/shared/i18n/config.ts`: `locales = ['en','kn']` and the `Locale` type.
  - `src/shared/i18n/request.ts`: `getRequestConfig` reads the `locale` cookie, falls back to `env.DEFAULT_LOCALE`, and loads `messages/{locale}.json`.
  - Register the plugin in `next.config.ts` with `createNextIntlPlugin('./src/shared/i18n/request.ts')`.
- [X] T030 [P] Create `src/shared/i18n/messages/en.json`, `kn.json` and `machine-drafted.json`, with initial namespaces:
  - `common`: language switch labels "ಕನ್ನಡ" / "English", retry, loading, generic error, not found, sign out, back;
  - `kitchenType`, `kitchenState` (open, closed with `{time}`, opens `{day}` `{time}`, temporarily closed until `{time}`, hours not set);
  - `veg` (veg, non-veg, pure veg), `status`, `vehicleType`, `errors` (every error code in contracts/server-actions.md), `fallback` (the "in English" / "ಕನ್ನಡದಲ್ಲಿ" marker labels).
  - `machine-drafted.json` lists every `kn` key drafted by the agent.
- [X] T031 [P] Write the unit test `src/shared/i18n/messages.test.ts`. It asserts that `en.json` and `kn.json` have identical nested key sets, that no value is empty, and that every key in `machine-drafted.json` exists.
- [X] T032 [P] Write failing unit tests for formatting in `src/shared/i18n/format.test.ts`:
  - `formatPrice(1250, 'en')` and `formatPrice(1250, 'kn')` both give `₹1,250`; `formatPrice(125000, 'en')` gives `₹1,25,000`;
  - `formatTime` at 13:30 IST gives `1:30 pm` in en and `ಮಧ್ಯಾಹ್ನ 1:30` in kn, and 07:00 gives `ಬೆಳಿಗ್ಗೆ 7:00` in kn;
  - `formatWeekday(1, 'kn')` gives `ಸೋಮವಾರ`;
  - no output contains Kannada digits (U+0CE6–U+0CEF).
- [X] T033 Implement `src/shared/i18n/format.ts` to pass T032:
  - use `Intl` with `kn-IN` and `en-IN`, `numberingSystem: 'latn'`, `timeZone: 'Asia/Kolkata'`;
  - for Kannada times, use `dayPeriod: 'short'` with `formatToParts`, placing the period first;
  - for English times, lowercase am/pm (research R3).
- [X] T034 [P] Write failing unit tests for `pickLocalized` in `src/shared/i18n/localized.test.ts`:
  - `{en:'Neer dose', kn:'ನೀರ್ ದೋಸೆ'}` in kn gives `{text:'ನೀರ್ ದೋಸೆ', lang:'kn', isFallback:false}`;
  - `{en:'Ambade upkari', kn:null}` in kn gives the English text with `isFallback: true`;
  - empty and whitespace values count as missing.
- [X] T035 Implement `pickLocalized(pair, locale)` in `src/shared/i18n/localized.ts` to pass T034
- [X] T036 Create the `setLocale` server action in `src/shared/i18n/actions.ts`. It validates `'en'|'kn'` with Zod, sets the `locale` cookie (path `/`, max-age 1 year, `SameSite=Lax`) and revalidates.

### Shared UI primitives

- [X] T037 Create the root layout `src/app/layout.tsx`:
  - load Noto Sans and Noto Sans Kannada through `next/font/google`;
  - set `<html lang>` from the active locale;
  - wrap children in `NextIntlClientProvider`;
  - import `globals.css`.
- [X] T038 [P] Create the shared UI primitives in `src/shared/ui/`. All use translated props only and no literals:
  - `button.tsx`: variants primary, secondary and danger; min-height 48px.
  - `field.tsx`: label, input or textarea, and a field error from a translation key; every input labelled.
  - `card.tsx`, `badge.tsx`, `empty-state.tsx` (message plus optional action), `error-state.tsx` (retry).
  - `veg-mark.tsx`: the Indian square-and-dot symbol **plus** a text label, so colour is never the only signal.
  - `fallback-marker.tsx`: shows the language of fallback content.
  - `localized-text.tsx`: renders the `pickLocalized` result, with the marker when `isFallback`.
- [X] T039 [P] Create `src/shared/ui/language-switch.tsx`: a `<form action={setLocale}>` with two buttons, one showing the name of the other language. It works without client JavaScript.
- [X] T040 [P] Create the placeholder SVGs in `src/shared/ui/placeholders/` (`restaurant.svg`, `home-kitchen.svg`, `cloud-kitchen.svg`, `dish-veg.svg`, `dish-nonveg.svg`, each with the veg/non-veg symbol where relevant) and `src/shared/ui/placeholder-image.tsx`, which picks one by kitchen type or veg mark.

### Images (research R7)

- [X] T041 [P] Write a failing integration test `src/shared/images/store.int.test.ts`:
  - `storeImage(buffer)` for a JPEG produces WebP `small` (320 px wide) and `large` (800 px wide);
  - storing the same bytes twice returns the same id (sha256 dedupe);
  - a 2 MB JPEG is accepted (the size the 6 MB action limit in T001 must let through);
  - more than 5 MB returns `invalid_image`, and non-JPEG/PNG/WebP returns `invalid_image`;
  - `deleteImageIfUnused(id)` removes only unreferenced rows.
- [X] T042 Implement `src/shared/images/store.ts` (`server-only`, `sharp`) with `storeImage(buffer): Promise<Result<{ id }>>` and `deleteImageIfUnused(id)` to pass T041
- [X] T043 Create `src/app/media/[id]/[variant]/route.ts`. `GET` with variant `s`|`l` returns `image/webp` with `Cache-Control: public, max-age=31536000, immutable`, and 404 for an unknown id or variant. Also create `src/shared/images/loader.ts`, a `next/image` custom loader that maps the requested width to `s` (≤ 320) or `l`.
- [X] T044 Write the integration test `src/app/media/[id]/[variant]/route.int.test.ts`. It calls the route's exported `GET` with a `Request` and params:
  - for a stored image, variants `s` and `l` return 200, `Content-Type: image/webp`, `Cache-Control: public, max-age=31536000, immutable`, and the stored bytes;
  - an unknown id (valid uuid) returns 404; a non-uuid id returns 404;
  - an unknown variant (e.g. `x`) returns 404.

### Adapters (research R6, contracts/adapters.md)

- [X] T045 [P] Create the OTP adapter in `src/shared/adapters/otp/`:
  - `types.ts`: the `OtpProvider` interface.
  - `stand-in.ts`: a file header comment `STAND-IN: no message is sent; accepts only env.DEMO_OTP_CODE`. `requestCode` always returns ok; `verifyCode` matches the env code.
  - `index.ts`: exports `otpProvider`.
  - Unit test `stand-in.test.ts`: the right code passes, a wrong code gives `wrong_code`, and results are deterministic.
- [X] T046 [P] Create the verification adapter in `src/shared/adapters/verification/`:
  - `types.ts`, `stand-in.ts` (header `STAND-IN: no registry lookup; always 'recorded'`) and `index.ts`.
  - Unit test `stand-in.test.ts`.

### Sessions and authorisation core (research R4)

- [X] T047 Write a failing integration test `src/features/auth/session.int.test.ts`. It covers:
  - `createSession` stores only the SHA-256 hash and returns the raw token;
  - `loadSession(surface, token)` returns the subject, and extends `expires_at` (30 days) when used;
  - an expired session returns null and the row is deleted;
  - an agent session becomes invalid when the agent is set inactive;
  - a partner session becomes invalid when its `kitchen_signins` row is deleted, or moved to another kitchen;
  - an admin session becomes invalid when the admin row is deleted;
  - a token for the `partner` surface is rejected on `agent`;
  - `deleteSessionsForSubject` removes all of a subject's sessions.
- [X] T048 Implement `src/features/auth/session.ts` (`server-only`) to pass T047:
  - `createSession`, `loadSession` and `deleteSessionsForSubject`;
  - cookie helpers using the names `hfd_session_customer|partner|agent|admin` (`HttpOnly`, `SameSite=Lax`, `Secure` in production, max-age 30 days);
  - `requireSession(surface)`: redirects to that surface's login with a `next` param that must start with the same surface prefix;
  - `getOptionalSession(surface)`;
  - wrap both `requireSession` and `getOptionalSession` in React `cache()`, so repeated calls in one request (layout plus page plus components) load and re-check the session once.
- [X] T049 Create `src/features/auth/actor.ts` (`server-only`):
  - `currentActor(surface)` returns `{ role: 'admin'|'partner', phone }` for FR-055 stamping;
  - `resolveKitchenScope(surface, inputKitchenId?)` returns the session's `kitchen_id` for partners (and rejects any other id with `unauthorised`) or the input id for admins.

### Demo catalogue and reset (research R8, R15)

- [X] T050 Create the Zod schema `src/features/demo/catalogue-schema.ts`:
  - **Top level**: `{ notes?: string[], admins: [{key, name, phone}], agents: [{key, name, phone, vehicleType, vehicleReg?, active}], customers: [{key, phone, displayName?}], kitchens: [...] }`.
  - **Each kitchen**:
    - `key`, `name {en?, kn?}`, `description {en?, kn?}`, `type`, `pureVeg`;
    - `address`, `landmark`;
    - `contacts [{phone, isPrimary}]`, `signins [{phone, personName}]`;
    - `hours` (WeekHours in `"HH:MM"`);
    - `status`, `suspensionReason?`, `verification? {kind, reference}`, `temporarilyClosedAtReset?`;
    - `menuSource: 'researched'|'fabricated'`, `sourceNote?`, `image?`;
    - `categories [{key, name, dishes [{key, name, description?, priceRupees, isVeg, available, image?}]}]`.
  - Reuse the length limits from data-model.md.
- [X] T051 Create the stand-in catalogue `seed/catalogue.json` from the data-model.md "Seed outline", with all 9 kitchens:
  - 2–3 categories and 4–8 dishes per kitchen, with indicative prices;
  - English and Kannada names, with Kannada drafted by the agent and listed in `notes`;
  - `menuSource: "fabricated"` for every kitchen, since this is the stand-in;
  - kane fry in kitchen 6;
  - Shanta's kitchen has one dish with no `kn` name;
  - Kamalakka's kitchen has `temporarilyClosedAtReset: true`;
  - Karki Amma's kitchen has one dish with `available: false`;
  - Honnavar Biryani Box has hours `18:30–23:00` every day;
  - Havyaka Oota Mane is `pending` with no verification; Market Road Lunch Home is `suspended` with reason "Hygiene complaint under review";
  - every number is in the `90000xxxxx` block: customer-facing kitchen contacts `90000010NN`, admin `9000000001`, customer `9000000101`, agents `9000000201`/`202` (active) and `203` (inactive), kitchen sign-ins `90000003NN`, and kitchen 1 has a helper `9000000399`;
  - image file names follow `seed/images/<kitchen-key>.jpg` and `<kitchen-key>--<dish-key>.jpg`.
- [X] T052 [P] Create `seed/images/README.md`. It explains the file naming from T051, accepted formats (JPEG, PNG, WebP, ≤ 5 MB) and that a missing file falls back to the placeholder. It adds no images yet.
- [X] T053 Implement `src/features/demo/load-catalogue.ts` (`server-only`):
  - read `seed/catalogue.json` and validate it with T050, failing closed with the Zod issue path;
  - derive deterministic UUIDs from entry keys with `deterministicId(key)` in `src/features/demo/ids.ts`, a pure module with no `server-only`, so `e2e/catalogue.ts` can import it (name-based SHA-1 via `node:crypto`, version and variant bits set);
  - insert all rows in one transaction;
  - load each image file through `storeImage` (T042); a missing file is a `log.warn`, not a failure;
  - for `temporarilyClosedAtReset`, set `closed_at = now` and `reopens_at = closureEnd(hours, now)` (T028);
  - for `verification`, use the first admin as `verified_by_admin_id`;
  - stamp `updated_by_role = 'admin'` with the first admin's phone.
- [X] T054 Implement `resetDemo(databaseUrl)` in `src/features/demo/reset-demo.ts` (`server-only`). It drops and recreates schema `public`, runs `migrateDatabase`, runs `loadCatalogue`, and returns counts per table. `src/features/demo/reset.ts` is the thin CLI run by `npm run demo:reset`: it calls `resetDemo(env.DATABASE_URL)` and prints the counts.
- [X] T055 Write the integration test `src/features/demo/catalogue.int.test.ts`. It loads `seed/catalogue.json` into the test database and asserts:
  - FR-050: ≥ 8 kitchens, ≥ 3 restaurants, ≥ 3 home kitchens, ≥ 2 cloud kitchens, and both pure-veg and non-veg present;
  - FR-051: a dish missing `name_kn`, a kitchen temporarily closed now, a pending kitchen, a suspended kitchen, an unavailable dish, and a kitchen closed by hours at 13:00 IST;
  - FR-052: ≥ 1 admin, a sign-in for every kitchen, one kitchen with 2 sign-ins, ≥ 2 active agents and 1 inactive agent, and ≥ 1 customer;
  - loading twice gives identical ids;
  - a missing image falls back without error.
- [X] T056 [P] Create the end-to-end catalogue helper `e2e/catalogue.ts`. It reads and parses `seed/catalogue.json` with the T050 schema and uses `deterministicId` from `src/features/demo/ids.ts` to compute ids for URLs. It exports selectors that return `{ key, id, name, … }`:
  - `activeKitchens()`, `pendingKitchen()`, `suspendedKitchen()`, `temporarilyClosedKitchen()` (the one with `temporarilyClosedAtReset`);
  - `kitchenWithHelper()`: the kitchen with two sign-ins, returning `{ kitchen, ownerPhone, helperPhone }`;
  - `dishWithoutKannadaName()`, returning `{ kitchen, dish }`;
  - `unavailableDish()`, returning `{ kitchen, dish }`;
  - `availableDishIn(kitchenKey)`;
  - `pureVegKitchen()`: active and pure veg;
  - `nonVegKitchen()`: active, not pure veg, with at least one available veg **and** one available non-veg dish;
  - `searchableDish()`: an available dish in an active kitchen with both `en` and `kn` names, plus `enTerm` and `knTerm` (the first word of each name, at least 2 characters);
  - `kitchenTypeCounts()`: counts of active kitchens per type;
  - `admin()`, `activeAgent()`, `inactiveAgent()`, `demoCode()` (`process.env.DEMO_OTP_CODE ?? '123456'`).
  - Each selector throws a clear error if the catalogue has no matching subject.
  - Also create `e2e/reset.ts` exporting `resetDemoData()`, which calls `resetDemo(process.env.DATABASE_URL)` from `src/features/demo/reset-demo.ts`.

### Surface shells (contracts/routes.md)

- [X] T057 [P] Create the customer shell:
  - `src/app/(customer)/layout.tsx`: header with app name, language switch and sign-in/account link, mobile-first, max width;
  - `loading.tsx`, `error.tsx` (client component with retry; translated) and `not-found.tsx`, all in `src/app/(customer)/`.
- [X] T058 [P] Create the partner shell in `src/app/(partner)/partner/`: `layout.tsx` with language switch; `loading.tsx`, `error.tsx` and `not-found.tsx`. Create `src/app/(partner)/partner/(protected)/layout.tsx`, which calls `requireSession('partner')` only to drive navigation and the sign-out button (pages do their own check; see Conventions).
- [X] T059 [P] Create the agent shell in `src/app/(agent)/agent/`, following T058, with `(protected)/layout.tsx` calling `requireSession('agent')`.
- [X] T060 [P] Create the admin shell in `src/app/(admin)/admin/`, following T058, desktop-first with side navigation (Partners, Agents). `(protected)/layout.tsx` calls `requireSession('admin')`.

**Checkpoint**: The foundation is ready. `npm run demo:reset` loads the stand-in catalogue, and
unit and integration tests pass.

---

## Phase 3: User Story 1 - Browse kitchens and read a menu in my language (Priority: P1) 🎯 MVP

**Goal**: A guest sees active kitchens with their state, opens a kitchen, reads its menu by
category, calls it, and switches language with full parity.

**Independent Test**: After `npm run demo:reset`, open `/` at 360 px without signing in:
- every active catalogue kitchen is listed, and no other;
- the kitchen flagged `temporarilyClosedAtReset` shows "Temporarily closed" with its reopening time;
- an active kitchen's page shows its menu;
- switching to ಕನ್ನಡ survives a reload;
- the dish with no Kannada name shows the English fallback marker.

### Tests for User Story 1

- [X] T061 [P] [US1] Write a failing integration test `src/features/browse/queries.int.test.ts`:
  - `listKitchensForCustomer({ now, locale })` returns only `active` kitchens (FR-023), each with a computed state, open kitchens first and then by localised name;
  - `getKitchenForCustomer(id)` returns null for pending, suspended or unknown ids;
  - it returns categories and dishes in `position` order, includes unavailable dishes flagged, and includes contacts with the primary first and the weekly hours.
- [X] T062 [P] [US1] Write the end-to-end test `e2e/us1-browse.spec.ts` (mobile), selecting subjects only through `e2e/catalogue.ts`:
  - the home page lists exactly `activeKitchens().length` cards, and the names of `pendingKitchen()` and `suspendedKitchen()` are absent;
  - `temporarilyClosedKitchen()`'s card shows "Temporarily closed";
  - opening an active kitchen shows its categories, and the call link has `href="tel:<its primary contact>"`;
  - switching to Kannada changes the heading, state labels and prices, and still shows Kannada after a reload;
  - on the kitchen of `dishWithoutKannadaName()`, that dish shows the fallback marker;
  - an unknown kitchen id shows the not-found screen.
  - `test.beforeAll` calls `resetDemoData()` from `e2e/reset.ts`.

### Implementation for User Story 1

- [X] T063 [US1] Implement `src/features/browse/queries.ts` (`server-only`) with `listKitchensForCustomer` and `getKitchenForCustomer`, using `kitchenState` (T026) and returning plain serialisable view models, to pass T061
- [X] T064 [P] [US1] Create the kitchen card `src/features/browse/components/kitchen-card.tsx`:
  - photo through `next/image` with the loader (T043), `loading="lazy"` and `sizes`, falling back to `placeholder-image`;
  - `localized-text` name with fallback marker;
  - kitchen type badge, "Pure veg" badge when declared, and the state label.
- [X] T065 [P] [US1] Create `src/features/browse/components/kitchen-state-label.tsx`. It renders Open, "Closed · opens {day} {time}", "Temporarily closed · opens {time}" or "Hours not set" with `formatTime` and `formatWeekday` (T033).
- [X] T066 [US1] Create the home page `src/app/(customer)/page.tsx`. It reads the locale and lists kitchens with `kitchen-card`, and shows `empty-state` when there are none.
- [X] T067 [P] [US1] Create the menu components in `src/features/browse/components/`:
  - `menu-section.tsx`: category heading via `localized-text`;
  - `dish-row.tsx`: photo or placeholder, name and description with fallback marker, `formatPrice`, `veg-mark`, and dimmed with a "Not available" label when unavailable (FR-045);
  - `hours-table.tsx`: the full week from `formatWeekday`, "Closed" days, up to 2 ranges;
  - `call-button.tsx`: a `tel:` link with a large touch target to the primary contact.
- [X] T068 [US1] Create the kitchen page `src/app/(customer)/kitchens/[id]/page.tsx`:
  - validate `id` as a uuid with Zod, calling `notFound()` on failure or a null result;
  - show the header (photo, name, description, type, pure-veg badge, state, landmark, address), the call button, hours and the menu;
  - show "Menu coming soon" when there are no categories or dishes.
- [X] T069 [US1] Add the US1 message keys (`home.*`, `kitchen.*`, `menu.*`, `hours.*`) to `src/shared/i18n/messages/en.json` and `kn.json`, and list the drafted Kannada keys in `machine-drafted.json`

**Checkpoint**: US1 works on its own. T061 and T062 pass.

---

## Phase 4: User Story 2 - Sign in to my own surface (Priority: P1)

**Goal**: Mobile number plus the stand-in code signs each role into its own surface. Customers
self-register; partners, agents and admins must be registered. Agents see their profile and
"No deliveries yet".

**Independent Test**: With the demo accounts:
- a new number signs in as a customer;
- a sign-in-list number reaches `/partner`;
- an active agent sees "No deliveries yet";
- the inactive agent is refused;
- the admin reaches `/admin`;
- a partner number is refused at `/agent/login`;
- a session on one surface doesn't sign in another.

### Tests for User Story 2

- [X] T070 [P] [US2] Write a failing integration test `src/features/auth/services/sign-in.int.test.ts` against the services in `src/features/auth/services/sign-in.ts` (not the action wrappers):
  - `requestCode` gives `invalid` for a bad phone; `not_registered` for an unregistered number on partner, agent or admin (and for a kitchen *contact* number that is not on its sign-in list, FR-053); `inactive` for an inactive agent;
  - `verifyCode` returns `{ token }` for the new session; with the right code it creates a `customers` row on first customer sign-in (FR-005) and creates a session for each surface; the wrong code gives `wrong_code`;
  - registration is re-checked in `verifyCode` (an agent deactivated between the two steps gives `inactive`);
  - `signOut` deletes the session;
  - `updateCustomerName` trims and limits to 60 characters.
- [X] T071 [P] [US2] Write the end-to-end test `e2e/us2-sign-in.spec.ts` (mobile), selecting accounts only through `e2e/catalogue.ts`:
  - customer sign-in with a new number (outside the catalogue) reaches `/account`;
  - partner sign-in with `kitchenWithHelper().helperPhone` reaches `/partner` showing that kitchen's name;
  - `inactiveAgent()` sees the refusal message;
  - `activeAgent()` sees "No deliveries yet" and the profile vehicle;
  - `kitchenWithHelper().helperPhone` at `/agent/login` is refused;
  - after partner sign-in, visiting `/agent` redirects to `/agent/login`;
  - sign-out returns to the login screen;
  - the sign-in screen shows the demo-code notice.
  - `test.beforeAll` calls `resetDemoData()` from `e2e/reset.ts`.

### Implementation for User Story 2

- [X] T072 [US2] Create the Zod schemas in `src/features/auth/schemas.ts`: `surface` enum; `phone` (string transformed by `normalizePhone`, error key `errors.invalidPhone`); `code` (`/^\d{6}$/`); `displayName` (trimmed, ≤ 60, may be empty); `next` (optional string that must start with the surface prefix).
- [X] T073 [US2] Implement the services in `src/features/auth/services/sign-in.ts` (no `next/*` imports; `verifyCode` returns `{ token }`) and the action wrappers in `src/features/auth/actions.ts` (`requestCodeAction`, `verifyCodeAction`, `signOutAction`, `updateCustomerNameAction`), which set and clear the surface cookie and redirect:
  - `requestCode({surface, phone})` and `verifyCode({surface, phone, code, next?})`, with registration lookups: customers always; partner by `kitchen_signins.phone`; agent by `agents.phone` and `active`; admin by `admins.phone`;
  - both call `otpProvider` (T045);
  - on success create the session, set the surface cookie and redirect;
  - `signOut({surface})` and `updateCustomerName`.
  - This passes T070.
- [X] T074 [US2] Create `src/features/auth/components/sign-in-form.tsx`, a client leaf using `useActionState`:
  - step 1 is a tel input (`inputMode="numeric"`, `autoComplete="tel"`);
  - step 2 is a code input (`inputMode="numeric"`, `autoComplete="one-time-code"`) with a "change number" link;
  - both show translated field and form errors;
  - it shows the notice "Demo: no SMS is sent; use the demo code" (FR-004).
- [X] T075 [P] [US2] Create the four login pages:
  - `src/app/(customer)/login/page.tsx`;
  - `src/app/(partner)/partner/login/page.tsx`;
  - `src/app/(agent)/agent/login/page.tsx`;
  - `src/app/(admin)/admin/login/page.tsx`.
  - Each renders `sign-in-form` with its surface and a role-specific heading, and redirects to the surface home if already signed in.
- [X] T076 [P] [US2] Create the customer account page `src/app/(customer)/account/page.tsx`. The page calls `requireSession('customer')` itself (redirect to `/login`) and shows the phone, a display-name form (`updateCustomerName`) and sign-out (FR-010).
- [X] T077 [P] [US2] Create the agent screens:
  - `src/features/agents/queries.ts` with `getAgentProfile(agentId)`;
  - `src/app/(agent)/agent/(protected)/page.tsx` with the "No deliveries yet" empty state (FR-046);
  - `src/app/(agent)/agent/(protected)/profile/page.tsx` showing name, phone and translated vehicle type plus registration.
  - Each page calls `requireSession('agent')` itself.
- [X] T078 [P] [US2] Create the minimal landing pages:
  - `src/app/(partner)/partner/(protected)/page.tsx` shows the signed-in kitchen's localised name and is extended in US3.
  - `src/app/(admin)/admin/(protected)/page.tsx` redirects to `/admin/partners`, with a placeholder `src/app/(admin)/admin/(protected)/partners/page.tsx` that is replaced in US4.
  - Each page calls `requireSession(surface)` itself (`'partner'` or `'admin'`).
- [X] T079 [US2] Add the US2 message keys (`auth.*`, `account.*`, `agent.*`, and `errors.notRegistered`, `errors.inactive`, `errors.wrongCode`) to `en.json` and `kn.json`, and update `machine-drafted.json`

**Checkpoint**: US1 and US2 work on their own. T070 and T071 pass.

---

## Phase 5: User Story 3 - Partner keeps menu, hours and open status up to date (Priority: P2)

**Goal**: A signed-in partner manages only their own kitchen: temporary closure with automatic
reopening, weekly hours, categories and dishes, with bilingual reminders and status notices. The
editors are built to be reused by admins (FR-054).

**Independent Test**: As the helper of the kitchen with two sign-ins:
- mark a dish unavailable, add a dish with only an English name (a reminder shows), and mark the
  kitchen temporarily closed;
- the customer pages reflect each change, with the reopening time;
- Reopen restores normal hours.

**Depends on**: US2 (partner sign-in), since the editors are reached through the partner session.

### Tests for User Story 3

- [ ] T080 [P] [US3] Write a failing integration test `src/features/kitchens/services/operations.int.test.ts` against the services in `src/features/kitchens/services/operations.ts`, using test actors:
  - `closeTemporarily` sets `closed_at` and `reopens_at` via `closureEnd` and gives `already_closed` when repeated;
  - `reopen` clears both, or gives `not_closed`;
  - `saveHours` replaces all rows, rejects `range_order` and `range_overlap` per day, and recalculates `reopens_at` from `closed_at` while closed;
  - every write stamps `closure_*` or `hours_updated_by_role='partner'` with the phone and time;
  - a partner session can't act on another kitchen (`unauthorised`).
- [ ] T081 [P] [US3] Write a failing integration test `src/features/menu/services/menu.int.test.ts` against the services in `src/features/menu/services/categories.ts` and `dishes.ts`, using test actors:
  - `saveCategory` requires at least one name;
  - `deleteCategory` with dishes gives `category_not_empty`;
  - `reorderCategories` and `reorderDishes` require the exact id set;
  - `saveDish` validates a price of 1–100000 whole rupees and returns `missingLanguage` when one name is empty;
  - `saveDish` with `isVeg:false` in a pure-veg kitchen gives `pure_veg_kitchen`;
  - `saveDish` with a photo stores an image and replacing it deletes the unused old one;
  - `setDishAvailable` toggles without losing fields;
  - each write stamps `updated_by_*`;
  - a partner can't touch another kitchen's dish.
- [ ] T082 [P] [US3] Write the end-to-end test `e2e/us3-partner.spec.ts` (mobile), selecting subjects only through `e2e/catalogue.ts`. Sign in as `kitchenWithHelper().helperPhone`, then:
  - mark `availableDishIn(kitchen.key)` unavailable, then check it is dimmed on `/kitchens/[id]`;
  - add a dish with only an English name, see the reminder, then check it appears on the customer menu;
  - mark the kitchen temporarily closed, then check the customer home shows "Temporarily closed" with a time;
  - tap Reopen, then check the kitchen is open again;
  - edit hours with an overlapping range, then see a day-specific error.
  - submit the dish form with a price of 0: the field error shows and the entered names are still in the form (FR-048).
  - `test.beforeAll` calls `resetDemoData()` from `e2e/reset.ts`.

### Implementation for User Story 3

- [ ] T083 [US3] Create the Zod schemas in `src/features/kitchens/schemas.ts`:
  - `rangeSchema` (`"HH:MM"` with opens < closes ≤ `"24:00"`);
  - `weekHoursSchema` (keys 1–7, 0–2 ranges, no overlap, error codes `range_order` and `range_overlap` per day, using `validateWeekHours`);
  - `kitchenIdInput` (optional uuid).
- [ ] T084 [US3] Implement the services in `src/features/kitchens/services/operations.ts` and their action wrappers in `src/features/kitchens/actions/operations.ts`: `closeTemporarily({kitchenId?})`, `reopen({kitchenId?})` and `saveHours({kitchenId?, hours})`. They use `resolveKitchenScope` and `currentActor` (T049) and `closureEnd` (T028), revalidate the customer and partner paths, and pass T080.
- [ ] T085 [US3] Create the menu Zod schemas in `src/features/menu/schemas.ts`:
  - localised required and optional name fields with the data-model limits (category names 60; dish names 80; descriptions 300);
  - `priceRupees` integer 1–100000;
  - photo `File` optional (JPEG, PNG or WebP, ≤ 5 MB).
- [ ] T086 [US3] Implement the category services in `src/features/menu/services/categories.ts` and their action wrappers in `src/features/menu/actions/categories.ts`: `saveCategory`, `deleteCategory` and `reorderCategories`. Admins and partners are both scoped through `resolveKitchenScope`.
- [ ] T087 [US3] Implement the dish services in `src/features/menu/services/dishes.ts` and their action wrappers in `src/features/menu/actions/dishes.ts`: `saveDish`, `setDishAvailable`, `deleteDish` and `reorderDishes`. These enforce the pure-veg rule (FR-035), store photos via `storeImage`, clean up with `deleteImageIfUnused`, and return `missingLanguage`. Together with T086 this passes T081.
- [ ] T088 [US3] Implement `getPartnerDashboard(kitchenId)` and `getKitchenMenuForEditor(kitchenId)` in `src/features/kitchens/queries.ts`. They return status, suspension reason, verification present, state, missing-language counts for categories and dishes (FR-036), and the full menu with each item's `updated_by_*` and `updated_at`.
- [ ] T089 [P] [US3] Create the kitchen components in `src/features/kitchens/components/`:
  - `status-notice.tsx`: pending ("customers can't see your kitchen until it is verified") or suspended (shows the admin's reason), per FR-037;
  - `closure-control.tsx`: "Close for now" or "Reopen", showing "opens again at {time}";
  - `hours-editor.tsx`: a client leaf with 7 day rows, a "closed" switch, up to 2 time ranges and per-day errors.
- [ ] T090 [P] [US3] Create the menu components in `src/features/menu/components/`:
  - `menu-editor.tsx`: lists categories and dishes with missing-language badges, available switches, and up/down reorder buttons;
  - `category-form.tsx`;
  - `dish-form.tsx`: en/kn names and descriptions, price, veg switch disabled with an explanation in a pure-veg kitchen, photo input, available switch;
  - `last-changed.tsx`: shows "changed by {role} {phone} · {time}" and is rendered only when the `showLastChanged` prop is true (admin, US4).
  - Every component takes `kitchenId?` and a `basePath` prop so the admin surface can reuse it.
  - Every form keeps the values the user entered and shows field-level errors (from translation keys) after a failed save; nothing is cleared until a save succeeds (FR-048).
- [ ] T091 [US3] Create the partner pages in `src/app/(partner)/partner/(protected)/`:
  - replace `page.tsx` with a dashboard: status notice, closure control, current state, missing translations count;
  - `menu/page.tsx`;
  - `menu/categories/new/page.tsx` and `menu/categories/[id]/page.tsx`;
  - `menu/dishes/new/page.tsx` (with `?category=`) and `menu/dishes/[id]/page.tsx`;
  - `hours/page.tsx`;
  - `kitchen/page.tsx`, the read-only admin-managed profile (FR-038);
  - plus bottom navigation in `(protected)/layout.tsx`.
  - Every page above calls `requireSession('partner')` itself and scopes queries to the session's `kitchen_id`.
- [ ] T092 [US3] Add the US3 message keys (`partner.*`, `menuEditor.*`, `hoursEditor.*`, `closure.*`, and `errors.rangeOrder`, `errors.rangeOverlap`, `errors.categoryNotEmpty`, `errors.pureVegKitchen`, `errors.invalidImage`) to `en.json` and `kn.json`, and update `machine-drafted.json`

**Checkpoint**: US3 works with US2 sign-in. T080–T082 pass.

---

## Phase 6: User Story 4 - Admin onboards and manages partners and agents (Priority: P2)

**Goal**: On desktop, admins create and edit kitchens (profile, contacts, sign-in list, hours,
photo), record stand-in verification, change status, and manage agents. They edit any kitchen's
menu, hours and closure with the shared editors and see who last changed each item.

**Independent Test**: As the demo admin at desktop width:
- create a home kitchen (it is pending and invisible);
- record a hygiene check and activate it (it appears on the customer home);
- add an agent and sign in as them;
- remove the helper of the kitchen with two sign-ins (their session ends);
- edit a dish in any active kitchen and see "last changed by" the admin.

**Depends on**: US2 (admin sign-in), and US3 (the menu and hours editors and actions reused for
FR-054).

### Tests for User Story 4

- [ ] T093 [P] [US4] Write a failing integration test `src/features/kitchens/services/admin.int.test.ts` against the services in `src/features/kitchens/services/` (`admin.ts`, `signins.ts`, `verification.ts`) and the query `listKitchensForAdmin`, using test actors:
  - `createKitchen` stores a pending kitchen with exactly 1 primary contact and at least 1 sign-in, or gives `signin_phone_taken {kitchenName}`;
  - `updateKitchenProfile` setting `pureVeg=true` with non-veg dishes gives `pure_veg_conflict {nonVegCount}`;
  - `addSignin` gives `signin_phone_taken`;
  - `removeSignin` on the last one gives `last_signin`, and otherwise deletes the row **and** that subject's sessions;
  - `recordVerification` requires a 14-digit FSSAI reference for restaurants and cloud kitchens and a 3–40 character hygiene reference for home kitchens (`kind_mismatch` otherwise), and stores `verified_by_admin_id` and `verified_at`;
  - `setKitchenStatus` to active without verification gives `needs_verification`, and to suspended without a reason gives `reason_required`;
  - `setKitchenPhoto` stores, replaces and removes the photo;
  - all actions give `unauthorised` for non-admin sessions;
  - menu, hours and closure actions called by an admin on any kitchen stamp `updated_by_role='admin'` (FR-054, FR-055).
  - `listKitchensForAdmin`: the status filter, the type filter, search by a Kannada name and by an English name, search by a contact phone and by a sign-in phone, and combined filters.
- [ ] T094 [P] [US4] Write a failing integration test `src/features/agents/services/agents.int.test.ts` against the services in `src/features/agents/services/agents.ts`, using test actors:
  - `saveAgent` validates name ≤ 60, `vehicleType` enum and `vehicleReg` ≤ 20 (uppercased);
  - a duplicate phone gives `agent_phone_taken {agentName}`;
  - `setAgentActive(false)` deletes the agent's sessions.
- [ ] T095 [P] [US4] Write the end-to-end test `e2e/us4-admin.spec.ts` (desktop), selecting subjects only through `e2e/catalogue.ts`:
  - sign in as `admin()`, then create a new home kitchen (test-generated name and numbers), which shows status Pending;
  - activating it without verification shows the error;
  - record the hygiene check, then activate; the customer home (new page) lists the kitchen;
  - suspend it with a reason, and the customer link shows not found;
  - add an agent with a new number, then sign in as that agent in a new context;
  - remove `kitchenWithHelper().helperPhone` while the helper is signed in (second context); the helper's next navigation lands on `/partner/login`;
  - edit `availableDishIn(<any active kitchen>)`, then see "last changed by" the admin.
  - `test.beforeAll` calls `resetDemoData()` from `e2e/reset.ts`.

### Implementation for User Story 4

- [ ] T096 [US4] Create the admin Zod schemas in `src/features/kitchens/admin-schemas.ts`:
  - kitchen profile: names and descriptions with the limits; `type`; `pureVeg`; `address` ≤ 200; `landmark` ≤ 100; `contacts` with ≥ 1 entry and exactly 1 primary; `signins` with ≥ 1 entry, `personName` ≤ 60 and unique phones within the input;
  - verification: FSSAI `/^\d{14}$/` or hygiene 3–40 characters, with kind matching type;
  - status, plus `reason` ≤ 200 required for suspended.
- [ ] T097 [US4] Implement the services in `src/features/kitchens/services/admin.ts` and their action wrappers in `src/features/kitchens/actions/admin.ts`: `createKitchen`, `updateKitchenProfile`, `setKitchenPhoto` and `setKitchenStatus`. The status rules are: active needs verification; suspended needs a reason; all other transitions are allowed.
- [ ] T098 [US4] Implement the services `addSignin` and `removeSignin` in `src/features/kitchens/services/signins.ts`, with wrappers in `src/features/kitchens/actions/signins.ts`. Each uses a transaction and calls `deleteSessionsForSubject` on removal (FR-053).
- [ ] T099 [US4] Implement the service `recordVerification` in `src/features/kitchens/services/verification.ts`, with its wrapper in `src/features/kitchens/actions/verification.ts`. It calls `verificationProvider.check` (T046, stand-in) and upserts `verifications` with the acting admin and the current time. With T097 and T098 this passes T093.
- [ ] T100 [P] [US4] Implement the agent schemas and actions:
  - `src/features/agents/schemas.ts`; services `saveAgent` and `setAgentActive` in `src/features/agents/services/agents.ts` (`setAgentActive` calls `deleteSessionsForSubject` on deactivation); wrappers in `src/features/agents/actions.ts`;
  - add `listAgents` to `src/features/agents/queries.ts`.
  - This passes T094.
- [ ] T101 [US4] Implement `listKitchensForAdmin({status?, type?, q?})` in `src/features/kitchens/queries.ts`, where `q` matches either name (ILIKE) or any contact or sign-in phone, and `getKitchenForAdmin(id)` (profile, contacts, sign-ins, hours, verification, status)
- [ ] T102 [P] [US4] Create the admin kitchen components in `src/features/kitchens/components/admin/`:
  - `partner-table.tsx`: status and type filters, search box, status badges;
  - `kitchen-profile-form.tsx`: bilingual fields, contact repeater with a primary radio, sign-in list repeater on create, photo;
  - `signin-list.tsx`: add and remove, with the last entry protected;
  - `verification-panel.tsx`: kind fixed by type, reference input, and the translated label "Recorded by admin, not checked with FSSAI";
  - `status-panel.tsx`: activate, suspend with reason, move to pending.
  - Every form keeps the values the user entered and shows field-level errors (from translation keys) after a failed save; nothing is cleared until a save succeeds (FR-048).
- [ ] T103 [P] [US4] Create the agent components `src/features/agents/components/agent-table.tsx` and `agent-form.tsx` (name, phone, translated vehicle type select, registration, active switch)
  - Every form keeps the values the user entered and shows field-level errors (from translation keys) after a failed save; nothing is cleared until a save succeeds (FR-048).
- [ ] T104 [US4] Create the admin partner pages in `src/app/(admin)/admin/(protected)/partners/`:
  - replace `page.tsx` with the list;
  - `new/page.tsx`;
  - `[id]/page.tsx`: profile, sign-in list, verification and status;
  - `[id]/hours/page.tsx`, `[id]/menu/page.tsx`, `[id]/menu/categories/new/page.tsx`, `[id]/menu/categories/[categoryId]/page.tsx`, `[id]/menu/dishes/new/page.tsx` and `[id]/menu/dishes/[dishId]/page.tsx`, reusing the US3 editors with `kitchenId` and `showLastChanged`.
  - Every page calls `requireSession('admin')` itself.
- [ ] T105 [P] [US4] Create the admin agent pages: `src/app/(admin)/admin/(protected)/agents/page.tsx`, `agents/new/page.tsx` and `agents/[id]/page.tsx`. Each page calls `requireSession('admin')` itself.
- [ ] T106 [US4] Add the US4 message keys (`admin.*`, `verification.*`, `agentAdmin.*`, and `errors.signinPhoneTaken`, `errors.lastSignin`, `errors.kindMismatch`, `errors.needsVerification`, `errors.reasonRequired`, `errors.pureVegConflict`, `errors.agentPhoneTaken`) to `en.json` and `kn.json`, and update `machine-drafted.json`

**Checkpoint**: US4 works with US2 and US3. T093–T095 pass.

---

## Phase 7: User Story 5 - Find food quickly with search and filters (Priority: P3)

**Goal**: Kitchen filters (type, pure veg, open now) as URL params. A three-state dish filter
(All, Veg only, Non-veg only) held in a cookie that carries into kitchen pages. Search in either
script.

**Independent Test**: On the demo data:
- searching a dish's Kannada term and its English term gives the same dish;
- each kitchen filter narrows the list to match the catalogue;
- "Veg only" hides a non-veg kitchen's non-veg dishes on its page and persists after a reload;
- "Pure veg" plus "Non-veg only" shows the explanatory empty state.

**Depends on**: US1 (home and kitchen pages).

### Tests for User Story 5

- [ ] T107 [P] [US5] Write failing unit tests `src/features/browse/domain/dish-filter.test.ts`:
  - `kitchenMatchesDishFilter(dishes, filter)`: `all` always matches (even with no available dishes); `veg` needs at least one **available** veg dish; `nonveg` needs at least one available non-veg dish;
  - `filterMenu(categories, filter)` keeps only matching dishes (unavailable matching ones stay, flagged) and drops empty categories.
- [ ] T108 [US5] Implement `src/features/browse/domain/dish-filter.ts` to pass T107
- [ ] T109 [P] [US5] Write a failing integration test `src/features/browse/filters.int.test.ts`:
  - `listKitchensForCustomer` with `type`, `pureVeg` and `openNow` (temporarily closed kitchens excluded) combined with `dishFilter`;
  - `getKitchenForCustomer(id, dishFilter)` hides non-matching dishes and empty categories, and returns `noMatchingDishes: true` when none match;
  - `searchForCustomer(q, dishFilter)` gives no query for fewer than 2 characters, matches `name_en` or `name_kn` substrings case-insensitively after NFC normalisation, returns only active kitchens, and applies the dish filter to dish results and kitchen results.
- [ ] T110 [P] [US5] Write the end-to-end test `e2e/us5-search-filter.spec.ts` (mobile), selecting subjects only through `e2e/catalogue.ts`:
  - searching `searchableDish().knTerm` and then `.enTerm` both list that dish;
  - the type filter for each type in `kitchenTypeCounts()` shows exactly that many cards;
  - "Open now" excludes `temporarilyClosedKitchen()`;
  - "Veg only", then open `nonVegKitchen()`, shows only veg dishes, and the filter still shows "Veg only" after a reload;
  - "Pure veg" plus "Non-veg only" shows the empty state, and "Clear filters" restores the list.
  - `test.beforeAll` calls `resetDemoData()` from `e2e/reset.ts`.

### Implementation for User Story 5

- [ ] T111 [US5] Create the `setDishFilter` server action in `src/features/browse/actions.ts`. It accepts `'all'|'veg'|'nonveg'` and sets the `hfd_dish_filter` cookie (path `/`, 1 year, `SameSite=Lax`). Add `readDishFilter()` in `src/features/browse/dish-filter-cookie.ts`, which defaults to `all`.
- [ ] T112 [US5] Extend `src/features/browse/queries.ts`:
  - `listKitchensForCustomer` gains `type?`, `pureVeg?`, `openNow?` and `dishFilter`, with search params parsed by Zod (invalid values ignored);
  - `getKitchenForCustomer` gains `dishFilter`, using `filterMenu`;
  - add `searchForCustomer(q, dishFilter)` with `ILIKE '%' || q || '%'` on both name columns of kitchens and dishes, active kitchens only, q trimmed and NFC-normalised.
  - This passes T109.
- [ ] T113 [P] [US5] Create the filter components in `src/features/browse/components/`:
  - `filter-bar.tsx`: kitchen type chips, a "Pure veg" toggle and an "Open now" toggle as links that update search params, with the active state shown by text as well as colour;
  - `dish-filter-control.tsx`: a 3-option form posting to `setDishFilter`;
  - `search-box.tsx`: a GET form to `/search`.
- [ ] T114 [US5] Wire the filters in:
  - update `src/app/(customer)/page.tsx` to read search params and the dish-filter cookie and render the filter bar, dish filter control and search box;
  - show the empty state with "Clear filters", including the specific explanation for pure veg plus non-veg only;
  - update `src/app/(customer)/kitchens/[id]/page.tsx` to apply the dish filter, show the control, and show "This kitchen has no {veg|non-veg} dishes" with a "Show all dishes" action.
- [ ] T115 [US5] Create the search page `src/app/(customer)/search/page.tsx`. It lists matching kitchens (cards) and matching dishes with their kitchen name linking to the kitchen page, shows unavailable dishes dimmed, and shows an empty state with suggestions.
- [ ] T116 [US5] Add the US5 message keys (`filters.*`, `dishFilter.*`, `search.*`) to `en.json` and `kn.json`, and update `machine-drafted.json`

**Checkpoint**: US5 works on top of US1. T107–T110 pass.

---

## Phase 8: User Story 6 - Reset the demo to a known state (Priority: P3)

**Goal**: One step restores the demo state, and every sign-in screen shows a demo-only panel
listing that role's accounts and the fixed code.

**Independent Test**:
- change data as admin and as partner, run `npm run demo:reset`, and confirm the changes are
  gone and the demo accounts still sign in;
- with `DEMO_MODE=true` each login shows its accounts; with `false` no panel appears.

### Tests for User Story 6

- [ ] T117 [P] [US6] Write the integration test `src/features/demo/reset.int.test.ts`. It runs `resetDemo` (T054) against `TEST_DATABASE_URL`, changes a dish and a kitchen status, resets again, and asserts that every table's contents equal the first reset, apart from the temporarily closed kitchen's `closed_at` and `reopens_at`.
- [ ] T118 [P] [US6] Write the end-to-end test `e2e/us6-demo-reset.spec.ts` (mobile), selecting subjects only through `e2e/catalogue.ts`:
  - sign in as `kitchenWithHelper().helperPhone` and mark `availableDishIn(kitchen.key)` unavailable;
  - run `npm run demo:reset` via `child_process.execSync`;
  - check the dish is available again on the customer page, and the helper can sign in again.
  - `test.beforeAll` calls `resetDemoData()` from `e2e/reset.ts`.

### Implementation for User Story 6

- [ ] T119 [US6] Create `getDemoAccounts(surface)` in `src/features/demo/queries.ts`, which reads the current registrations (admins, agents with active flag, kitchen sign-ins with kitchen name, customers), and `src/features/demo/components/demo-panel.tsx`. The panel renders only when `env.DEMO_MODE` is true, is clearly labelled "Demo only", lists name, role detail and number, and shows the fixed code (FR-011).
- [ ] T120 [US6] Render `demo-panel` below the form in all four login pages: `src/app/(customer)/login/page.tsx`, `src/app/(partner)/partner/login/page.tsx`, `src/app/(agent)/agent/login/page.tsx` and `src/app/(admin)/admin/login/page.tsx`
- [ ] T121 [US6] Add the US6 message keys (`demo.*`) to `en.json` and `kn.json`, and update `machine-drafted.json`

**Checkpoint**: All stories work on their own. T117 and T118 pass.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, parity, cleanup and the full validation gate.

- [ ] T122 [P] Rewrite `README.md`. It covers:
  - prerequisites;
  - environment variables, pointing to `.env.example`;
  - every npm script;
  - how to replace `seed/catalogue.json` and `seed/images/` with the researched catalogue;
  - the "one sanctioned tool per concern" table: framework Next.js; language TypeScript 6; styling Tailwind CSS 4; database PostgreSQL 17; ORM and migrations Drizzle; validation Zod; i18n next-intl; images sharp; unit and integration tests Vitest; end-to-end tests Playwright; lint ESLint; format Prettier; script runner tsx.
- [ ] T123 [P] Check that the `001` rows in `docs/fidelity-matrix.md` still match the delivered stand-ins (OTP fixed code and demo panel; verification recorded without lookup), and that every stand-in file has its `STAND-IN` header
- [ ] T124 Run a parity sweep:
  - `grep` `src/` for hard-coded user-facing text that lint may miss (string literals passed to `aria-label`, `alt`, `placeholder`, `title`);
  - make sure every meaningful image has alt text from a key or the localised name;
  - confirm `machine-drafted.json` lists every agent-drafted Kannada key.
- [ ] T125 Run a 360 px review of every customer, partner and agent screen in Playwright device mode: no horizontal scroll (`document.documentElement.scrollWidth <= 360`), touch targets ≥ 48px, one primary action per screen. Fix what fails in the relevant component files.
- [ ] T126 Clean up: remove dead code, commented-out code and debug logging. Confirm every `catch` in `src/features/**/actions*` logs through `src/shared/log.ts` with the action name, surface and subject id.
- [ ] T127 Run the full gate and record the results in the PR description: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run test:e2e`, then walk through manual scenarios 1–15 in `specs/001-platform-core/quickstart.md`. Note any scenario not run, and why.

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (Phase 1)**: no dependencies. T003 follows T002.
- **Foundational (Phase 2)**: depends on Setup and blocks every story.
  - Schema: T014–T017 in parallel, then T018, then T019 and T020.
  - Domain: each test task precedes its implementation (T021→T022, T023→T024, T025→T026, T027→T028). T026 and T028 need T024.
  - i18n: T029, then T030 to T036. T033 needs T032, and T035 needs T034.
  - UI: T037 needs T029. T038 to T040 run in parallel after T030.
  - Images: T041→T042→T043→T044.
  - Sessions: T047→T048→T049; these need T020 and T045.
  - Demo: T050→T051→T053→T054→T055. T053 needs T028 and T042. T056 needs T050 and T053 (`ids.ts`) and is needed by every e2e task.
  - Shells: T057–T060 need T039 and T048.
- **US1 (Phase 3)**: needs Foundational only.
- **US2 (Phase 4)**: needs Foundational only.
- **US3 (Phase 5)**: needs US2 (partner session and landing page).
- **US4 (Phase 6)**: needs US2 (admin session) and US3 (shared editors and kitchen operations).
- **US5 (Phase 7)**: needs US1 (home and kitchen pages and queries).
- **US6 (Phase 8)**: needs US2 (login pages) and Foundational (reset).
- **Polish (Phase 9)**: needs all stories.

### Story completion order

```text
Setup → Foundational ─┬─ US1 (P1) ── US5 (P3)
                      └─ US2 (P1) ─┬─ US3 (P2) ── US4 (P2)
                                   └─ US6 (P3)
                                                   → Polish
```

### Within each story

- Tests are written first and must fail. Then schemas, then actions or queries, then components,
  then pages, then message keys.
- Message-key tasks (T069, T079, T092, T106, T116, T121) all edit the same JSON files, so they
  never run in parallel with each other.

### Parallel opportunities

- **Setup**: T004–T010 in parallel after T002.
- **Foundational**:
  - schema files T014–T017;
  - the test-first domain test tasks T021, T023, T025, T027, T031, T032, T034;
  - UI primitives T038–T040;
  - adapters T045 and T046, and image test T041;
  - surface shells T057–T060.
- **After Foundational**: US1 and US2 can proceed in parallel. After US2, US3 and US6 can proceed
  in parallel. After US1, US5 can proceed alongside US3 and US4.
- **Within stories**: the test tasks are marked [P], and so are component tasks in different
  files.

---

## Parallel Examples

### User Story 1

```text
Task: "T061 Integration test for customer queries in src/features/browse/queries.int.test.ts"
Task: "T062 E2E browse happy path in e2e/us1-browse.spec.ts"
# after T063:
Task: "T064 Kitchen card in src/features/browse/components/kitchen-card.tsx"
Task: "T065 Kitchen state label in src/features/browse/components/kitchen-state-label.tsx"
Task: "T067 Menu components in src/features/browse/components/"
```

### User Story 2

```text
Task: "T070 Auth services integration test in src/features/auth/services/sign-in.int.test.ts"
Task: "T071 Sign-in E2E in e2e/us2-sign-in.spec.ts"
# after T073–T074:
Task: "T075 Four login pages"
Task: "T076 Customer account page"
Task: "T077 Agent screens"
Task: "T078 Partner/admin landing pages"
```

### User Story 3

```text
Task: "T080 Kitchen operations integration test"
Task: "T081 Menu actions integration test"
Task: "T082 Partner E2E"
# after actions:
Task: "T089 Kitchen components (status notice, closure control, hours editor)"
Task: "T090 Menu editor components"
```

### User Story 4

```text
Task: "T093 Admin kitchen actions integration test"
Task: "T094 Agent actions integration test"
Task: "T095 Admin E2E (desktop)"
Task: "T100 Agent schemas + actions"   # independent of the kitchen admin actions
Task: "T102 Admin kitchen components"
Task: "T103 Agent components"
```

### User Story 5

```text
Task: "T107 Dish filter unit tests"
Task: "T109 Filters/search integration test"
Task: "T110 Search & filter E2E"
```

### User Story 6

```text
Task: "T117 Reset integration test"
Task: "T118 Demo reset E2E"
```

---

## Implementation Strategy

### MVP first (User Story 1)

1. Complete Phase 1 (Setup) and Phase 2 (Foundational). After this, `npm run demo:reset` works.
2. Complete Phase 3 (US1): guests browse and read menus in both languages.
3. **Stop and validate**: T061 and T062, plus quickstart scenarios 1–4.

### Incremental delivery

1. US2: sign-in on all four surfaces, plus the agent screens.
2. US3: partners maintain menus, hours and closure.
3. US4: admin onboarding, agents, and admin editing with last-changed stamps.
4. US5: search and filters.
5. US6: demo panel and the reset test.
6. Polish, then the full gate in T127.

After each story, run its tests and the existing suites. Commit small changes that reference the
task id, for example `T042 Store resized images in Postgres`.

---

## Notes

- [P] tasks touch different files and depend on no incomplete task.
- Constraints quoted in tasks come from data-model.md and contracts/. Do not loosen them during
  implementation without recording a deviation in plan.md.
- The stand-in catalogue (T051) is replaced later by the researched one. The coverage test (T055)
  is the safety net when that happens.
- Avoid dependencies between stories beyond those listed above.
