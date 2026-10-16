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
- Feature specs: `specs/` (001 platform core: `specs/001-platform-core/`; 002 ordering:
  `specs/002-ordering/`)
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

With `DEMO_MODE=true`, each sign-in screen shows a small **Demo only** panel with that role's
accounts and the OTP. No SMS is ever sent: the one-time code is always `DEMO_OTP_CODE` (default
`123456`).

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
| `DELIVERY_FEE_RUPEES` | Flat delivery fee on every order (default 30). |
| `DELIVERY_MINUTES` | Added to a kitchen's preparation minutes for "Expected by" (default 15). |
| `ACCEPT_WINDOW_MINUTES` | Minutes a kitchen has to accept or reject before the order is rejected automatically (default 10). |
| `GEOCODING_PROVIDER` | `nominatim` (OpenStreetMap's public service, default) or `stand-in` (fixed Honnavar places, no network). |
| `NOMINATIM_BASE_URL`, `GEOCODING_CONTACT` | Nominatim server, and the contact sent in the User-Agent as its policy requires. |
| `MAP_TILE_URL`, `MAP_TILE_ATTRIBUTION` | Map tiles and the attribution shown on every map (OpenStreetMap by default). |

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js development server, production build, production server |
| `npm run lint` | ESLint, including a rule against hard-coded user-facing text |
| `npm run typecheck` | Generates Next.js route types, then runs `tsc --noEmit` (strict) |
| `npm test` | Vitest: unit tests, plus integration tests against `TEST_DATABASE_URL` |
| `npm run test:unit` / `test:int` | One Vitest project only |
| `npm run test:e2e` | Playwright: builds, resets `DATABASE_URL`, then runs the mobile (360 px), desktop and `layout` (003 visual checks: layout rules in both languages, every route, states) specs on its own server at port 3100, with the stand-in geocoder and no map tiles. macOS/Linux shell syntax. |
| `npm run screens` | Review screenshots of every screen (customer, partner and agent at 360 and 390 px, admin at 1280 px, both languages) into `screens/` with a contact sheet at `screens/index.html`. Uses the e2e server on port 3100 and **resets** `DATABASE_URL`. Not part of the gate. |
| `npm run db:generate` | Generates a new versioned SQL migration from the Drizzle schema |
| `npm run demo:reset` | One step back to the known demo state |
| `npm run format` | Prettier |
| `npx tsx scripts/make-alert-sound.ts` | Regenerates the partner's new-order tone, `public/sounds/new-order.wav` (committed) |

All of lint, typecheck, tests and build must pass before a feature is merged.

## Demo data (seed catalogue)

Seed **content** lives in `seed/catalogue.json` (kitchens, people, menus, hours, image file names)
plus `seed/images/`. Seed **logic** lives in `src/features/demo/`.

- The catalogue is based on real Honnavar businesses with researched menus (`menuSource:
  "researched"`); the rest are fabricated (`menuSource: "fabricated"`). Kitchen map locations are
  approximate. The `notes` at the top of `seed/catalogue.json` record the sources and rules.
- To replace it, swap `seed/catalogue.json` and add photos to `seed/images/` (naming rules are in
  `seed/images/README.md`). Then run `npm run demo:reset`. No code changes are needed.
- The catalogue is validated with a schema on load, and a reset fails with a readable list of
  problems if the file is invalid.
- `src/features/demo/catalogue.int.test.ts` checks that any catalogue still covers the demo
  scenarios the spec needs: a pending kitchen, a suspended kitchen, a kitchen that is temporarily
  closed at reset, a dish with no Kannada name, an unavailable dish, and accounts for every role.
- The e2e tests pick subjects by these flags through `e2e/catalogue.ts`, never by name.
- Missing image files are fine: the reset logs one warning, and the app shows placeholder
  illustrations.

### Demo orders

The reset also restores seven orders, all placed shortly before the reset so they count as today's,
plus two saved addresses for the demo customer and a map location for every kitchen. Each order is
made by the same code as live orders, so its history and messages are real.

| Order | State at reset | For |
|---|---|---|
| `demo-placed` (#1001) | Placed, stamped with the reset time | The partner accepts it (it rejects itself after `ACCEPT_WINDOW_MINUTES`) |
| `demo-needs-agent` (#1002) | Accepted, no agent | The admin assigns an agent |
| `demo-ready` (#1003) | Ready, assigned to the first active agent | The agent picks it up and delivers it |
| `demo-out` (#1004) | Picked up | "Out for delivery" on the board; the customer's timeline |
| `demo-delivered` (#1005) | Delivered, cash collected | The agent's and partner's totals for today |
| `demo-rejected` (#1006) | Rejected ("kitchen too busy") | The customer sees the reason |
| `demo-cancelled` (#1007) | Cancelled by admin | The board's "Finished" group and messages |

Placed and rejected orders always use fabricated kitchens: a real business is never shown with an
unflattering reason (checked by `catalogue.int.test.ts`). A reset between midnight and about 01:30
IST puts some of these orders on the previous day.

## Deploying (Vercel + Neon)

Production runs on Vercel (functions in `sin1`, see `vercel.json`) against a Neon Postgres project in
Singapore (`neon.ts`, project `purple-butterfly-09592475`). Nothing else is needed: images and voice
notes live in the database, and every setting has a default except `DATABASE_URL`.

- Vercel project `navadhiti/honnavar-food-delivery`; production env vars: `DATABASE_URL` (Neon's
  **pooled** connection string) and `DEMO_MODE=true`. The DB client turns off prepared statements
  automatically on Neon's `-pooler` hosts.
- Deploy from a checkout: `npx vercel deploy --prod`. Build happens on Vercel; `next/font` fetches
  Anek Kannada at build time only.
- Migrate and reset the demo data on Neon (destroys everything in that database):

  ```bash
  DATABASE_URL="$(npx neon connection-string production --project-id purple-butterfly-09592475)" npm run demo:reset
  ```

  (`npx neon login` once first.) Use the direct, non-pooled string for migrations.
- The seeded "new" order auto-rejects 10 minutes after a reset; reset right before a demo.

## One sanctioned tool per concern

| Concern | Tool |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 6 (strict) |
| Styling | Tailwind CSS 4 |
| Icons | lucide-react (tree-shaken Lucide icon components), plus the app's own SVGs for veg marks, map pins and illustrations |
| Font | Anek Kannada (one family for Kannada and Latin), self-hosted through `next/font` |
| Database | PostgreSQL 17 |
| ORM and migrations | Drizzle ORM + drizzle-kit |
| Validation | Zod |
| Internationalisation | next-intl |
| Images | sharp |
| Maps | Leaflet with OpenStreetMap tiles |
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
src/features/     auth, browse, kitchens, menu, agents, demo, cart, addresses, orders, notifications
src/shared/       db, i18n, ui, images, audio, maps, polling, adapters (see below)
drizzle/          versioned SQL migrations
seed/             demo catalogue and images
e2e/              Playwright specs, one per user story
```

Integration adapters (constitution Principle III), each one module with a stable interface:

| Adapter | Implementation | Notes |
|---|---|---|
| `otp` | STAND-IN | Fixed demo code, nothing sent |
| `verification` | STAND-IN | Admin records the reference; no registry lookup |
| `payment` | STAND-IN | UPI always succeeds with a `DEMO-UPI-…` reference; nothing charged |
| `notifications` | STAND-IN | SMS/WhatsApp updates go to the in-app message log; nothing sent |
| `geocoding` | Real (Nominatim) + STAND-IN | The public Nominatim service allows at most 1 request per second and no search-as-you-type: the adapter queues requests 1 s apart, refuses more than 5 waiting, caches 500 results, and the map searches only on submit. More traffic or several server processes need a self-hosted Nominatim. |

Cross-role updates use short-interval polling (every 10 s while a tab is visible), not push. An
unanswered order is rejected automatically the next time any screen reads it after the acceptance
window, so no background job runs.

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
