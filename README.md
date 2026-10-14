# Honnavar Food Delivery (POC)

A bilingual (Kannada / English) food delivery proof of concept for Honnavar, Uttara Kannada. One
Next.js codebase serves four surfaces:

| Surface | Entry point | Who |
|---|---|---|
| Customer | `/` (sign-in at `/login`) | Anyone; browsing needs no sign-in |
| Food partner | `/partner` | Numbers on a kitchen's sign-in list |
| Delivery agent | `/agent` | Active agents registered by an admin |
| Admin panel | `/admin` | Admins from the demo data |

The project uses [Spec Kit](https://github.com/github/spec-kit) for spec-driven development:

- Project principles: `.specify/memory/constitution.md`
- Feature specs: `specs/` (feature 001: `specs/001-platform-core/`)
- Product requirements: `docs/prd/`
- What is real and what is a stand-in: `docs/fidelity-matrix.md`

## Prerequisites

- Node.js 24 LTS and npm
- PostgreSQL 17. The bundled `docker-compose.yml` runs one for you; any standard PostgreSQL works.

## Getting started

```bash
cp .env.example .env.local     # every variable is documented in this file
npm install
docker compose up -d db        # or point DATABASE_URL at your own Postgres
npm run demo:reset             # migrate and load the demo data (DESTROYS data in DATABASE_URL)
npm run dev                    # http://localhost:3000
```

With `DEMO_MODE=true`, each sign-in screen shows a **demo-only** panel listing that role's accounts.
No SMS is ever sent: the one-time code is always `DEMO_OTP_CODE` (default `123456`).

## Environment variables

All are validated at startup, and the app refuses to start with a missing or malformed one. See
`.env.example`.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | App database. **`demo:reset` and `test:e2e` drop and recreate it**, so point it at a disposable database. |
| `TEST_DATABASE_URL` | Integration tests only; wiped on every run. |
| `DEFAULT_LOCALE` | Language for first-time visitors: `en` or `kn`. |
| `DEMO_MODE` | `true` shows the demo-only account panel on sign-in screens. |
| `DEMO_OTP_CODE` | The fixed 6-digit code the OTP stand-in accepts. |

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js development server, production build, production server |
| `npm run lint` | ESLint, including a rule against hard-coded user-facing text |
| `npm run typecheck` | Generates Next.js route types, then runs `tsc --noEmit` (strict) |
| `npm test` | Vitest: unit tests, plus integration tests against `TEST_DATABASE_URL` |
| `npm run test:unit` / `test:int` | One Vitest project only |
| `npm run test:e2e` | Playwright: builds, resets `DATABASE_URL`, then runs the mobile (360 px) and desktop specs. macOS/Linux shell syntax. |
| `npm run db:generate` | Generates a new versioned SQL migration from the Drizzle schema |
| `npm run demo:reset` | One step back to the known demo state |
| `npm run format` | Prettier |

All of lint, typecheck, tests and build must pass before a feature is merged.

## Demo data (seed catalogue)

Seed **content** lives in `seed/catalogue.json` (kitchens, people, menus, hours, image file names)
plus `seed/images/`. Seed **logic** lives in `src/features/demo/`.

- The current catalogue is a **stand-in** that follows the outline in
  `specs/001-platform-core/data-model.md`. Every kitchen is marked `menuSource: "fabricated"`.
- To replace it with the researched catalogue of real Honnavar businesses, swap
  `seed/catalogue.json` and add photos to `seed/images/` (naming rules are in
  `seed/images/README.md`). Then run `npm run demo:reset`. No code changes are needed.
- The catalogue is validated with a schema on load, and a reset fails with a readable list of
  problems if the file is invalid.
- `src/features/demo/catalogue.int.test.ts` checks that any catalogue still covers the demo
  scenarios the spec needs: a pending kitchen, a suspended kitchen, a kitchen that is temporarily
  closed at reset, a dish with no Kannada name, an unavailable dish, and accounts for every role.
- The e2e tests pick subjects by these flags through `e2e/catalogue.ts`, never by name.
- Missing image files are fine: the reset logs one warning, and the app shows placeholder
  illustrations.

## One sanctioned tool per concern

| Concern | Tool |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 6 (strict) |
| Styling | Tailwind CSS 4 |
| Database | PostgreSQL 17 |
| ORM and migrations | Drizzle ORM + drizzle-kit |
| Validation | Zod |
| Internationalisation | next-intl |
| Images | sharp |
| Unit and integration tests | Vitest |
| End-to-end tests | Playwright |
| Lint | ESLint |
| Format | Prettier |
| Script runner | tsx |

Adding a second tool for a concern that is already covered means replacing the first
(constitution, Technology and Architecture).

## Code layout

```text
src/app/          routes only: one route group per surface, each with its own layout and sign-in
src/features/     auth, browse, kitchens, menu, agents, demo (services, actions, components, tests)
src/shared/       db (schema, client), i18n (messages, formatters), ui, adapters (OTP, verification), images
drizzle/          versioned SQL migrations
seed/             demo catalogue and images
e2e/              Playwright specs, one per user story
```

Server actions are thin wrappers. They parse input, resolve the acting user from the session, call
a service in `src/features/*/services/` (which never imports `next/*`), then revalidate or
redirect. Integration tests call the services directly.

## Translations

- Interface text lives in `src/shared/i18n/messages/en.json` and `kn.json`. A unit test enforces
  that both files have identical keys.
- `machine-drafted.json` lists Kannada text drafted by the agent that is pending native-speaker
  review.
- Partner content (kitchen, category and dish names) is stored in both languages. When a
  translation is missing, the page shows the other language with a visible marker.
