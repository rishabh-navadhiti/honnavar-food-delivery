# Implementation Plan: Ordering

**Branch**: `002-ordering` | **Date**: 2026-10-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/002-ordering/spec.md` (Approved)

## Summary

The second feature and first demo milestone. One order moves through its lifecycle across all four
surfaces:

- **Customers** add dishes from one kitchen to a cart, sign in at checkout, pick or add a
  map-pinned address, pay by cash or the UPI stand-in, then follow the order on a status timeline
  and a static map.
- **Partners** hear a repeating alert for new orders, accept or reject them, mark them preparing
  and ready, and see a day view.
- **Admins** dispatch from a board: assign, reassign and cancel.
- **Agents** pick up and deliver, open locations in the phone's map app, record cash, and see
  today's totals.
- **Updates** that would go by SMS or WhatsApp land in an in-app message log. The demo reset
  restores orders in every state.

Technical approach, on the 001 stack and structure unchanged:

- The cart lives in a Zod-validated cookie, so it is server-rendered and survives sign-in.
- Orders, events and messages are PostgreSQL tables.
- A pure, test-first lifecycle module handles state; every change is a compare-and-set update.
- Automatic rejection is evaluated lazily whenever orders are read, so no background job is needed.
- Cross-role updates use one 10-second polling hook that calls `router.refresh()`, plus a small
  JSON feed for the partner alert.
- Three new adapters: payment (stand-in), notifications (stand-in that writes the log), and
  geocoding (Nominatim, with a stand-in for tests).
- Leaflet draws the static order map and the address pin picker.
- Voice notes are stored like images and served only to the people who need them.

## Technical Context

**Language/Version**: TypeScript 6.0 (strict) on Node.js 24 LTS (unchanged from 001)

**Primary Dependencies**: the 001 stack (Next.js 16.4, React 19.3, Tailwind CSS 4, Drizzle ORM
0.45, postgres.js, Zod 4, next-intl 4, sharp, server-only) plus **leaflet 1.9.4** and
**@types/leaflet** ([research](./research.md#dependencies-added-one-line-each-per-principle-viii))

**Storage**: PostgreSQL 17. New tables: `customer_addresses`, `audio_clips`, `orders`,
`order_items`, `order_events`, `messages`, plus the sequence `order_number_seq`. New `kitchens`
columns: location and preparation minutes. The cart is a cookie ([data-model.md](./data-model.md)).

**Testing**: Vitest 5 (unit and integration on real Postgres) and Playwright 1.64 (360 px mobile
plus desktop for the board, with a four-context cross-role test) ([R16](./research.md#r16-testing-approach-for-002))

**Target Platform**: Unchanged. Low-end Android Chrome for customer, partner and agent; desktop
for admin; any Node host or single VM with PostgreSQL.

**Project Type**: Web application (one Next.js codebase, four surfaces)

**Performance Goals**: Cross-role changes visible within 15 s (SC-003, SC-004) via 10 s polling
that pauses in hidden tabs. Leaflet (about 40 KB gzipped) loads only on the order page and the pin
picker. No other numeric budgets (constitution).

**Constraints**: Full Kannada and English parity; usable at 360 px; no paid keys; Nominatim usage
policy (1 request per second, identifying User-Agent, no autocomplete, caching); no background
jobs or queues; nothing silently faked.

**Scale/Scope**: Pilot of 100 orders a day (PRD). About 15 new or changed screens. Demo seed: 7
orders in fixed states, 2 customer addresses, locations for all 11 kitchens.

There are no open `NEEDS CLARIFICATION` items. All nine decisions requested for this plan are
resolved in [research.md](./research.md): cart storage (R1), polling (R3), lazy auto-rejection
(R5), geocoding (R7), audio (R9, R10), order numbers (R6), maps (R8), settings (R12) and seed
(R15).

## Constitution Check

*Gate before Phase 0, re-checked after Phase 1 design. Result: **PASS** both times. Two
deviations from the request are recorded in research and listed under Complexity Tracking.*

| Principle | How this plan complies | Pre | Post |
|---|---|---|---|
| I. Spec first | No new requirements. The plan implements the approved spec; routine choices are listed below for review | ✅ | ✅ |
| II. Both languages, equal | Every new string goes through en/kn keys (parity test). Statuses, reasons, labels and message texts are enum values rendered through keys at display time, so the message log follows the viewer's language (R14). Dish names on orders keep both languages with the fallback marker. Nominatim gets `accept-language`. Third-party map text is declared in the spec's text categories | ✅ | ✅ |
| III. Honest integrations | Payment, notifications and geocoding behind adapters, with STAND-IN implementations for payment and notifications, and geocoding real plus a test stand-in ([contracts/adapters.md](./contracts/adapters.md)). Fidelity matrix rows already updated in the spec commit. Tiles, `tel:` and the maps link are configuration or links, not provider code | ✅ | ✅ |
| IV. First-time smartphone users | Four taps from home to a placed cash order (R2). Cart and checkout work without JS. Large steppers. Colour plus text for every status. The alert is visual as well as audible. Leaflet only where a map is needed. Polling pauses in hidden tabs. Playwright at 360 px | ✅ | ✅ |
| V. Typed and validated at the edges | Zod on every action, the cart cookie, route-handler query parameters, uploaded audio (size, type, magic bytes) and the new env vars (fail closed). Every action re-authorises: a customer only their orders, a partner only their kitchen's, an agent only orders assigned now. Voice notes are not public | ✅ | ✅ |
| VI. Tested where it matters | Test-first: lifecycle, bill, cart, eta, expiry, `messagesFor`, dispatch groups. Integration tests on every service including races and lazy expiry. E2E per story plus the cross-role run. Seed and coverage test extended. All new env vars have working defaults | ✅ | ✅ |
| VII. Explicit states, honest errors | Loading, empty, error and not-found on every new route. `order_moved_on` shows the current status. Stale polling shows "Updated <time>". Geocoder failures leave a usable pin picker. Mic refusal leaves the form usable | ✅ | ✅ |
| VIII. Simplicity | One new dependency (Leaflet). No cart table, no SSE, no job runner, no transcoding, no state library. One polling hook reused everywhere. The lifecycle is one pure module | ✅ | ✅ |
| Tech & architecture | Leaflet with OpenStreetMap as mandated. Cross-role updates by short-interval polling as mandated. New code under `src/features/{cart,addresses,orders,notifications}` and `src/shared/{adapters,polling,maps,audio}` | ✅ | ✅ |
| Workflow | Branch `002-ordering` in its own worktree; spec approved before this plan; the plan goes to the human before tasks. `/speckit-checklist` is skipped as in 001 unless the reviewer asks for it | ✅ | ✅ |

### Routine choices made by the agent (for review, per Principle I)

These are small decisions not dictated by the spec. Any can be changed without spec edits.

1. `/cart` is both cart and checkout, so a signed-in customer places an order in four taps (R2).
2. The cart cookie is Zod-validated but **not signed** (R1, deviation from the prompt's
   preference, with the reason recorded there).
3. The cart allows at most 30 distinct dishes; the cookie lasts 30 days.
4. Polling runs every 10 s, pauses in hidden tabs, and stops on finished customer orders (R3).
5. Order numbers come from a sequence starting at 1001 and are shown as `#1042` (R6).
6. Map search runs on submit (minimum 3 characters), not as you type, because Nominatim's policy
   forbids autocomplete (R7, deviation from "debounced search").
7. Reverse lookup runs 1 s after the pin settles and only if it moved more than about 11 m. The
   cache holds 500 entries in memory per process.
8. Honnavar town centre for the default pin is 14.2798, 74.4439.
9. "Open in maps" uses a Google Maps directions URL (no key), not `geo:` (R8).
10. Map markers are inline SVG `divIcon`s; the order map has interactions turned off.
11. Voice notes are capped at 30 s and 600 KB, in WebM/Opus, Ogg or MP4, stored as recorded (R9).
12. The alert tone is a self-generated WAV that repeats every 5 s until the order is opened,
    accepted, rejected or expired (R10).
13. A customer can keep up to 10 saved addresses. Text limits: house 100, street 150, landmark
    100, rider note 200, reason note 200 characters.
14. The dispatch board shows unfinished orders of any day plus orders finished today, and finds
    any order by number.
15. "Today" is the IST calendar day of `placed_at` (partner day view) or `finished_at` (agent
    totals).
16. Preparation minutes range from 5 to 120 per kitchen; the delivery fee from 0 to 500 rupees.
17. Kitchen locations in the seed are approximate, looked up once while authoring the catalogue.
    The reset never calls the geocoder (R15).
18. E2E tests make their ordering kitchen open all day with a test-only fixture, instead of a
    clock override (R15).
19. Admins get no message list. Kitchen messages are shared by all numbers on the sign-in list.
20. "Orders" becomes the first item in the partner navigation, and `/admin` now opens the
    dispatch board instead of the partner list.

## Project Structure

### Documentation (this feature)

```text
specs/002-ordering/
├── spec.md              # Approved specification
├── plan.md              # This file
├── research.md          # Phase 0: decisions R1–R16 and dependency reasons
├── data-model.md        # Phase 1: tables, enums, lifecycle, messages per change, seed outline
├── quickstart.md        # Phase 1: run guide and four-screen demo walkthrough
├── contracts/
│   ├── routes.md        # New and changed screens, route handlers
│   ├── services.md      # Services and actions: input, success, error codes; read models
│   └── adapters.md      # Payment, notifications, geocoding
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 (/speckit-tasks; not created here)
```

### Source Code (repository root)

New and changed paths only. Everything else is as in
[001's structure](../001-platform-core/plan.md#source-code-repository-root).

```text
src/
├── app/
│   ├── (customer)/
│   │   ├── cart/                         # cart + checkout (R2)
│   │   ├── addresses/                    # list, new (map step + details), [id]
│   │   ├── orders/                       # list, [id] order page (polls)
│   │   ├── messages/
│   │   └── kitchens/[id]/                # changed: add buttons, cart bar, eta range
│   ├── (partner)/partner/
│   │   ├── (protected)/orders/           # list, [id] (polls)
│   │   ├── (protected)/day/
│   │   ├── (protected)/messages/
│   │   └── orders/new/route.ts           # JSON feed for the new-order alert
│   ├── (agent)/agent/(protected)/        # changed home (polls), orders/[id], messages
│   ├── (admin)/admin/(protected)/orders/ # dispatch board, [id]
│   ├── api/geo/search/route.ts           # geocoding (customer or admin session)
│   ├── api/geo/reverse/route.ts
│   └── voice-notes/[id]/route.ts         # authorised audio
├── features/
│   ├── cart/                             # domain/cart.ts (+ test), cookie.ts, actions, components
│   ├── addresses/                        # services, schemas, components (pin step, details, voice recorder)
│   ├── orders/
│   │   ├── domain/                       # lifecycle, bill, eta, expiry, dispatch-group, today (+ tests)
│   │   ├── services/                     # place, customer, partner, admin, agent, expire (+ int tests)
│   │   ├── queries.ts                    # read models (contracts/services.md)
│   │   └── components/                   # timeline, status badge, order card, board, alert, reason forms
│   ├── notifications/                    # domain/messages-for.ts (+ test), queries, message list component
│   ├── kitchens/                         # changed: location and prep minutes on the admin forms
│   ├── agents/                           # changed: deactivation guard
│   └── demo/                             # changed: catalogue schema, loader (orders, addresses, timelines)
└── shared/
    ├── adapters/payment/                 # types, stand-in, index
    ├── adapters/notifications/           # types, stand-in (writes messages), index
    ├── adapters/geocoding/               # types, nominatim (queue, cache), stand-in, index
    ├── polling/                          # use-polling.ts, live-refresh.tsx
    ├── maps/                             # order-map.tsx, pin-picker.tsx, open-in-maps.ts
    ├── audio/                            # store.ts (validate, save, read), test-audio.ts
    └── env.ts                            # changed: new settings (R12)
public/sounds/new-order.wav               # generated by scripts/make-alert-sound.ts
seed/catalogue.json                       # changed: kitchen locations, prep minutes, addresses, orders
e2e/                                      # us1–us8 specs, fixtures.ts (openAllDay), cross-role milestone spec
```

**Structure Decision**: Same single Next.js project and feature-domain layout as 001.
- Ordering splits into `cart` (device state), `addresses` (customer data), `orders` (lifecycle,
  shared by all four surfaces) and `notifications` (the message log), so each surface's pages stay
  thin.
- Maps, polling and audio storage are shared because several surfaces use them.
- The partner and admin kitchen forms from 001 gain fields rather than new screens.

## Complexity Tracking

No constitution violations. Two deviations from the plan prompt and one structural choice are
recorded with reasons:

| Item | Why | Simpler alternative rejected because |
|---|---|---|
| Cart cookie not signed (prompt preferred signed) | Signing protects nothing: the cookie holds only ids and quantities, and every value is re-checked against the database (R1) | — (this *is* the simpler option; listed for the reviewer) |
| Map search on submit, not debounced as-you-type (prompt said "debounced search") | Nominatim's usage policy forbids autocomplete against the public service (R7) | As-you-type search would breach the policy and risk the server being blocked |
| Two polling consumers (`router.refresh()` on pages, a JSON feed for the partner alert) | The alert must run on every partner screen, including editors, where a full RSC refresh every 10 s would waste data on 2G (R3) | Refreshing every partner page would re-render menus and editors every 10 s for an alert that needs a few bytes |
