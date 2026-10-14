# Quickstart: Platform Core (001)

A run-and-validate guide that proves the feature works from a clean clone. It shows commands and
expected outcomes only; behaviour details are in [spec.md](./spec.md), routes in
[contracts/routes.md](./contracts/routes.md), and data in [data-model.md](./data-model.md).

## Prerequisites

- Node.js 24 LTS and npm
- Docker (for the bundled Postgres), or any PostgreSQL 17 you can reach

## Environment

Copy `.env.example` to `.env.local`. Every variable is documented there and validated at startup
(the app refuses to start if one is missing or malformed).

| Variable | Example | Purpose |
|---|---|---|
| `DATABASE_URL` | `postgres://hfd:hfd@localhost:5432/hfd` | App database |
| `TEST_DATABASE_URL` | `postgres://hfd:hfd@localhost:5432/hfd_test` | Integration tests only; wiped by tests |
| `DEFAULT_LOCALE` | `en` | Language for first-time visitors (`en` or `kn`) |
| `DEMO_MODE` | `true` | Shows the demo-only account panel on sign-in screens |
| `DEMO_OTP_CODE` | `123456` | The fixed code accepted by the OTP stand-in |

## Run

```bash
npm install
docker compose up -d db        # or point DATABASE_URL at your own Postgres
npm run demo:reset             # migrate + seed the known demo state (one step)
npm run dev                    # http://localhost:3000
```

## Check gates (all must pass before claiming done)

```bash
npm run lint
npm run typecheck
npm test                       # Vitest unit + integration (needs TEST_DATABASE_URL)
npm run build
npm run test:e2e               # Playwright: builds, resets demo data, runs mobile + admin projects
```

## Manual validation scenarios (from the demo state)

Open each URL on a phone, or in a browser's device mode at **360 px** width (admin at desktop
width). The demo account numbers are shown on every sign-in screen.

| # | Steps | Expected | Spec |
|---|---|---|---|
| 1 | Open `/` as a guest | 7 active kitchens; Market Road Lunch Home (suspended) and Havyaka Oota Mane (pending) absent; Kamalakka's shows "Temporarily closed" with its reopening time; Honnavar Biryani Box shows "Closed" and opens at 6:30 pm (during the day) | US1, FR-039, FR-051 |
| 2 | Switch to ಕನ್ನಡ | Every label, state, price and time in Kannada (e.g. "ಮಧ್ಯಾಹ್ನ 1:30"); the reload keeps Kannada | FR-012–FR-015, FR-018 |
| 3 | Open Shanta's Konkani Kitchen in Kannada | The dish without a Kannada name shows its English name with the language marker | FR-017 |
| 4 | Tap the call button on a kitchen page | The dialler opens with the primary contact number | FR-041 |
| 5 | Set the dish filter to "Veg only", open Sagara Fish Meals | Only veg dishes; fish categories hidden; filter still "Veg only" after reload | FR-043 |
| 6 | Turn on "Pure veg" + set the dish filter to "Non-veg only" | Empty list with an explanation and a clear-filters button | Edge case |
| 7 | Search "ನೀರ್" then "neer" | Same neer dose dishes and kitchens both times | FR-044 |
| 8 | `/partner/login` with Sharavathi's helper number + code | Sharavathi dashboard; mark temporarily closed → customer home shows it closed with the reopening time; tap Reopen | US3, FR-031, FR-053 |
| 9 | As that partner, add a dish with only an English name | Saved; reminder that Kannada is missing; visible on the customer menu | FR-034, FR-036 |
| 10 | `/agent/login` with the inactive agent's number | Refused: contact the operations team | FR-007 |
| 11 | `/agent/login` with an active agent | "No deliveries yet"; profile shows the vehicle | FR-046 |
| 12 | `/admin/login` (desktop) → Havyaka Oota Mane → record hygiene check → Activate | Kitchen now on the customer home | US4, FR-021, FR-022 |
| 13 | As admin, remove Sharavathi's helper number while the helper is signed in (other browser) | The helper's next action lands on `/partner/login` | FR-053 |
| 14 | As admin, edit a dish in Goli Baje Corner | The dish shows "last changed by" the admin and the time | FR-054, FR-055 |
| 15 | Run `npm run demo:reset` | All changes from 8–14 gone; the demo accounts still work | FR-049, SC-008 |
