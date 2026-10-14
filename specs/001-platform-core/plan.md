# Implementation Plan: Platform Core

**Branch**: `001-platform-core` | **Date**: 2026-10-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-platform-core/spec.md` (Approved)

## Summary

The first feature of the Honnavar Food Delivery POC. It gives each of the four roles its own
sign-in surface:

- **Admins** onboard kitchens (bilingual profile, contacts, a sign-in list, hours, a stand-in
  verification) and delivery agents.
- **Partners and admins** maintain menus, hours and temporary closures.
- **Customers** browse, filter and search kitchens and menus in Kannada or English without signing
  in.
- A **one-step demo reset** loads Honnavar demo data from a replaceable catalogue file. The data is
  based on real businesses; the current outline stands in until the researched catalogue arrives.

Technical approach:

- One Next.js 16 App Router app with one route group per surface. Pages are server-rendered.
- All mutations are Zod-validated server actions over PostgreSQL via Drizzle.
- Sign-in uses our own database-backed sessions, with one cookie per surface.
- `next-intl` provides translations, with the locale held in a cookie.
- Stand-in adapters handle OTP delivery and verification.
- Pure, test-first domain functions cover opening hours, open state and temporary closure.

## Technical Context

**Language/Version**: TypeScript 6.0 (strict) on Node.js 24 LTS ([R1](./research.md#r1-runtime-and-language-versions))

**Primary Dependencies**: Next.js 16.4 (App Router), React 19.3, Tailwind CSS 4, Drizzle ORM 0.45
and drizzle-kit, postgres.js, Zod 4, next-intl 4, sharp, server-only (full list with reasons in
[research.md](./research.md#dependencies-added-one-line-each-per-principle-viii))

**Storage**: PostgreSQL 17 (standard; Docker Compose for local development), images as `bytea`
([R7](./research.md#r7-image-storage-and-resizing))

**Testing**: Vitest 5 (unit tests; integration tests against a real test database), Playwright
1.64 (end-to-end on a 360 px mobile viewport, plus desktop for admin)

**Target Platform**: Any Node host or single VM with PostgreSQL. Clients are low-end Android
Chrome (customer, partner, agent) and desktop browsers (admin).

**Project Type**: Web application (one Next.js codebase, four surfaces)

**Performance Goals**: No numeric budgets (constitution). Pages are server-rendered with minimal
client JS; images are resized and lazily loaded; fonts are self-hosted.

**Constraints**: Full Kannada/English parity; usable at 360 px; no paid keys; nothing
provider-specific beyond PostgreSQL; nothing silently faked.

**Scale/Scope**: Pilot of about 10–30 kitchens and a few hundred dishes. About 25 screens across
four surfaces. Demo data: 9 kitchens, 1 admin, 3 agents, 1 customer.

There are no open `NEEDS CLARIFICATION` items: everything technical is resolved in
[research.md](./research.md).

## Constitution Check

*Gate before Phase 0, re-checked after Phase 1 design. Result: **PASS** both times, with no
violations.*

| Principle | How this plan complies | Pre | Post |
|---|---|---|---|
| I. Spec first | The plan adds no requirements. The agent's routine choices are listed below for review. The spec is approved | ✅ | ✅ |
| II. Both languages, equal | next-intl with en/kn files; a key-parity unit test; `react/jsx-no-literals` lint rule; bilingual columns with `pickLocalized` fallback marker; Kannada day-period time format so no Latin "PM" ([R2](./research.md#r2-internationalisation-library), [R3](./research.md#r3-locale-formatting-prices-dates-times)); language switch in every surface layout | ✅ | ✅ |
| III. Honest integrations | OTP and verification behind adapters with `STAND-IN` implementations ([contracts/adapters.md](./contracts/adapters.md)); `tel:` links are not an integration; fidelity matrix rows for 001 match the spec | ✅ | ✅ |
| IV. First-time smartphone users | Server Components by default; filters and preferences as plain forms that work without JS; 48 px touch targets; veg mark uses symbol plus text; resized WebP with lazy loading; `next/font`; one primary action per screen; Playwright at 360 px | ✅ | ✅ |
| V. Typed and validated at the edges | TS strict; Zod on every action input, search param and env var (fails closed); `server-only` on db, sessions and adapters; authorisation re-checked in every action; no secrets client-side (only hashed session tokens server-side) | ✅ | ✅ |
| VI. Tested where it matters | Test-first domain functions (hours, state, closure end, phone, fallback, dish filter, formatting); integration tests for every action against real Postgres; one Playwright happy path per user story; `npm run demo:reset`; `.env.example` documents every variable | ✅ | ✅ |
| VII. Explicit states, honest errors | `loading.tsx`, `error.tsx`, `not-found.tsx` per route group; empty states per list; `Result` types with translated codes; JSON logs with context | ✅ | ✅ |
| VIII. Simplicity | No auth library, search index, time-zone library, object store or provider-selection settings; each dependency has a one-line reason; shared editors are reused by partner and admin rather than duplicated | ✅ | ✅ |
| Tech & architecture | Exactly the mandated stack. The i18n library choice is recorded here and goes into README. `src/features/*` plus shared folders; route groups per surface; server-only isolation | ✅ | ✅ |
| Workflow | Branch `001-platform-core`; README gets the "one sanctioned tool per concern" table during implementation. **`/speckit-checklist` was skipped for this feature by decision**: the spec quality checklist and `/speckit-analyze` covered requirement quality for this first feature | ✅ | ✅ |

### Routine choices made by the agent (for review, per Principle I)

These are small decisions not dictated by the spec. Any can be changed without spec edits.

1. Customer kitchen URLs use the kitchen id (`/kitchens/[id]`) rather than a name-based slug.
2. Sessions last 30 days and are extended when used. There is one session cookie per surface.
3. Uploaded photos: JPEG, PNG or WebP up to 5 MB, stored as WebP variants at 320 px and 800 px.
4. Search needs at least 2 characters and matches substrings of either language's name.
5. The home list shows open kitchens first, then sorts by name in the selected language.
6. The admin verification screen labels the record "recorded by admin, not checked with FSSAI"
   (a translated interface string). This keeps the stand-in visible to the operator.
7. FSSAI references must be 14 digits; hygiene-check references 3–40 characters.
8. Text limits: kitchen and dish names 80, category names 60, descriptions 300, address 200,
   landmark 100, person names 60 characters.
9. Admins may move a kitchen from any status to any other. Activation needs verification, and
   suspension needs a reason.
10. Menus and categories are reordered with up/down buttons, not drag-and-drop (no client library).
11. Demo phone numbers use the `90000xxxxx` block. The demo panel lists them with their role.
12. Formatting uses Prettier and linting uses ESLint. Both go in the README tool table.
13. Seed kitchens and dishes have photos, loaded from `seed/images/` through the same resize path
    as uploads. The SVG placeholder is only the fallback for a missing file or a partner with no
    upload ([R8](./research.md#r8-seed-photos)).
14. Seed content lives in `seed/catalogue.json`, separate from the seed logic. It has deterministic
    ids, records `menuSource` per kitchen, and an integration test checks its FR-050 to FR-052
    coverage ([R15](./research.md#r15-demo-reset-and-seed)).

## Project Structure

### Documentation (this feature)

```text
specs/001-platform-core/
├── spec.md              # Approved specification
├── plan.md              # This file
├── research.md          # Phase 0: decisions R1–R16 and dependency reasons
├── data-model.md        # Phase 1: tables, rules, state transitions, seed outline
├── quickstart.md        # Phase 1: run and validation guide
├── contracts/
│   ├── routes.md        # Screens and route handlers per surface
│   ├── server-actions.md# Every mutation: input, success, error codes
│   └── adapters.md      # OTP and verification adapter interfaces (stand-ins)
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 (/speckit-tasks; not created here)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── layout.tsx                    # html/body, fonts, NextIntl provider
│   ├── (customer)/                   # / , /kitchens/[id], /search, /login, /account
│   │   ├── layout.tsx                # customer header + language switch
│   │   ├── loading.tsx, error.tsx, not-found.tsx
│   │   └── …pages
│   ├── (partner)/partner/            # /partner, /partner/menu…, /partner/hours, /partner/login
│   ├── (agent)/agent/                # /agent, /agent/profile, /agent/login
│   ├── (admin)/admin/                # /admin/partners…, /admin/agents…, /admin/login
│   └── media/[id]/[variant]/route.ts # image bytes
├── features/
│   ├── auth/                         # phone normalisation, sessions, sign-in actions, guards
│   ├── kitchens/                     # profile, status, verification, sign-in list, hours, closure
│   │   └── domain/                   # hours.ts, state.ts, closure.ts (+ *.test.ts)
│   ├── menu/                         # categories, dishes, shared menu editor components
│   ├── browse/                       # customer list, filters, dish filter, search queries
│   ├── agents/                       # agent CRUD, agent profile screen
│   └── demo/                         # catalogue schema, seed loader, reset script, demo sign-in panel
└── shared/
    ├── db/                           # Drizzle schema, client (server-only), test helpers
    ├── i18n/                         # next-intl config, formatters, messages/{en,kn,machine-drafted}.json
    ├── adapters/
    │   ├── otp/                      # index.ts, types.ts, stand-in.ts
    │   └── verification/             # index.ts, types.ts, stand-in.ts
    ├── ui/                           # buttons, inputs, cards, veg mark, badges, placeholders/
    ├── result.ts                     # Result<T> type
    ├── log.ts                        # JSON logger
    └── env.ts                        # Zod-validated env (server-only)
drizzle/                              # versioned SQL migrations (drizzle-kit)
seed/
├── catalogue.json                    # demo content: kitchens, people, menus, hours, image names
└── images/                           # seed photos (resized on load like uploads)
e2e/                                  # Playwright specs, one per user story
docker-compose.yml                    # local Postgres 17
.env.example                          # every env var, documented
```

Tests sit next to the code they cover: `*.test.ts` for unit tests and `*.int.test.ts` for
integration tests. End-to-end tests live in `e2e/`.

**Structure Decision**: A single Next.js project, organised by feature domain under
`src/features/`, with shared UI, i18n, database and adapters under `src/shared/`. `src/app/` holds
only routes, with one route group per surface (each with its own layout, sign-in screen and session
cookie), as the constitution's structure rules require. The menu and hours editors live in
`features/menu` and `features/kitchens`. Both `/partner/...` and `/admin/partners/[id]/...` render
them, which satisfies FR-054 without duplication.

## Complexity Tracking

No constitution violations to justify. Two choices that might look like extra complexity are
recorded with their reasons in research.md:

- Images are stored in PostgreSQL ([R7](./research.md#r7-image-storage-and-resizing)). This avoids
  provider-specific storage and survives redeploys on free hosts with ephemeral disks.
- A custom Kannada time format ([R3](./research.md#r3-locale-formatting-prices-dates-times)) avoids
  the Latin "PM" that the CLDR default produces.
