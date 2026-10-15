---

description: "Task list for 002-ordering"
---

# Tasks: Ordering

**Input**: Design documents from `specs/002-ordering/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included. Constitution Principle VI requires them:
- test-first unit tests for domain logic (lifecycle, bill, cart, eta, expiry, messages);
- integration tests for every service and route handler against a real test database;
- one end-to-end happy path per user story on a 360 px viewport, plus a cross-role milestone run.

Test tasks come before the implementation they cover and must fail first.

**Organization**: Tasks are grouped by user story (US1–US8 from spec.md) so each story can be
implemented and tested on its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: The user story the task belongs to (US1–US8 from spec.md)

## Path Conventions

Same single Next.js project as 001:
- `src/app/` holds routes, with one route group per surface.
- `src/features/<domain>/` holds feature code; `src/shared/` holds shared code.
- `drizzle/` holds migrations; `seed/` holds the demo catalogue; `e2e/` holds Playwright tests.
- Unit tests are `*.test.ts` and integration tests are `*.int.test.ts`, next to the code they cover.
- 002 end-to-end files are named `e2e/ordering-*.spec.ts` so they do not clash with 001's
  `e2e/us*-*.spec.ts`.

## Conventions for every task

All 001 conventions still apply (see `specs/001-platform-core/tasks.md`, "Conventions for every
task"). In short, and with what 002 adds:

- **Copy**: no user-facing text in code. Every string is a key in
  `src/shared/i18n/messages/en.json` **and** `kn.json`; agent-drafted Kannada is listed in
  `machine-drafted.json`. Statuses, reasons, payment methods, address labels and message texts are
  enum values rendered through keys, never stored text (research R14).
- **Services seam**: every operation in [contracts/services.md](./contracts/services.md) is a
  service `(actor, input) => Promise<Result<T>>` in `src/features/<feature>/services/`. It is
  `server-only`, validates with `parseInput` (`fields.id()` for uuids) and never imports `next/*`.
  The `'use server'` action is a thin `<operation>Action` wrapper that resolves the actor, calls
  the service and revalidates or redirects. Integration tests call services directly with test
  actors.
- **Order writes**: every status change, assignment or cancellation goes through `applyTransition`
  (T027). It runs lazy expiry, does a compare-and-set update, and writes the `order_events` row and
  the messages (via `Notifier`) in one transaction. A lost race returns `order_moved_on { status }`.
- **Order reads**: every read model that returns orders calls `expireOverdueOrders` for its scope
  first (research R5).
- **Page-level session checks**: every page under a `(protected)` group, and every customer page
  that needs a customer, calls `requireSession(surface)` itself.
- **Polling pages** mount `<LiveRefresh />` and `<UpdatedAt />` (T030), so a failed refresh leaves
  the last render with its stale "Updated" time; they never poll JSON except the partner alert
  feed.
- **E2E**: each spec file calls `resetDemoData()` in `test.beforeAll` and selects subjects from
  `seed/catalogue.json` by flags and keys through `e2e/catalogue.ts`, never by name. Specs that
  place orders call `openAllDay(kitchenId)` from `e2e/fixtures.ts` after the reset, and every spec
  that renders a map calls `blockMapTiles(page)`.
- **Commits**: one or more small commits per story, each referencing task ids, after that story's
  tests pass (for example `T052 Place orders with snapshot and idempotency`).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Dependencies, settings, test tooling and the alert sound.

- [X] T001 Install `leaflet@1.9.4` and dev dependency `@types/leaflet` (research "Dependencies added"); confirm `npm run build` still passes in `package.json`
- [X] T002 Extend `src/shared/env.ts` with the research R12 settings, Zod-validated and failing closed:
  - `DELIVERY_FEE_RUPEES` integer 0–500, default 30;
  - `DELIVERY_MINUTES` integer 1–180, default 15;
  - `ACCEPT_WINDOW_MINUTES` integer 1–120, default 10;
  - `GEOCODING_PROVIDER` `nominatim | stand-in`, default `nominatim`;
  - `NOMINATIM_BASE_URL` URL, default `https://nominatim.openstreetmap.org`;
  - `GEOCODING_CONTACT` string, default `https://github.com/rishabh-navadhiti/honnavar-food-delivery`;
  - `MAP_TILE_URL` string containing `{z}`, `{x}` and `{y}`, default `https://tile.openstreetmap.org/{z}/{x}/{y}.png`;
  - `MAP_TILE_ATTRIBUTION` string, default `© OpenStreetMap contributors`.
  Document each with a comment in `.env.example`, matching the quickstart table.
- [X] T003 [P] Create `scripts/make-alert-sound.ts`, which writes `public/sounds/new-order.wav`: a two-tone beep of about 1 s, 8 kHz, 16-bit mono PCM, using only Node built-ins. Run it once with `npx tsx scripts/make-alert-sound.ts` and commit both files (research R10).
- [X] T004 [P] Update `playwright.config.ts`:
  - the mobile project's `testMatch` also matches `ordering-us[1245678]-.*\.spec\.ts` and `ordering-milestone\.spec\.ts`; the desktop project also matches `ordering-us3-.*\.spec\.ts`;
  - Chromium `launchOptions.args` `['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']` for both projects;
  - `webServer.env` adds `GEOCODING_PROVIDER: 'stand-in'`.
- [X] T005 [P] Create `e2e/fixtures.ts` with:
  - `openAllDay(kitchenId)`: writes 00:00–24:00 hours for all 7 days and clears any temporary closure for that kitchen in the `DATABASE_URL` database, server-side like `e2e/reset.ts` (research R15);
  - `blockMapTiles(page)`: `page.route` aborts every request to the `MAP_TILE_URL` host.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema, the pure domain, the order write path, adapters used by every story,
polling, shared copy and the extended demo seed. No user story can start until this phase is
complete.

### Database schema and migration (data-model.md)

- [X] T006 [P] Create `src/shared/db/schema/orders.ts` with enums `order_status`, `payment_method`, `order_reason`, `order_event_kind`, `order_actor` (values verbatim from data-model.md "New enums"), the sequence `order_number_seq` (`START WITH 1001`), and these tables with every rule from data-model.md:
  - `orders`:
    - `order_no` integer unique, defaulting to `nextval('order_number_seq')`;
    - `place_key` unique with `customer_id`;
    - `item_total`, `delivery_fee`, `grand_total` integers with CHECK `grand_total = item_total + delivery_fee`, all ≥ 0;
    - `reason_note` varchar(200);
    - CHECK `reason` not null when status = `rejected`;
    - CHECK `cash_collected` equals `grand_total` when set;
    - CHECK `agent_id` is null when status is `placed` or `rejected`, and set when status is `picked_up` or `delivered`;
    - address snapshot columns `addr_label`, `addr_house` varchar(100), `addr_street` varchar(150), `addr_landmark` varchar(100), `addr_rider_note` varchar(200), `addr_lat`/`addr_lng` numeric(9,6), `addr_geocoded_text` varchar(300), and `addr_voice_note_id` (FK restrict);
    - `address_id` FK set null, `agent_id` FK restrict, `kitchen_id` and `customer_id` FK restrict;
    - `expected_at`, `placed_at`, `status_changed_at`, `finished_at`, `assigned_at`;
    - indexes (`kitchen_id`, `placed_at`), (`customer_id`, `placed_at`), (`agent_id`), (`status`), and a partial index on `placed_at` where `status = 'placed'`.
  - `order_items`: PK (`order_id`, `position`); `dish_id` FK set null; `name_en`/`name_kn` varchar(80) with CHECK at least one; `price_rupees` 1–100000; `quantity` smallint 1–20; CHECK `line_total = price_rupees * quantity`.
  - `order_events`: `kind`, `actor`, `actor_phone` varchar(10) nullable, `agent_id`, `previous_agent_id`, `reason`, `reason_note`, `at`; index (`order_id`, `at`).
- [X] T007 [P] Create `src/shared/db/schema/addresses.ts` with:
  - enum `address_label` (`home`, `work`, `other`);
  - `audio_clips`: `sha256` char(64) unique, `mime` varchar(40), `bytes` bytea, `byte_size` integer, `created_at`;
  - `customer_addresses`: `customer_id` FK cascade; `label`; `house` varchar(100) not null; `street` varchar(150) null; `landmark` varchar(100) not null; `rider_note` varchar(200) null; `voice_note_id` FK set null; `lat`/`lng` numeric(9,6) not null, CHECK lat 6–37 and lng 68–98; `geocoded_text` varchar(300) null; timestamps; index on `customer_id`.
- [X] T008 [P] Create `src/shared/db/schema/messages.ts`:
  - enums `message_recipient` and `message_kind` (values verbatim from data-model.md);
  - table `messages` with `customer_id`, `kitchen_id` and `agent_id` (FK cascade, CHECK exactly one set and matching `recipient`), `order_id` FK cascade, `kind`, `params` jsonb, `created_at`;
  - indexes (`customer_id`, `created_at`), (`kitchen_id`, `created_at`), (`agent_id`, `created_at`).
- [X] T009 [P] Add to `kitchens` in `src/shared/db/schema/kitchens.ts`: `location_lat` and `location_lng` numeric(9,6), nullable together (CHECK both null or both set; lat 6–37, lng 68–98), and `prep_minutes` smallint not null default 25 with CHECK 5–120.
- [X] T010 Export the new tables from `src/shared/db/schema/index.ts` and run `npm run db:generate`. Check the generated SQL in `drizzle/` contains every CHECK, the partial index and the sequence starting at 1001. Update `truncateAll` in `src/shared/db/test/helpers.ts` to include `messages, order_events, order_items, orders, customer_addresses, audio_clips` and to restart `order_number_seq`.
- [X] T011 Add test factories to `src/shared/db/test/helpers.ts` and `src/shared/db/test/actors.ts`:
  - `makeCustomer()`, `makeAddress(customerId, overrides)`, `makeKitchenWithMenu({ open?: boolean })` (an active kitchen with hours covering now, a location, two available dishes);
  - `makeOrder({ status, agentId?, placedAt? … })`, which inserts an order with items, the matching events and a valid snapshot;
  - `customerActor()`, `agentActor()`.
- [X] T012 Extend the actor types in `src/features/auth/actor-scope.ts` with `{ role: 'customer', customerId, phone }` and `{ role: 'agent', agentId, phone }`, and add `currentCustomer()` and `currentAgent()` to `src/features/auth/actor.ts` (null when there is no valid session), keeping the partner and admin behaviour unchanged.

### Domain functions (test-first; research R4, R5, R13, R14)

- [X] T013 [P] Write failing unit tests `src/features/orders/domain/lifecycle.test.ts` for `canTransition(order, action, actor)`:
  - every allowed arrow of data-model.md "Order lifecycle", with its actor;
  - every other action is refused with a code (for example a customer cancelling an accepted order, accepting a cancelled order, `ready` from `accepted`);
  - assign and reassign are allowed only in `accepted`, `preparing` or `ready`, and only to an active agent different from the current one (`same_agent`);
  - pickup needs `ready` and `agent_id` equal to the acting agent (`not_ready`, `not_found`);
  - deliver of `cod` needs the cash confirmation (`cash_not_confirmed`);
  - admin cancel is allowed from any non-final status; final statuses refuse everything.
- [X] T014 Implement `src/features/orders/domain/lifecycle.ts` to pass T013
- [X] T015 [P] Write failing unit tests `src/features/orders/domain/bill.test.ts`: `bill(lines, deliveryFee)` returns line totals, item total, delivery fee and grand total; the grand total always equals item total plus fee; quantities outside 1–20 throw.
- [X] T016 Implement `src/features/orders/domain/bill.ts` to pass T015
- [X] T017 [P] Write failing unit tests `src/features/orders/domain/eta.test.ts` and `expiry.test.ts`:
  - `expectedAt(placedAt, prep, delivery)`, and `etaRange(25, 15)` → `{ from: 40, to: 50 }`;
  - `isOverdue(placedAt, now, 10)` is false at exactly 10:00 and true at 10:00.001 after placing;
  - `timeLeft` is never negative.
- [X] T018 Implement `src/features/orders/domain/eta.ts` and `expiry.ts` to pass T017
- [X] T019 [P] Write failing unit tests `src/features/orders/domain/dispatch-group.test.ts` and `today.test.ts`:
  - `dispatchGroup` maps every status and agent combination to `waiting_kitchen`, `needs_agent`, `assigned`, `out_for_delivery` or `finished` (FR-033);
  - `istDayBounds(now)` gives the IST midnight-to-midnight UTC instants, including just before and just after IST midnight.
- [X] T020 Implement `src/features/orders/domain/dispatch-group.ts` and `today.ts` (built on `src/features/kitchens/domain/ist.ts`) to pass T019
- [X] T021 [P] Write failing unit tests `src/features/notifications/domain/messages-for.test.ts`: `messagesFor(event, order)` returns exactly the recipients and kinds in data-model.md "Messages per change", including reassignment (new agent `agent_assigned`, previous agent `agent_unassigned`, kitchen `kitchen_agent_assigned`), cancellation with and without an agent, and nothing for `ready`. Params carry `orderNo`, and `amount`, `reason` and `reasonNote` where relevant.
- [X] T022 Implement `src/features/notifications/domain/messages-for.ts` to pass T021

### Adapters (research R11, contracts/adapters.md)

- [X] T023 [P] Create the payment adapter `src/shared/adapters/payment/{types.ts,stand-in.ts,index.ts}` with a `STAND-IN` header and `stand-in.test.ts`: `confirmUpi` always returns `{ status: 'succeeded', reference: 'DEMO-UPI-<orderRef>' }`.
- [X] T024 [P] Create the notifications adapter `src/shared/adapters/notifications/{types.ts,stand-in.ts,index.ts}` with a `STAND-IN` header. `notify(executor, notification)` inserts one `messages` row and sends nothing. Add `stand-in.int.test.ts`: the row is written inside the caller's transaction and disappears when that transaction rolls back.

### Order write path (research R4, R5)

- [X] T025 Write failing integration tests `src/features/orders/services/transition.int.test.ts`:
  - `applyTransition` updates the status with compare-and-set, sets `status_changed_at` (and `finished_at` on final states), writes one `order_events` row with actor, phone, reason and agent ids, and writes the `messagesFor` messages, all in one transaction;
  - two concurrent transitions on the same order (`Promise.all`): exactly one succeeds and the other returns `order_moved_on` with the current status;
  - `expireOverdueOrders(executor, now, scope)` rejects only Placed orders older than `ACCEPT_WINDOW_MINUTES` within the given scope (order, kitchen, customer or all), with reason `kitchen_no_response`, actor `system`, event time `now`, and an `order_rejected` customer message;
  - running it twice changes nothing more;
  - expiry racing an accept leaves exactly one of the two outcomes.
- [X] T026 Implement `src/features/orders/services/expire.ts` (`expireOverdueOrders`) to pass its part of T025
- [X] T027 Implement `src/features/orders/services/transition.ts` (`applyTransition(executor, { orderId, action, actor, now, reason?, note?, agentId?, cashCollected? })`) using `canTransition` (T014), `messagesFor` (T022) and `Notifier` (T024), to pass T025

### Polling (research R3)

- [X] T028 [P] Write failing unit tests `src/shared/polling/poller.test.ts` with fake timers for a pure `createPoller({ run, intervalMs, isVisible })`: it runs every interval while visible, skips while hidden, runs once immediately on becoming visible, and never starts a run while one is in flight.
- [X] T029 Implement `src/shared/polling/poller.ts` to pass T028, and the client hook `src/shared/polling/use-polling.ts` that wires it to `document.visibilityState`
- [X] T030 [P] Create `src/shared/polling/live-refresh.tsx` (`'use client'`; `usePolling(() => router.refresh(), { intervalMs: 10_000 })`, with an `enabled` prop) and `src/shared/polling/updated-at.tsx` ("Updated {time}", using the server render time passed as a prop and `formatTime`)

### Shared order copy and components

- [X] T031 Add the shared keys to `src/shared/i18n/messages/en.json` and `kn.json`, and list the drafted Kannada in `machine-drafted.json`:
  - `orderStatus.*` (8 values), `orderEvent.*` (10 kinds), `orderReason.*` (9 values), `paymentMethod.*` (`cod`, `upi_demo` "Paid by UPI (demo)"), `addressLabel.*`, `dispatchGroup.*`;
  - `notifications.<kind>` ICU templates for all 13 message kinds, using `{orderNo}`, `{amount}`, `{reason}`, `{reasonNote}`, `{agentName}`, `{kitchenName}`;
  - `notifications.demoLabel` ("Demo: not sent by SMS or WhatsApp");
  - `orders.number` (`#{orderNo}`).
- [X] T032 [P] Create `src/features/orders/components/status-badge.tsx` (colour plus text, never colour alone), `reason-text.tsx` (reason key plus the "other" note as entered), `payment-label.tsx` and `order-number.tsx`

### Demo seed (research R15; supplied data, no geocoding)

- [X] T033 Write failing integration tests by adding a `describe('002 ordering seed (FR-050, FR-051)')` block to `src/features/demo/catalogue.int.test.ts`, with the load time fixed at `NOW` and expecting:
  - every kitchen has `location_lat`/`location_lng` and `prep_minutes`;
  - the demo customer has 2 addresses, one with a rider note;
  - at least one order in each state: `placed`, accepted with no agent, `ready` with an agent, `picked_up`, `delivered` `cod` with `cash_collected = grand_total`, `rejected` with a reason, and `cancelled`;
  - the Placed order's `placed_at` equals `NOW`, and every seeded order's `placed_at` is within `istDayBounds(NOW)` and at most 90 minutes before `NOW`;
  - every order's events follow `canTransition` from `placed` to its status, and its messages equal `messagesFor` of those events;
  - the Ready order's agent is the first active agent in the catalogue;
  - order numbers are 1001 onwards in catalogue order;
  - reloading gives identical order ids and numbers;
  - every seeded order with status `placed` or `rejected` is at a kitchen with `menuSource: fabricated` (a real business is never shown with an unflattering reason, including an automatic "Kitchen did not respond").
- [X] T034 Extend `src/features/demo/catalogue-schema.ts`, keeping it pure (no `server-only`):
  - kitchens: required `location: { lat (6–37), lng (68–98) }` and optional `prepMinutes` (int 5–120, default 25);
  - customers: `addresses: [{ key, label: 'home'|'work'|'other', house (1–100), street? (≤150), landmark (1–100), riderNote? (≤200), location }]`;
  - top-level `orders: [{ key, customer, address, kitchen, items: [{ dish, quantity 1–20 }] (≥1), payment: 'cod'|'upi_demo', status, agent?, reason?, reasonNote?, cancelledBy?: 'customer'|'admin', placedMinutesBeforeReset: int 0–90 }]`.
  - `superRefine` checks: the referenced customer, address, kitchen, dishes (in that kitchen) and agent keys exist; the agent is active; `picked_up` and `delivered` need an agent; `rejected` needs a partner reason; `cancelled` needs `cancelledBy` (and an admin reason when the admin cancelled); `placedMinutesBeforeReset` ≥ 4 × the number of steps after Placed.
  - Add `demoIds.address(customerKey, key)` and `demoIds.order(key)` to `src/features/demo/ids.ts`.
- [X] T035 Update `seed/catalogue.json` from `/Users/rish/Development/Honnavar Food Delivery/planning/seed-research/kitchen-locations.json`. **Copy the values; do not geocode.**
  - For each kitchen key, copy `location` and `prepMinutes`.
  - Copy `demoCustomerAddresses` into the `demo-customer` entry's `addresses`.
  - Append the file's `note` to the catalogue `notes`, and add the rule "Never show a real business (menuSource: researched) as suspended or pending, or with an unflattering reason; seeded Placed and Rejected orders use fabricated kitchens." to the catalogue `notes`.
  - Then author the seven orders of data-model.md "Seed outline additions" (`demo-placed` with `placedMinutesBeforeReset: 0` and `cod`; `demo-needs-agent` UPI; `demo-ready` `cod` on the first active agent `agent-ravi`; `demo-out` UPI on `agent-suresh`; `demo-delivered` `cod` on `agent-ravi`; `demo-rejected` `kitchen_busy`; `demo-cancelled` admin `customer_request`).
  - Use active kitchens other than the `temporarilyClosedAtReset` one, available dishes, and the demo customer's addresses.
  - Place both `demo-placed` and `demo-rejected` (reason `kitchen_busy`) at **fabricated** active kitchens, `karavali-mane-oota` or `samrat-sea-food`, never at a `menuSource: researched` kitchen: a real business is never shown with an unflattering reason, and `demo-placed` is rejected automatically as "Kitchen did not respond" if nobody accepts it within the window.
- [X] T036 Extend `src/features/demo/load-catalogue.ts` to pass T033:
  - write kitchen location and `prep_minutes`, and the addresses;
  - for each order, in catalogue order:
    - insert it as Placed at `now − placedMinutesBeforeReset` with item and address snapshots, `expected_at` from `expectedAt`, and `delivery_fee` from `env.DELIVERY_FEE_RUPEES`;
    - then walk the normal path to its status with one step every 4 minutes through `applyTransition` (T027), so events and messages are produced exactly as live.
  - Restart `order_number_seq` at 1001 in the reset (`src/features/demo/reset-demo.ts`).
  - Do not call any geocoder.
- [X] T037 Add selectors to `e2e/catalogue.ts`:
  - `demoCustomer()`;
  - `placedOrder()`, `needsAgentOrder()`, `readyOrder()`, `outOrder()`, `deliveredOrder()`, `rejectedOrder()`, `cancelledOrder()`, each selected by `status` (and agent and reason) flags, never by key text in assertions, and each returning `{ id, orderNo, kitchen: KitchenRef, agent?, … }` with the order number computed from catalogue position (1001 + index);
  - `orderableKitchen()`: active, not `temporarilyClosedAtReset`, at least 2 available dishes;
  - `secondOrderableKitchen()`: another kitchen meeting the same rule, used for the replace prompt;
  - `activeAgents()`.

**Checkpoint**: `npm run demo:reset` loads orders, addresses and kitchen locations. Domain, transition and seed tests pass.

---

## Phase 3: User Story 1 - Place an order from one kitchen (Priority: P1) 🎯 MVP

**Goal**: A guest builds a one-kitchen cart, signs in at checkout, picks or adds a map-pinned
address, pays by cash or the UPI stand-in, and lands on the order page.

**Independent Test**: After `npm run demo:reset`, at 360 px as a guest, add two dishes from
`orderableKitchen()` (opened all day), go to `/cart`, sign in as the demo customer, keep the
preselected address, pay by UPI, confirm the demo sheet, and see the order page with its number,
"Paid by UPI (demo)" and "Expected by".

### Tests for User Story 1

- [ ] T038 [P] [US1] Write failing unit tests `src/features/cart/domain/cart.test.ts`:
  - `addLine` adds at quantity 1 or increments, refusing above 20 (`quantity_limit`) and beyond 30 distinct dishes (`cart_full`);
  - adding from another kitchen returns `other_kitchen` unless `replace`;
  - `setQuantity(0)` removes the line, and an empty cart clears;
  - `parseCartCookie` returns an empty cart for any value that fails the schema `{ v: 1, kitchenId: uuid, lines: [{ dishId: uuid, qty: 1–20 }] (≤ 30, unique dishId) }`;
  - the worst-case serialised cookie is under 4096 bytes.
- [ ] T039 [P] [US1] Write failing integration tests `src/features/cart/services/cart.int.test.ts` for `addToCart` against the database: `dish_unavailable` for an unavailable dish, `kitchen_closed` for a closed or temporarily closed kitchen, and success for an open kitchen.
- [ ] T040 [P] [US1] Write failing integration tests `src/shared/audio/store.int.test.ts` with a committed fixture `src/shared/audio/test-audio.ts` (a valid WebM byte array of a few hundred bytes):
  - `storeAudio` accepts `audio/webm`, `audio/ogg` and `audio/mp4` whose magic bytes match (EBML `1A45DFA3`, `OggS`, `ftyp` at offset 4);
  - it rejects more than 600 KB, other types, or mismatched bytes with `invalid_audio`;
  - identical bytes reuse the row;
  - `deleteAudioIfUnused` keeps a clip referenced by an address or an order.
- [ ] T041 [P] [US1] Write failing integration tests `src/features/addresses/services/addresses.int.test.ts` for `saveAddress` and `deleteAddress`:
  - limits verbatim: house 1–100, street ≤150, landmark 1–100, rider note ≤200, geocoded text ≤300, label `home|work|other`, location within lat 6–37 and lng 68–98;
  - at most 10 per customer (`address_limit`);
  - another customer's id gives `not_found`;
  - an attached voice note is stored, `removeVoiceNote` detaches it, and deleting the address deletes an unused clip;
  - editing and then deleting an address used by an order leaves that order's address snapshot (and its voice-note clip) unchanged.
- [ ] T042 [P] [US1] Write failing unit tests `src/shared/adapters/geocoding/nominatim.test.ts` with an injected `fetch` and fake timers:
  - search URL params `format=jsonv2`, `countrycodes=in`, the Honnavar `viewbox`, `limit=5`, `accept-language`;
  - reverse URL with `zoom=18`;
  - the `User-Agent` `honnavar-food-delivery-poc/<version> (+<GEOCODING_CONTACT>)`;
  - consecutive requests are at least 1000 ms apart, and more than 5 waiting returns `busy`;
  - a 4 s timeout returns `unavailable`;
  - the cache key rounds coordinates to 4 decimals plus locale, and a cache hit makes no request.
  Add `src/shared/adapters/geocoding/stand-in.test.ts`: substring search in both languages, at most 5, and `reverse` returning "Near <closest place>".
- [ ] T043 [P] [US1] Write failing integration tests `src/app/api/geo/routes.int.test.ts` and `src/app/voice-notes/[id]/route.int.test.ts`:
  - geo: 401 without a customer or admin session; 400 for `q` outside 3–100 characters or coordinates outside India; stand-in results otherwise;
  - voice notes: the owner customer gets 200 with the stored mime and `Cache-Control: private, max-age=3600`; another customer, a signed-out request, and an agent not assigned to an unfinished order using it get 404; the assigned agent and any admin get 200.
- [ ] T044 [P] [US1] Write failing integration tests `src/features/orders/services/place.int.test.ts` for `placeOrder` and `getCartView`:
  - COD happy path: status `placed`; snapshots of dish names (both languages), veg marks and prices; the address snapshot fields; `delivery_fee = DELIVERY_FEE_RUPEES`; `expected_at = placed + prep_minutes + DELIVERY_MINUTES`; messages `order_placed` and `kitchen_new_order`; the cart is cleared.
  - UPI without `upiConfirmed` gives `upi_not_confirmed`; with it, `payment_reference` is `DEMO-UPI-…`.
  - `cart_changed` lists `unavailable`, `removed` and `price` changes and returns the corrected cart; `kitchen_closed`; `kitchen_unavailable` for a suspended kitchen; `cart_empty`; `not_found` for another customer's address.
  - The same `placeKey` twice gives one order, and both calls return its id.
  - `getCartView` preselects the last order's address and payment method, defaulting to `cod` and the only address (FR-009, FR-010).
- [ ] T045 [P] [US1] Write the end-to-end test `e2e/ordering-us1-cart-checkout.spec.ts` (mobile). `beforeAll`: `resetDemoData()`, then `openAllDay` for `orderableKitchen()` and `secondOrderableKitchen()`; call `blockMapTiles`. As a guest:
  - add two dishes and check that the cart bar shows the count and item total;
  - add a dish from the second kitchen: the replace prompt appears; cancel keeps the cart;
  - `/cart` shows the bill equal to the sum of lines plus ₹30;
  - "Sign in to check out" → sign in as `demoCustomer()` → back on `/cart` with the same lines and the address preselected;
  - choose UPI → Place order → the demo sheet → Confirm → the order page shows the order number, "Paid by UPI (demo)" and "Expected by".
  Then add a new address from checkout, with `context.grantPermissions(['geolocation'])` and a geolocation in Honnavar:
  - search "bus" and pick a result, then Continue;
  - fill house and landmark, choose Work, record a voice note for 2 s, and save;
  - the new address is selectable at checkout.
  Finally, `/orders` lists the new order.

### Implementation for User Story 1

- [ ] T046 [US1] Implement `src/features/cart/domain/cart.ts` (pure) to pass T038, `src/features/cart/cookie.ts` (`server-only`; reads and writes `hfd_cart`, `HttpOnly`, `SameSite=Lax`, 30 days, cleared when empty), `src/features/cart/services/cart.ts` to pass T039, and `src/features/cart/actions.ts` (`addToCartAction`, `setCartQuantityAction`, `clearCartAction` behind plain forms)
- [ ] T047 [P] [US1] Create `src/features/cart/components/add-to-cart.tsx` (an Add button that becomes a −/qty/+ stepper with 48 px targets, disabled with a reason for unavailable dishes or a closed kitchen), `cart-bar.tsx` (sticky; count, item total, link to `/cart`) and `replace-cart-prompt.tsx` (rendered from `?replace=<dishId>`; confirm resubmits with `replace=true`)
- [ ] T048 [US1] Update `src/app/(customer)/kitchens/[id]/page.tsx` and `src/features/browse/queries.ts`:
  - each dish row gets `add-to-cart`, and the page gets `cart-bar` and the replace prompt;
  - show the delivery range from `etaRange(prep_minutes, DELIVERY_MINUTES)` as "{from}–{to} min" (FR-059);
  - `getKitchenForCustomer` returns `prepMinutes`.
- [ ] T049 [US1] Update the customer header in `src/app/(customer)/layout.tsx`: an "Orders" link (FR-024) and a cart badge with the item count from the cart cookie, on every customer screen
- [ ] T050 [US1] Implement `src/shared/audio/store.ts` (`server-only`; `storeAudio`, `readAudio`, `deleteAudioIfUnused`) to pass T040, and `src/app/voice-notes/[id]/route.ts` with the authorisation rules of contracts/routes.md to pass its part of T043
- [ ] T051 [US1] Implement `src/shared/adapters/geocoding/{types.ts,nominatim.ts,stand-in.ts,index.ts}` to pass T042:
  - `nominatim.ts` is `server-only`, with the queue, the 500-entry LRU and the 4 s timeout;
  - `stand-in.ts` has a `STAND-IN` header and a fixed table of about 10 Honnavar places with English and Kannada labels;
  - `index.ts` selects by `GEOCODING_PROVIDER`.
  Then implement `src/app/api/geo/search/route.ts` and `src/app/api/geo/reverse/route.ts` (Zod-validated query, customer or admin session, 503 `{ error }` on `unavailable` or `busy`) to pass the geo part of T043.
- [ ] T052 [P] [US1] Create the map pin picker `src/shared/maps/pin-picker.tsx` (`'use client'`, loaded with `next/dynamic` and `ssr: false` from a thin wrapper `pin-picker-loader.tsx`):
  - Leaflet with the tile URL and attribution passed as props from the server, and the Leaflet CSS imported here only;
  - a centre pin as an inline-SVG `divIcon` with a translated `aria-label`;
  - it starts at the device location when permission is already granted, else Honnavar centre `14.2798, 74.4439`;
  - a "Use current location" button that calls `getCurrentPosition` once and shows a message when refused;
  - a search form submitting to `/api/geo/search` (minimum 3 characters, the button disabled while a search is in flight; no search-as-you-type);
  - reverse lookup via `/api/geo/reverse` 1 s after the pin settles, only if it moved more than about 11 m, showing the text or "Address could not be looked up";
  - Continue returns `{ lat, lng, geocodedText | null }`.
- [ ] T053 [P] [US1] Create `src/features/addresses/components/voice-recorder.tsx` (`'use client'`; research R9):
  - `MediaRecorder` preferring `audio/webm;codecs=opus`, else `audio/mp4`;
  - auto-stop at 30 s with a visible countdown; play back, re-record and delete;
  - put the blob into the form's file input through `DataTransfer`;
  - "Voice notes are not available on this phone" when permission is refused or the API is missing.
- [ ] T054 [US1] Implement `src/features/addresses/schemas.ts` and `src/features/addresses/services/addresses.ts` (`saveAddress`, `deleteAddress`) to pass T041, plus `src/features/addresses/actions.ts`
- [ ] T055 [US1] Create the address screens:
  - `src/features/addresses/components/address-details-form.tsx`, with fields and limits from T041: label as three large choices Home, Work, Other; the voice recorder; field-level errors; entered data kept on failure;
  - `src/app/(customer)/addresses/new/page.tsx`: step 1 the pin picker, step 2 the details form, then redirect to `next` (customer-surface paths only);
  - `src/shared/audio/voice-note-player.tsx` (an `<audio controls preload="none">` pointing at `/voice-notes/[id]`, with a translated label; reused by US3 and US4);
  - `src/app/(customer)/addresses/page.tsx` (list, edit and delete links) and `src/app/(customer)/addresses/[id]/page.tsx` (edit; shows `voice-note-player` for a saved note so the customer can play it, alongside re-record and delete; not found unless owned);
  - links from `src/app/(customer)/account/page.tsx` to addresses, orders and messages.
- [ ] T056 [US1] Implement `src/features/orders/services/place.ts` (`placeOrder`, using `bill`, `expectedAt`, `PaymentProvider.confirmUpi` and `Notifier` in one transaction, with `place_key` idempotency) and `getCartView` in `src/features/orders/queries.ts` to pass T044, plus `placeOrderAction` (it rewrites the cart cookie on `cart_changed`, clears it on success, and redirects to `/orders/[id]`)
- [ ] T057 [P] [US1] Create the cart components in `src/features/cart/components/`:
  - `cart-lines.tsx` (steppers; dish names with the fallback marker; veg mark);
  - `bill-summary.tsx` (item total, delivery fee, grand total in rupees);
  - `address-choice.tsx` (saved addresses as large radio cards with label, house and landmark, plus "Add a new address" → `/addresses/new?next=/cart`);
  - `payment-choice.tsx` (Cash on delivery / UPI);
  - `upi-demo-sheet.tsx` (`'use client'` dialog: amount; "This is a demo. Nothing will be charged."; Confirm submits with `upiConfirmed`; Close returns);
  - `cart-changed-notice.tsx` (lists each change).
- [ ] T058 [US1] Create `src/app/(customer)/cart/page.tsx`:
  - a guest sees the lines, the bill and "Sign in to check out" → `/login?next=/cart`;
  - a signed-in customer also sees the address choice (guided to add one when none), the payment choice and "Place order" with a hidden fresh `placeKey`;
  - the empty cart state links home;
  - errors are shown through translated codes.
- [ ] T059 [US1] Create the basic order screens:
  - `getCustomerOrder` and `listCustomerOrders` in `src/features/orders/queries.ts` (with lazy expiry for the customer's scope);
  - `src/app/(customer)/orders/page.tsx`: ongoing orders, each with its number, kitchen, status badge and amount; empty state;
  - `src/app/(customer)/orders/[id]/page.tsx`: number, kitchen with call button, items, bill, payment label, address, "Expected by {time}", current status; not found unless the customer's.
- [ ] T060 [US1] Add the US1 message keys (`cart.*`, `checkout.*`, `addresses.*`, `pinPicker.*`, `voiceNote.*`, `orders.*`, `kitchen.etaRange`) to `en.json` and `kn.json`, and list the drafted Kannada in `machine-drafted.json`

**Checkpoint**: US1 works on its own. T038–T045 pass. Commit with task ids.

---

## Phase 4: User Story 2 - Partner receives and prepares orders (Priority: P1)

**Goal**: The partner hears and sees new orders on any partner screen, accepts or rejects them
with a reason, moves them to Preparing and Ready, and checks the day view.

**Independent Test**: After `npm run demo:reset`, sign in as the first sign-in of
`placedOrder().kitchen`, turn on sounds, see the highlighted order with time left, Accept,
Preparing, Ready; a second order placed by a customer appears within 15 s and is rejected with a
reason; the day view counts both.

### Tests for User Story 2

- [ ] T061 [P] [US2] Write failing integration tests `src/features/orders/services/partner.int.test.ts`:
  - `acceptOrder`, `rejectOrder` (reasons `kitchen_busy | item_unavailable | kitchen_closing | other`; `other` without a note is `invalid`; the note is at most 200 characters), `markPreparing` and `markReady`, each writing its event and messages;
  - an order of another kitchen gives `not_found`;
  - a wrong status gives `order_moved_on`;
  - accepting after `ACCEPT_WINDOW_MINUTES` gives `order_moved_on { status: 'rejected' }`, with the system event recorded.
- [ ] T062 [P] [US2] Write failing integration tests `src/features/orders/partner-queries.int.test.ts`:
  - `listPartnerOrders` returns open orders with time left for Placed, newest first;
  - `getPartnerOrder` exposes the display name (or null), landmark and rider note but **no** customer phone, house or street (FR-032);
  - `getPartnerDay` counts received, accepted, rejected-or-cancelled and delivered within `istDayBounds`, plus the item-total sum of delivered orders (FR-031);
  - `getNewOrderFeed` returns only Placed orders after expiry.
  Also test `GET /partner/orders/new` in `src/app/(partner)/partner/orders/new/route.int.test.ts`: 401 without a partner session, `Cache-Control: no-store`, and the session kitchen's orders only.
- [ ] T063 [P] [US2] Write the end-to-end test `e2e/ordering-us2-partner.spec.ts` (mobile), after `resetDemoData()` and `openAllDay(placedOrder().kitchen.id)`:
  - the partner of `placedOrder()` sees "Tap to turn on order sounds", taps it, and sees the order highlighted with its number and a time left;
  - Accept, Preparing and Ready each update the status;
  - in a second context the demo customer places an order at the same kitchen; within 15 s, on the partner's menu page (not the orders page), the new-order banner appears;
  - open it, reject with "Kitchen too busy", and the day view shows received ≥ 2 and one rejected.

### Implementation for User Story 2

- [ ] T064 [US2] Implement `src/features/orders/services/partner.ts` (`acceptOrder`, `rejectOrder`, `markPreparing`, `markReady` over `applyTransition`, scoped to `actor.kitchenId`) to pass T061, plus `src/features/orders/actions/partner.ts`
- [ ] T065 [US2] Implement `listPartnerOrders`, `getPartnerOrder`, `getPartnerDay` and `getNewOrderFeed` in `src/features/orders/partner-queries.ts` (`server-only`) to pass T062
- [ ] T066 [P] [US2] Create the partner order components in `src/features/orders/components/`:
  - `partner-order-card.tsx` (number, time placed, status badge with the time of the current status, dishes and quantities, item total, payment label, display name or "Customer", rider note; Placed highlighted; a cancelled order shows who cancelled it, customer or admin, with the reason);
  - `time-left.tsx` (`'use client'`; counts down from the server's deadline, and never shows a negative);
  - `reject-form.tsx` (the 4 reasons as large choices; a note field required for "other");
  - `partner-actions.tsx` (Accept / Reject / Preparing / Ready per status, with `order_moved_on` shown alongside the current status).
- [ ] T067 [US2] Create `src/app/(partner)/partner/(protected)/orders/page.tsx` (polls with `<UpdatedAt />`; empty state "No orders right now") and `src/app/(partner)/partner/(protected)/orders/[id]/page.tsx` (polls with `<UpdatedAt />`; a cancelled order shows who cancelled it and no actions; not found for another kitchen's order; marks the order acknowledged for the alert)
- [ ] T068 [US2] Implement `src/app/(partner)/partner/orders/new/route.ts` to pass its part of T062, and `src/features/orders/components/new-order-alert.tsx` (`'use client'`; research R10):
  - it polls the feed with `usePolling` every 10 s;
  - it shows the "Tap to turn on order sounds" button until unlocked (unlock remembered in `sessionStorage` inside try/catch);
  - it plays `/sounds/new-order.wav` every 5 s while any feed order is unacknowledged;
  - it shows a highlighted banner linking to the oldest unacknowledged order;
  - acknowledged ids live in `sessionStorage`.
  Mount it in `src/app/(partner)/partner/(protected)/layout.tsx` and make "Orders" the first navigation item.
- [ ] T069 [US2] Create `src/app/(partner)/partner/(protected)/day/page.tsx`: today's orders newest first (number, time, status badge, amount) and the five totals
- [ ] T070 [US2] Add the US2 message keys (`partnerOrders.*`, `alert.*`, `dayView.*`) to `en.json` and `kn.json`, and list the drafted Kannada in `machine-drafted.json`

**Checkpoint**: US2 works on its own. T061–T063 pass. Commit with task ids.

---

## Phase 5: User Story 3 - Admin dispatches orders to agents (Priority: P1)

**Goal**: The admin watches a five-group dispatch board, assigns and reassigns active agents,
cancels with a reason, sees full history, and sets kitchen map locations and preparation minutes.

**Independent Test**: After `npm run demo:reset`, sign in as the admin (desktop), find
`needsAgentOrder()` under "Needs agent", assign the first active agent, reassign to the second,
cancel another order with a reason, and fail to deactivate the agent holding `readyOrder()`.

### Tests for User Story 3

- [ ] T071 [P] [US3] Write failing integration tests `src/features/orders/services/admin.int.test.ts`:
  - `assignAgent`: only active agents (`agent_inactive`); `not_assignable { status }` for `placed`, `picked_up` and final statuses; `same_agent`; the first assignment writes `assigned` with messages to the kitchen and the agent; a reassignment writes `reassigned` with `previous_agent_id`, `agent_unassigned` to the previous agent and `agent_assigned` to the new one;
  - `assignAgent` racing the agent's `markPickedUp`: exactly one wins;
  - `cancelOrderByAdmin`: reasons `customer_request | kitchen_issue | no_agent | delivery_problem | other`, with a note required for `other`; it works from every non-final status, and a final status gives `order_moved_on`; messages go to the customer, the kitchen and the agent if any.
- [ ] T072 [P] [US3] Extend `src/features/agents/services/agents.int.test.ts`: `setAgentActive(false)` returns `agent_has_orders { orderNos }` while the agent holds a non-final order, and succeeds once the order is delivered.
- [ ] T073 [P] [US3] Write failing integration tests `src/features/orders/admin-queries.int.test.ts`:
  - `getDispatchBoard(now)` groups orders by `dispatchGroup`, including unfinished orders from earlier days and finished orders only from today, and lists active agents with their undelivered counts;
  - `getAdminOrder` returns the customer name and phone, the address snapshot, and events in time order with actor and phone;
  - `findOrderByNumber(1042)` returns the id or null.
- [ ] T074 [P] [US3] Extend `src/features/kitchens/services/admin.int.test.ts`: `createKitchen` and `updateKitchenProfile` accept `location` (lat 6–37, lng 68–98, or null to clear) and `prepMinutes` (int 5–120), and reject values outside those ranges with field errors.
- [ ] T075 [P] [US3] Write the end-to-end test `e2e/ordering-us3-dispatch.spec.ts` (desktop), after `resetDemoData()`:
  - the board shows `needsAgentOrder()`'s number under "Needs agent" and `placedOrder()`'s under "Waiting for kitchen";
  - assign the first of `activeAgents()`, and the order moves to "Assigned" with that agent; reassign it to the second, and the history shows both;
  - cancel `placedOrder()` with "Other" and a note, and it appears under "Finished" as cancelled with the note;
  - on the agents page, deactivating `readyOrder().agent` is refused with its order number;
  - "Find by number" with `deliveredOrder().orderNo` opens that order.

### Implementation for User Story 3

- [ ] T076 [US3] Implement `src/features/orders/services/admin.ts` (`assignAgent`, `cancelOrderByAdmin` over `applyTransition`) to pass T071, plus `src/features/orders/actions/admin.ts`
- [ ] T077 [US3] Add the deactivation guard to `setAgentActive` in `src/features/agents/services/agents.ts` to pass T072, and show `agent_has_orders` with the order numbers in `src/features/agents/components/agent-form.tsx`
- [ ] T078 [US3] Implement `getDispatchBoard`, `getAdminOrder` and `findOrderByNumber` in `src/features/orders/admin-queries.ts` (`server-only`; lazy expiry over all orders) to pass T073
- [ ] T079 [P] [US3] Create the admin components in `src/features/orders/components/`:
  - `dispatch-board.tsx` (five columns; cards with number, kitchen, delivery landmark, amount, payment label, minutes since placing, agent);
  - `assign-agent-form.tsx` (a select of active agents, each with "{n} undelivered"; Assign or Reassign);
  - `admin-cancel-form.tsx` (the five reasons, with the note required for "other");
  - `order-history.tsx` (every event with actor role, phone and time; reasons and notes).
- [ ] T080 [US3] Create `src/app/(admin)/admin/(protected)/orders/page.tsx` (board; polls with `<UpdatedAt />`; `?no=` redirects to the order or shows "not found"; links the five groups) and `src/app/(admin)/admin/(protected)/orders/[id]/page.tsx` (polls with `<UpdatedAt />`; full detail, history, assign and cancel forms, voice-note player); change `src/app/(admin)/admin/(protected)/page.tsx` to redirect to `/admin/orders`, and add "Orders" first in the admin navigation
- [ ] T081 [US3] Add location and preparation minutes to the admin kitchen form:
  - extend `src/features/kitchens/admin-schemas.ts` and the `createKitchen` and `updateKitchenProfile` services to pass T074;
  - add the pin picker (T052, reused) and a "Preparation minutes" number input (5–120) to `src/features/kitchens/components/admin/kitchen-profile-form.tsx` and the new-kitchen page.
- [ ] T082 [US3] Update 001 end-to-end tests that relied on `/admin` opening the partner list, in `e2e/us4-admin.spec.ts`, to navigate to `/admin/partners` explicitly, and confirm all 001 e2e specs still pass
- [ ] T083 [US3] Add the US3 message keys (`dispatch.*`, `adminOrder.*`, `agents.hasOrders`, `kitchenForm.location`, `kitchenForm.prepMinutes`) to `en.json` and `kn.json`, and list the drafted Kannada in `machine-drafted.json`

**Checkpoint**: US3 works on its own. T071–T075 pass. Commit with task ids.

---

## Phase 6: User Story 4 - Agent picks up and delivers (Priority: P1)

**Goal**: The agent sees assigned orders and today's totals, opens both locations in the map app,
calls the kitchen or customer, picks up once Ready, and delivers, confirming cash for COD.

**Independent Test**: After `npm run demo:reset`, sign in as `readyOrder().agent`, see today's
cash from `deliveredOrder()`, open `readyOrder()`, check both "Open in maps" links, mark Picked up
and Delivered with the cash confirmation, and see the totals grow.

### Tests for User Story 4

- [ ] T084 [P] [US4] Write failing integration tests `src/features/orders/services/agent.int.test.ts`:
  - `markPickedUp`: only `ready` orders assigned to this agent; `not_ready` otherwise; another agent's order gives `not_found`;
  - `markDelivered`: COD without `cashCollected` gives `cash_not_confirmed`, and with it `cash_collected = grand_total`; UPI needs no cash step;
  - an order reassigned away gives `not_found`;
  - messages `order_picked_up` and `order_delivered` go to the customer.
- [ ] T085 [P] [US4] Write failing integration tests `src/features/orders/agent-queries.int.test.ts`:
  - `listAgentOrders` returns only non-final orders assigned now;
  - `getAgentToday` counts deliveries and sums `cash_collected` by `finished_at` within `istDayBounds`;
  - `getAgentOrder` returns `{ state: 'mine' }` with kitchen and customer details, `{ state: 'reassigned' }` after reassignment, and `{ state: 'cancelled', reason }` after cancellation.
- [ ] T086 [P] [US4] Write failing unit tests `src/shared/maps/open-in-maps.test.ts`: with a location, `openInMapsUrl` gives `https://www.google.com/maps/dir/?api=1&destination=<lat>,<lng>`; without one, it gives `https://www.google.com/maps/search/?api=1&query=<encoded address, landmark, Honnavar>`.
- [ ] T087 [P] [US4] Write the end-to-end test `e2e/ordering-us4-agent.spec.ts` (mobile), after `resetDemoData()`:
  - sign in as `readyOrder().agent` and see a delivery count ≥ 1 and the cash total including `deliveredOrder()`'s grand total;
  - `readyOrder()` is listed; opening it shows kitchen and customer call links (`tel:`) and two "Open in maps" links whose `href` starts with `https://www.google.com/maps/`;
  - Picked up, then Delivered → confirm "Collected ₹{grand total}"; home shows the count and cash increased.
  Also update `e2e/us2-sign-in.spec.ts` (001), which expected "No deliveries yet" for an active agent: assert the agent home heading and today's totals instead, and keep the profile check.

### Implementation for User Story 4

- [ ] T088 [US4] Implement `src/features/orders/services/agent.ts` (`markPickedUp`, `markDelivered` over `applyTransition`) to pass T084, plus `src/features/orders/actions/agent.ts`
- [ ] T089 [US4] Implement `listAgentOrders`, `getAgentToday` and `getAgentOrder` in `src/features/orders/agent-queries.ts` (`server-only`) to pass T085, and `src/shared/maps/open-in-maps.ts` to pass T086
- [ ] T090 [P] [US4] Create the agent components in `src/features/orders/components/` (reusing `voice-note-player` from T055):
  - `agent-order-card.tsx` (number, kitchen name and landmark, delivery landmark, status badge with the time of the current status, amount to collect for COD);
  - `agent-order-detail.tsx` (kitchen and customer blocks with call buttons, items, the address with house, street, landmark and label, the rider note, the voice-note player, two open-in-maps links, payment and amount);
  - `deliver-form.tsx` (for COD, a confirmation step "Collected ₹{amount} in cash").
- [ ] T091 [US4] Replace `src/app/(agent)/agent/(protected)/page.tsx` with today's count and cash, plus assigned orders (polls with `<UpdatedAt />`), keeping "No deliveries yet" as the empty state (FR-039). Create `src/app/(agent)/agent/(protected)/orders/[id]/page.tsx` (polls with `<UpdatedAt />`; "Picked up" only when Ready, otherwise "Kitchen is still preparing"; reassigned or cancelled screens with no actions; not found for never-assigned orders).
- [ ] T092 [US4] Add the US4 message keys (`agentHome.*`, `agentOrder.*`, `openInMaps.*`) to `en.json` and `kn.json`, and list the drafted Kannada in `machine-drafted.json`

**Checkpoint**: US4 works on its own. T084–T087 pass. With US1–US4 the demo milestone runs end to end. Commit with task ids.

---

## Phase 7: User Story 5 - Follow my order on status and map (Priority: P2)

**Goal**: The customer's order page updates on its own, shows a timed timeline and a static map,
names the agent with a call button, and allows cancelling before acceptance.

**Independent Test**: Open `placedOrder()`'s page as the demo customer, accept it from a partner
context, and see "Accepted" with its time appear within 15 s without reloading; the map shows a
kitchen marker and a delivery marker.

### Tests for User Story 5

- [ ] T093 [P] [US5] Write failing integration tests `src/features/orders/services/customer.int.test.ts`: `cancelOrderByCustomer` cancels only the customer's own Placed order (with no reason), writes messages to the customer and the kitchen, gives `order_moved_on` once accepted, and `not_found` for another customer's order.
- [ ] T094 [P] [US5] Extend `src/features/orders/services/place.int.test.ts` (or a new `customer-queries.int.test.ts`): `getCustomerOrder` returns events in time order for the timeline, the agent's name and phone once assigned, the kitchen location (or null) and the delivery location, and the reason and note for rejected or cancelled orders.
- [ ] T095 [P] [US5] Write the end-to-end test `e2e/ordering-us5-follow.spec.ts` (mobile), after `resetDemoData()` and `blockMapTiles`:
  - the demo customer opens `placedOrder()`'s page; a partner context accepts it; within 15 s, without a reload, the timeline shows "Accepted" with a time;
  - the map region has two markers found by their `aria-label`s (kitchen, delivery);
  - `rejectedOrder()`'s page shows the reason;
  - on a new Placed order, Cancel → confirm leads to "Cancelled", and an accepted order shows no cancel button.

### Implementation for User Story 5

- [ ] T096 [US5] Implement `cancelOrderByCustomer` in `src/features/orders/services/customer.ts` to pass T093, plus `cancelOrderByCustomerAction`, and extend `getCustomerOrder` to pass T094
- [ ] T097 [P] [US5] Create `src/shared/maps/order-map.tsx` (`'use client'`, via a `next/dynamic` wrapper with `ssr: false`):
  - kitchen and home inline-SVG `divIcon`s with translated `aria-label`s, framed with `fitBounds`;
  - dragging, zoom and keyboard turned off;
  - only the delivery marker plus a "Kitchen location not set" line when the kitchen has none;
  - the landmark text stays visible if the tiles fail.
- [ ] T098 [P] [US5] Create `src/features/orders/components/order-timeline.tsx`:
  - the steps Placed, Accepted, Preparing, Ready, Agent assigned, Picked up and Delivered, each with its time when done;
  - Rejected or Cancelled shown with the reason as a final step;
  - for UPI orders that end rejected or cancelled, the note "Nothing was charged in this demo" (FR-023).
- [ ] T099 [US5] Extend `src/app/(customer)/orders/[id]/page.tsx`: the timeline, the order map, the agent's name and call button once assigned, "Cancel order" with a confirmation while Placed, `<LiveRefresh enabled={!finished} />`, and `<UpdatedAt />`
- [ ] T100 [US5] Add the US5 message keys (`timeline.*`, `orderMap.*`, `customerCancel.*`) to `en.json` and `kn.json`, and list the drafted Kannada in `machine-drafted.json`

**Checkpoint**: US5 works on its own. T093–T095 pass. Commit with task ids.

---

## Phase 8: User Story 6 - Message log instead of SMS and WhatsApp (Priority: P3)

**Goal**: Customers, partners and agents each read their status updates in an in-app list, in
their language, labelled as demo messages that were not sent.

**Independent Test**: After `npm run demo:reset`, open Messages as the demo customer, the partner
of `placedOrder().kitchen`, and `readyOrder().agent`; each sees entries for the seeded orders,
newest first, with the demo label; switching to Kannada changes the entry text.

### Tests for User Story 6

- [ ] T101 [P] [US6] Write failing integration tests `src/features/notifications/queries.int.test.ts`: `listMessages` returns only the recipient's rows (the customer's own; the kitchen's for any of its sign-ins; the agent's own), newest first, at most 100, joining kitchen and agent names.
- [ ] T102 [P] [US6] Write the end-to-end test `e2e/ordering-us6-messages.spec.ts` (mobile), after `resetDemoData()`:
  - the demo customer's Messages contains an entry with `deliveredOrder()`'s number and the "Demo: not sent by SMS or WhatsApp" label;
  - the partner of `placedOrder().kitchen` sees its new-order entry;
  - `readyOrder().agent` sees an assigned entry;
  - after switching to Kannada, the customer's entries are in Kannada.

### Implementation for User Story 6

- [ ] T103 [US6] Implement `listMessages(recipient)` in `src/features/notifications/queries.ts` (`server-only`) to pass T101
- [ ] T104 [P] [US6] Create `src/features/notifications/components/message-list.tsx`: each entry renders `notifications.<kind>` with its params (amount through `formatPrice`, reason through `orderReason.*`, the note as entered, kitchen name through `pickLocalized`), the time through `formatTime`, a link to the order on the viewer's surface, the demo label, and an empty state
- [ ] T105 [US6] Create `src/app/(customer)/messages/page.tsx`, `src/app/(partner)/partner/(protected)/messages/page.tsx` and `src/app/(agent)/agent/(protected)/messages/page.tsx`, and add "Messages" to each surface's navigation
- [ ] T106 [US6] Add the US6 message keys (`messageLog.*` page copy) to `en.json` and `kn.json`, and list the drafted Kannada in `machine-drafted.json`

**Checkpoint**: US6 works on its own. T101–T102 pass. Commit with task ids.

---

## Phase 9: User Story 7 - Demo reset includes orders (Priority: P3)

**Goal**: The one-step reset restores the same orders, addresses, locations and messages every
time, with the Placed order fresh.

**Independent Test**: Accept `placedOrder()`, run the reset, and see it Placed again with nearly
the full acceptance window left; the same order numbers appear on the board.

### Tests for User Story 7

- [ ] T107 [P] [US7] Extend `src/features/demo/reset.int.test.ts`: two consecutive `resetDemo` runs give identical order ids, numbers, statuses, event counts and message counts; the Placed order's `placed_at` is within 5 s of the reset time.
- [ ] T108 [P] [US7] Write the end-to-end test `e2e/ordering-us7-reset.spec.ts` (mobile):
  - as the partner, accept `placedOrder()`;
  - call `resetDemoData()`;
  - the order is Placed again, with a time left greater than `ACCEPT_WINDOW_MINUTES − 2` minutes;
  - the agent and admin demo panels still list their accounts.

### Implementation for User Story 7

- [ ] T109 [US7] Fix whatever T107 and T108 expose in `src/features/demo/load-catalogue.ts` and `src/features/demo/reset-demo.ts`, and add a short "Demo orders" section to the demo notes in `README.md` listing the seven seeded orders and what each is for

**Checkpoint**: US7 passes. Commit with task ids.

---

## Phase 10: User Story 8 - Order history and reorder (Priority: P4, optional)

**Goal**: Past orders under "Orders" and a one-tap reorder at current prices.

**Independent Test**: As the demo customer, open "Orders", see `deliveredOrder()` under past
orders, tap Reorder, and land on `/cart` with its available dishes at current prices.

### Tests for User Story 8

- [ ] T110 [P] [US8] Write failing integration tests in `src/features/orders/services/customer.int.test.ts` for `reorder`: it fills the cart with still-available dishes at current prices, reports `leftOut` names, returns `other_kitchen` unless `replace`, and `not_found` for another customer's order. Also check that `listCustomerOrders` returns past orders after ongoing ones.
- [ ] T111 [P] [US8] Write the end-to-end test `e2e/ordering-us8-reorder.spec.ts` (mobile): the demo customer reorders `deliveredOrder()` and `/cart` shows its available dishes.

### Implementation for User Story 8

- [ ] T112 [US8] Implement `reorder` in `src/features/orders/services/customer.ts` plus `reorderAction` (it writes the cart cookie and redirects to `/cart` with a left-out notice) to pass T110. Add the past-orders section and a "Reorder" button to `src/app/(customer)/orders/page.tsx`, and add `reorder.*` keys to `en.json`, `kn.json` and `machine-drafted.json`.

**Checkpoint**: US8 passes. Commit with task ids.

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: The cross-role run, validation sweeps, documentation and the full gate.

- [ ] T113 Write the cross-role end-to-end test `e2e/ordering-milestone.spec.ts` (mobile project; four browser contexts: customer, partner and agent at 360 px, admin at 1280 px), after `resetDemoData()`, `openAllDay(orderableKitchen().id)` and `blockMapTiles`:
  - the customer places a COD order;
  - the partner sees the banner and accepts;
  - the admin assigns the first active agent;
  - the partner marks Preparing and Ready;
  - the agent picks up and delivers, confirming cash;
  - the customer's open order page reaches "Delivered" without a reload.
  Assert every cross-role change appears within 15 s, that the same grand total is shown on the customer order page, the partner order, the admin order view and the agent order (SC-005), and that the whole run stays under 5 minutes (SC-002, SC-003).
- [ ] T114 [P] Extend `src/features/input-validation.int.test.ts` with malformed ids and out-of-range values for every new service (cart, addresses, place, partner, admin, agent, reorder), each returning `invalid`, and add malformed query cases for the geo and voice-note route handlers
- [ ] T115 [P] Update `README.md`:
  - add Leaflet (maps) to the "one sanctioned tool per concern" table;
  - list the new environment variables, pointing to `.env.example`;
  - list the three new adapters and which are stand-ins;
  - note the Nominatim usage policy limits;
  - document `scripts/make-alert-sound.ts`.
- [ ] T116 [P] Check that the 002 rows in `docs/fidelity-matrix.md` match what was delivered (cart, payment stand-in, lifecycle, assignment, messages stand-in, tracker map, new-order alert, geocoding, voice note, delivery estimate), and that every stand-in file (`payment`, `notifications`, `geocoding/stand-in.ts`) has its `STAND-IN` header
- [ ] T117 Run a parity sweep over the new code:
  - `grep` `src/` for hard-coded user-facing text in `aria-label`, `alt`, `placeholder` and `title` (including map marker labels and the recorder);
  - confirm statuses, reasons and message entries change language with the switch;
  - confirm `machine-drafted.json` lists every agent-drafted Kannada key.
- [ ] T118 Run a 360 px review of every new customer, partner and agent screen in Playwright device mode: no horizontal scroll (`document.documentElement.scrollWidth <= 360`), touch targets ≥ 48 px, one primary action per screen. Check the four-tap path from home to a placed COD order (SC-001). Time adding a new address by hand (pin, house details, landmark, label) at 360 px and record the result against the 90 s target (SC-010). Fix what fails in the relevant component files.
- [ ] T119 Clean up: remove dead code, commented-out code and debug logging. Confirm every `catch` in the new `actions` files logs through `src/shared/log.ts` with the action name, surface and subject id, and that no client component imports a `server-only` module.
- [ ] T120 Run the full gate (`npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run test:e2e`) and walk through the quickstart demo walkthrough (steps 0–14) and further scenarios 1–12 in `specs/002-ordering/quickstart.md`. Record the results, and any scenario not run with the reason.

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (Phase 1)**: no dependencies. T002 before anything that reads settings.
- **Foundational (Phase 2)**: depends on Setup and blocks every story.
  - Schema: T006–T009 in parallel → T010 → T011, T012.
  - Domain: each test precedes its implementation (T013→T014, T015→T016, T017→T018, T019→T020, T021→T022).
  - Adapters: T023, T024 (T024 needs T008, T010).
  - Write path: T025 (needs T011, T014, T018, T022, T024) → T026 → T027.
  - Polling: T028 → T029 → T030.
  - Copy: T031, then T032.
  - Seed: T033 (test first) → T034 → T035 → T036 (needs T027) → T037.
- **US1 (Phase 3)**: needs Foundational only.
- **US2 (Phase 4)**: needs Foundational only. Its e2e places a second order, so it needs US1's cart and checkout for that step.
- **US3 (Phase 5)**: needs Foundational; T081 reuses the pin picker from US1 (T052).
- **US4 (Phase 6)**: needs Foundational; T090 reuses the voice-note route (T050) and player (T055) from US1.
- **US5 (Phase 7)**: needs US1 (order page) and, for its e2e, US2's partner actions.
- **US6 (Phase 8)**: needs Foundational (messages are written by `applyTransition`).
- **US7 (Phase 9)**: needs Foundational; its e2e uses US2's partner screen.
- **US8 (Phase 10, optional)**: needs US1.
- **Polish (Phase 11)**: needs US1–US7 (US8 if built).

### Story completion order

```text
Setup → Foundational ─┬─ US1 (P1) ─┬─ US5 (P2) ── US8 (P4, optional)
                      │            └─ (pin picker, voice route) ─┐
                      ├─ US2 (P1) ──────────────────────────────┤
                      ├─ US3 (P1) ◀─────────────────────────────┤
                      ├─ US4 (P1) ◀─────────────────────────────┘
                      ├─ US6 (P3)
                      └─ US7 (P3)
                                         → Polish (milestone e2e, gate)
```

Recommended sequence for one implementer: US1 → US2 → US3 → US4 (the demo milestone) → US5 →
US6 → US7 → US8 → Polish.

### Within each story

- Tests are written first and must fail. Then schemas and services, then queries, then
  components, then pages, then message keys.
- Message-key tasks (T031, T060, T070, T083, T092, T100, T106, T112) all edit the same JSON files,
  so they never run in parallel with each other.
- Read-model files are split per surface (`queries.ts`, `partner-queries.ts`, `admin-queries.ts`,
  `agent-queries.ts`), so stories touching different surfaces do not collide.

### Parallel opportunities

- **Setup**: T003–T005 in parallel after T002.
- **Foundational**: schema files T006–T009; domain test tasks T013, T015, T017, T019, T021; adapters T023, T024; polling T028 alongside the domain tests.
- **After Foundational**: US2, US3, US4, US6 and US7 services and queries can be built alongside US1. Their end-to-end tests that need US1 pieces run once those land.
- **Within stories**: test tasks are marked [P], and so are component tasks in different files.

---

## Parallel Examples

### Foundational

```text
Task: "T013 Lifecycle unit tests in src/features/orders/domain/lifecycle.test.ts"
Task: "T015 Bill unit tests in src/features/orders/domain/bill.test.ts"
Task: "T017 ETA and expiry unit tests in src/features/orders/domain/"
Task: "T019 Dispatch group and today unit tests"
Task: "T021 messagesFor unit tests in src/features/notifications/domain/messages-for.test.ts"
Task: "T028 Poller unit tests in src/shared/polling/poller.test.ts"
```

### User Story 1

```text
Task: "T038 Cart domain unit tests"
Task: "T040 Audio store integration tests"
Task: "T041 Address services integration tests"
Task: "T042 Nominatim adapter unit tests"
Task: "T044 Place-order integration tests"
# after the services:
Task: "T047 Cart controls components"
Task: "T052 Pin picker"
Task: "T053 Voice recorder"
Task: "T057 Cart components"
```

### User Story 2

```text
Task: "T061 Partner services integration tests"
Task: "T062 Partner queries + feed route integration tests"
Task: "T063 Partner E2E"
# after T064–T065:
Task: "T066 Partner order components"
```

### User Story 3

```text
Task: "T071 Admin order services integration tests"
Task: "T072 Agent deactivation guard test"
Task: "T073 Board queries integration tests"
Task: "T074 Kitchen location/prep tests"
Task: "T075 Dispatch E2E (desktop)"
```

### User Story 4

```text
Task: "T084 Agent services integration tests"
Task: "T085 Agent queries integration tests"
Task: "T086 open-in-maps unit tests"
Task: "T087 Agent E2E"
```

### User Story 5

```text
Task: "T093 Customer cancel integration tests"
Task: "T097 Order map"
Task: "T098 Order timeline"
```

### User Stories 6–8

```text
Task: "T101 Messages query integration tests"
Task: "T107 Reset determinism integration test"
Task: "T110 Reorder integration tests"
```

---

## Implementation Strategy

### MVP first (User Story 1)

1. Complete Phase 1 (Setup) and Phase 2 (Foundational). After this, `npm run demo:reset` loads
   orders, addresses and locations.
2. Complete Phase 3 (US1): a customer places an order.
3. **Stop and validate**: T038–T045 pass, plus quickstart demo steps 2–4.

### Incremental delivery (the demo milestone first)

1. US2: the partner accepts and prepares, with the alert.
2. US3: the admin dispatches.
3. US4: the agent delivers. **The demo milestone now runs.** Validate quickstart steps 0–12.
4. US5: the customer watches the timeline and map.
5. US6: message logs.
6. US7: reset determinism.
7. US8 (optional): history and reorder.
8. Polish: the milestone e2e, sweeps, and the full gate in T120.

After each story, run its tests and the existing suites (including 001's), then commit small
changes that reference task ids.

---

## Notes

- [P] tasks touch different files and depend on no incomplete task.
- Constraints quoted in tasks come from data-model.md and contracts/. Do not loosen them during
  implementation without recording a deviation in plan.md.
- Seed locations and preparation minutes are copied from the supplied research file (T035). The
  app and the reset never geocode.
- US8 is optional (FR-052). If it is skipped, mark T110–T112 as not done with the reason, and do
  not count them against the gate.
