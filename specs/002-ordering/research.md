# Research: Ordering (002)

Phase 0 output for [plan.md](./plan.md). Each entry records a decision, why it was chosen, and what
was rejected. Everything from [001 research](../001-platform-core/research.md) still applies (stack,
sessions, i18n, formatting, images, server actions, testing layers); this file covers only what
ordering adds. Versions checked on 2026-10-15.

## R1. Cart storage

- **Decision**: The cart lives in one **plain, Zod-validated cookie** `hfd_cart`, not signed and not
  in localStorage.
  - Content: `{ v: 1, kitchenId, lines: [{ dishId, qty }] }` as compact JSON. No prices, names or
    totals are stored; the server prices every render from the database.
  - Limits: up to 30 distinct dishes, quantity 1–20 each (spec edge case). The worst case is about
    1.4 KB, well inside the 4 KB cookie limit.
  - Lifetime 30 days, `SameSite=Lax`, `HttpOnly`. It is a device cookie, not tied to a session, so
    it survives sign-in (FR-005, US1 scenario 5).
  - Parsing fails closed: a cookie that does not match the schema is treated as an empty cart and
    overwritten on the next change.
  - Changes go through small server actions behind plain `<form>`s (add, set quantity, remove,
    replace, clear), so the kitchen page and cart work without client JavaScript and render the
    right state on first paint (Principle IV).
- **Why not signed**: the user asked to prefer a signed cookie. Signing would add a secret and a
  verification step but protect nothing: the cookie holds only dish ids and quantities, which the
  customer may legitimately choose anyway, and every value is re-checked against the database at
  render and again at placing (FR-012). Zod validation is the boundary check Principle V asks for.
  If later cart contents carry anything the customer must not edit, signing becomes worthwhile.
- **Alternatives**: localStorage (needs client JS to render the cart badge and totals, so the
  server cannot render them, and it does not reach server actions); a `carts` table (needs a guest
  identity before sign-in and cleanup of abandoned carts, for no user benefit; the spec says the
  cart is per device).

## R2. Cart, checkout and the four-tap path

- **Decision**: One `/cart` page is both cart and checkout.
  - For a guest it shows the lines, the bill and "Sign in to check out", which goes to
    `/login?next=/cart`.
  - For a signed-in customer it also shows the address picker and payment choice, both preselected
    from the last order (FR-009, FR-010), and the "Place order" button.
  - The kitchen page shows a sticky cart bar linking to `/cart`. Taps from home: open kitchen (1),
    Add (2), cart bar (3), Place order (4). UPI adds the confirmation tap (SC-001).
  - The add-to-cart action returns `other_kitchen` when the cart holds another kitchen. The kitchen
    page then shows a replace prompt; confirming submits the same form with `replace=true`. Without
    JavaScript the prompt renders server-side from a search param.
- **Idempotent placing (FR-013)**: the cart page renders a fresh `placeKey` (UUID) in a hidden
  field. `orders` has a unique index on (`customer_id`, `place_key`). A repeat with the same key
  returns the existing order instead of creating a second one.
- **Alternatives**: separate cart and checkout pages (five taps); a client-side checkout wizard
  (more JavaScript, no benefit).

## R3. Cross-role updates by polling (FR-022)

- **Decision**: One client hook, `usePolling(callback, { intervalMs })`, in `src/shared/polling/`.
  - It runs the callback every **10 seconds** while the page is visible, pauses when the tab is
    hidden (`visibilitychange`), runs once immediately when the tab becomes visible again, and
    never overlaps runs. 10 s keeps every change within the 15 s target (SC-003) with margin for a
    slow request.
  - **List and detail pages** (customer order page, partner orders, dispatch board, agent list and
    agent order) mount `<LiveRefresh />`, which calls `router.refresh()` from the hook. That
    re-renders the Server Components of the current route and merges the result into the page
    without a full reload: scroll position, open dialogs and typed input survive. The customer
    order page stops polling once the order is finished.
  - **The partner alert** must work on every partner screen (FR-029), including the menu and hours
    editors, where refreshing the whole page every 10 s would waste data. The partner layout mounts
    `<NewOrderAlert />`, which uses the same hook to fetch a small JSON route,
    `GET /partner/orders/new`, returning the ids and numbers of the kitchen's Placed orders.
  - Each polled page shows "Updated <time>" from the server render time. If a refresh fails (slow
    or no network), the last render stays on screen with its stale time, and the next tick retries
    (spec edge case).
- **Alternatives**: Server-Sent Events or WebSockets (the constitution prefers polling unless a
  spec justifies otherwise, and long-lived connections are fragile on 2G and some free hosts);
  polling JSON endpoints for every screen (duplicates each page's read model as an API and its
  rendering on the client).

## R4. Order state machine and races

- **Decision**: A pure, test-first module `src/features/orders/domain/lifecycle.ts`:
  - `canTransition(order, action, actor)` returns the next state or an error code, implementing
    FR-016 and FR-017 exactly, including assignment (Accepted, Preparing or Ready, until pickup) and
    pickup (Ready and assigned to this agent).
  - `dispatchGroup(order)` maps an order to its board column (FR-033).
- **Races (FR-021)**: every write is a compare-and-set in one transaction:
  `UPDATE orders SET … WHERE id = $1 AND status = $expected [AND agent_id = $agent]` with
  `RETURNING`. Zero rows means someone else acted first; the service re-reads the order and
  returns `order_moved_on { status }`, which the UI shows with the current status. The event row
  and messages are written in the same transaction as the update, so history never disagrees with
  the status.
- **Alternatives**: row locks with `SELECT … FOR UPDATE` (works, but compare-and-set needs no lock
  handling and gives the same first-wins result); a version column (status already serves as the
  version for every allowed transition).

## R5. Automatic rejection without a background job (FR-020)

- **Decision**: Lazy expiry. `expireOverdueOrders(executor, now, scope)` runs at the start of every
  read or write that touches orders: the customer's order page and list, the partner order list,
  day view and new-order feed, the dispatch board and admin order view, the agent list, and every
  order service.
  - In one statement it updates `status = 'rejected', reason = 'kitchen_no_response'` for Placed
    orders whose `placed_at + ACCEPT_WINDOW_MINUTES` is before `now`, scoped to the orders the
    caller is about to read (one order, one kitchen, one customer or everything for the board).
  - For each row returned it inserts the `rejected` event with actor `system` and time `now`, and
    the customer's rejection message, in the same transaction (spec: recorded at that moment).
  - The `WHERE status = 'placed'` condition makes concurrent expiry and acceptance safe: exactly
    one of them updates the row (R4).
- **Effect**: an order is never shown as Placed after its window, and a partner's late accept is
  refused with `order_moved_on`. No process needs to run when nobody is looking.
- **Seed**: the seeded Placed order is stamped with the reset time, so it is fresh after every
  reset (spec clarification Q2).
- **Alternatives**: a cron job or queue (ruled out by the user and the constitution's "no queues"
  rule); computing an "expired" view without writing (then the history, messages and the
  partner's refusal would disagree with what the customer saw).

## R6. Order numbers

- **Decision**: A PostgreSQL sequence `order_number_seq` starting at **1001**, stored in
  `orders.order_no` (integer, unique) and shown as `#1042`.
  - Uniqueness is guaranteed by the sequence plus a unique index. Gaps (from rolled-back inserts)
    are harmless.
  - Four digits for the first 9,000 orders; at the PRD's 100 orders a day, five digits within a
    year. It is easy to read out over the phone, and the date is always shown next to it.
  - The demo reset recreates the sequence, so seeded orders get the same numbers on every run
    (SC-009).
- **Alternatives**: a date prefix plus a daily counter (for example `1015-07`). To stay unique
  across years it needs the year too (`261015-07`), which is longer to read out, and a daily
  counter needs a counters table or a lock. Random short codes need collision retries and are
  harder to say aloud.

## R7. Geocoding adapter: map search and the address under the pin

- **Decision**: `src/shared/adapters/geocoding/` with one interface and two implementations:

  ```ts
  interface Geocoder {
    search(query: string, opts: { locale: Locale }): Promise<Result<Place[], 'unavailable' | 'busy'>>;
    reverse(point: LatLng, opts: { locale: Locale }): Promise<Result<string | null, 'unavailable' | 'busy'>>;
  }
  ```

  - `nominatim.ts` (real) calls the public OpenStreetMap Nominatim service **from the server
    only**, through two route handlers (`/api/geo/search`, `/api/geo/reverse`) that require a
    customer or admin session. The browser never calls Nominatim directly.
  - `stand-in.ts` (STAND-IN) answers from a small fixed list of Honnavar places (bus stand,
    Sharavathi bridge, Kasarkod, market road and so on). `search` matches by substring; `reverse`
    returns "Near <closest place>". It is deterministic and used by integration and e2e tests.
  - `GEOCODING_PROVIDER=nominatim|stand-in` selects the implementation (default `nominatim`).
    Unlike 001's adapters, two implementations exist from the start, so a setting is justified.
- **Nominatim usage policy** (operations.osmfoundation.org/policies/nominatim), all enforced in
  `nominatim.ts`:
  - An identifying `User-Agent`: `honnavar-food-delivery-poc/<version> (+<GEOCODING_CONTACT>)`.
  - **At most one request per second** for the whole server: requests pass through an in-process
    queue that spaces them at least 1 s apart. If more than 5 are waiting, the adapter returns
    `busy` immediately instead of queuing further.
  - **Caching**: an in-memory LRU of 500 entries for reverse lookups (key: coordinates rounded to 4
    decimal places, about 11 m, plus locale) and for searches (normalised query plus locale).
  - **No search-as-you-type.** The user's prompt said "debounced search", but the policy
    explicitly forbids client-side autocomplete against the public service. Search therefore runs
    when the customer submits the search box (minimum 3 characters), and the submit button is
    disabled while a search is in flight. This is the policy-compliant form of debouncing.
  - **Reverse lookup on settle**: the picker asks for the address only after the pin has stopped
    moving for 1 s (debounced) and only if it moved more than about 11 m (same rounding as the
    cache).
  - `accept-language` follows the interface language, so place names come in Kannada where
    OpenStreetMap has them. `countrycodes=in`, and a `viewbox` around Honnavar biases results to
    the town. Requests time out after 4 s and return `unavailable`.
- **Failure behaviour (FR-056)**: on `unavailable` or `busy` the picker shows "Address could not be
  looked up" under the pin, and search shows a retry message. The customer can still move the pin
  by hand and continue; the saved address keeps `geocoded_text = null`.
- **Scaling note**: the 1 request per second limit is per server process. Running several
  instances, or more traffic than the policy allows, means moving to a self-hosted Nominatim or a
  paid provider, which is a change to this adapter only.
- **Alternatives**: calling Nominatim from the browser (cannot set `User-Agent`, cannot enforce a
  global rate limit, and exposes every user's lookups to the provider); Photon or other hosted
  geocoders (same public-service limits, less complete for India); paid geocoders (the constitution
  rules out paid keys).

## R8. Maps

- **Decision**: **Leaflet 1.9.4** (the current stable release; 2.0 is still alpha), used directly
  from two small client components, loaded with `next/dynamic` and `ssr: false` only on the screens
  that need a map:
  - `OrderMap` (customer order page, FR-026): two markers, kitchen and delivery location, framed
    with `fitBounds`. Dragging, zoom and keyboard are turned off, so the map is static. If the
    kitchen has no location (spec edge case) only the delivery marker is shown, with a line of text
    saying so.
  - `PinPicker` (add-address map screen, FR-053, and the admin kitchen form, FR-037): a centre pin,
    a search box, and "Use current location" (`navigator.geolocation.getCurrentPosition`, once, on
    tap or on open when permission is already granted). It starts at the device location when
    allowed, otherwise at Honnavar town centre (14.2798, 74.4439).
  - Markers are `L.divIcon`s with inline SVG (a kitchen icon and a home icon) and translated
    `aria-label`s, so no image assets are needed and the bundler issue with Leaflet's default
    marker images does not arise.
  - Tiles come from a URL template and attribution set by environment variables, defaulting to
    the standard OpenStreetMap tiles with "© OpenStreetMap contributors". Tile loading is lazy and
    never blocks the page. If tiles fail, the markers and the landmark text still show.
  - Leaflet's CSS is imported only inside these components.
- **"Open in maps" (FR-041)**: a plain link to
  `https://www.google.com/maps/dir/?api=1&destination=<lat>,<lng>`, which opens the Google Maps app
  on Android (the PRD's "open in Google Maps") and the browser elsewhere. No key or SDK is
  involved. Without a location the link uses `query=<address, landmark, Honnavar>` instead.
  - `geo:` URIs were rejected: iOS and desktop browsers ignore them, and they have no directions
    mode.
- **Not an adapter**: map tiles and the "open in maps" link are a URL template and a link, like
  `tel:`. No provider code is called, so swapping tile servers is a configuration change.
- **Alternatives**: react-leaflet (a second dependency for two small components); MapLibre GL
  (WebGL, heavier on low-end phones); static map images from a provider (needs a key or
  self-hosting).

## R9. Landmark voice note (FR-055)

- **Decision**:
  - **Recording**: a client component using the browser's `MediaRecorder`. It prefers
    `audio/webm;codecs=opus` (Chrome on Android) and falls back to `audio/mp4` (Safari). It stops
    automatically at 30 seconds, offers play back, re-record and delete, and puts the recorded blob
    into the address form's file field, so it is submitted with the address (the 6 MB server action
    limit from 001 already covers it).
  - **Validation (Principle V)**: the server accepts at most **600 KB** (30 s of Opus is about
    120 KB, and AAC about 240 KB). It accepts only `audio/webm`, `audio/ogg` or `audio/mp4`, and
    checks the magic bytes (EBML `1A45DFA3`, `OggS`, or `ftyp` at offset 4). The bytes are stored
    as recorded, with no transcoding and no transcription (declared stand-in).
  - **Storage**: an `audio_clips` table (`bytea`, sha256, mime type, size), like images (001 R7).
  - **Serving**: `GET /voice-notes/[id]` streams the clip with its mime type and
    `Cache-Control: private, max-age=3600`. Unlike photos, voice notes are personal, so the handler
    allows only the customer who owns an address using the clip, an agent assigned to an
    undelivered order whose snapshot uses it, or any admin. Everyone else gets 404.
  - **Lifetime**: a clip is deleted when no address and no order references it (the same "delete
    if unused" pattern as images).
  - If the microphone is refused or `MediaRecorder` is missing, the control says voice notes are
    unavailable on this phone, and the rest of the form works (spec edge case).
- **Tests**: integration tests use a small committed fixture clip (`src/shared/audio/test-audio.ts`,
  a few hundred bytes of valid WebM). End-to-end tests run Chromium with
  `--use-fake-ui-for-media-stream --use-fake-device-for-media-stream`, so the real recorder records
  the fake device. No stand-in recorder code ships in the app.
- **Alternatives**: transcoding to one format on the server (needs ffmpeg, an unneeded system
  dependency); storing on disk (lost on redeploy, as in 001 R7).

## R10. Partner new-order alert (FR-029)

- **Decision**:
  - A short alert tone is **bundled** as `public/sounds/new-order.wav` (about 20 KB, generated once
    by a committed script `scripts/make-alert-sound.ts` as a two-tone beep, so there are no licence
    questions). It is played with an `HTMLAudioElement`.
  - **Unlock**: browsers block sound until the user interacts with the page. `<NewOrderAlert />`
    shows a prominent "Tap to turn on order sounds" button until a tap has played the sound once
    (muted at volume 0) and the unlock succeeded. It remembers this in `sessionStorage` (wrapped in
    try/catch) for the tab.
  - **Repeat until acknowledged**: when the feed (R3) contains a Placed order the tab has not
    acknowledged, the tone plays every 5 seconds and a highlighted banner names the order. Opening
    the order, accepting or rejecting it acknowledges it (stored in `sessionStorage`); an accepted,
    rejected or expired order also drops out of the feed.
  - The banner and highlight show whether or not sound is on, so the alert never relies on sound
    alone (Principle IV).
- **Alternatives**: the Web Audio oscillator (no file, but the user asked for a bundled sound, and
  a file is easier to replace with a louder recording later); Notifications or push (out of scope).

## R11. Integration adapters added (Principle III)

| Adapter | Interface | Implementation in this feature |
|---|---|---|
| `payment` | `PaymentProvider.confirmUpi({ orderRef, amountRupees })` returns `{ status: 'succeeded', reference }` | **STAND-IN**: always succeeds with reference `DEMO-UPI-<orderNo>`; nothing is charged. Cash on delivery does not call the adapter. |
| `notifications` | `Notifier.notify(executor, notification)` for SMS or WhatsApp updates | **STAND-IN**: writes the in-app message row (R14) inside the caller's transaction and sends nothing. A real sender later would add delivery after commit. |
| `geocoding` | `Geocoder.search` and `reverse` (R7) | **Real** (Nominatim), plus a STAND-IN for tests. |

Each `index.ts` exports the implementation in use; only geocoding has a selection setting. Every
stand-in carries a `STAND-IN` header comment and appears in `docs/fidelity-matrix.md`. Full
signatures are in [contracts/adapters.md](./contracts/adapters.md).

## R12. Settings

- **Decision**: New environment variables, Zod-validated in `src/shared/env.ts` (fail closed),
  documented in `.env.example`:

  | Variable | Type and range | Default |
  |---|---|---|
  | `DELIVERY_FEE_RUPEES` | integer 0–500 | 30 |
  | `DELIVERY_MINUTES` | integer 1–180 | 15 |
  | `ACCEPT_WINDOW_MINUTES` | integer 1–120 | 10 |
  | `GEOCODING_PROVIDER` | `nominatim` or `stand-in` | `nominatim` |
  | `NOMINATIM_BASE_URL` | URL | `https://nominatim.openstreetmap.org` |
  | `GEOCODING_CONTACT` | URL or email, sent in the User-Agent | the project repository URL |
  | `MAP_TILE_URL` | URL template with `{z}/{x}/{y}` | `https://tile.openstreetmap.org/{z}/{x}/{y}.png` |
  | `MAP_TILE_ATTRIBUTION` | text | `© OpenStreetMap contributors` |

  - Every default works from a clean clone (Principle VI). The map settings reach the client as
    props from Server Components, not through `NEXT_PUBLIC_` variables, so they stay in one
    validated place.
  - **Preparation minutes** are per kitchen, so they live in the database: `kitchens.prep_minutes`
    (5–120, default 25), edited on the admin kitchen form (FR-037, FR-057).
  - The delivery fee and the expected time are copied onto each order when it is placed, so a
    later settings change never alters existing orders (FR-014).
- **Alternatives**: an admin settings screen (the spec asks for deployment settings); a settings
  table (more code for values that change per deployment, not at runtime).

## R13. Expected delivery time (FR-057 to FR-059)

- **Decision**: Pure functions in `src/features/orders/domain/eta.ts`:
  - `expectedAt(placedAt, prepMinutes, deliveryMinutes) = placedAt + prep + delivery`, stored on
    the order at placing and never recalculated.
  - `etaRange(prepMinutes, deliveryMinutes) = { from: prep + delivery, to: prep + delivery + 10 }`,
    shown on the kitchen page as "40–50 min" in the selected language.
  - Unit-tested first, together with the bill and lifecycle functions.

## R14. Message log (SMS and WhatsApp stand-in)

- **Decision**:
  - One `messages` table. Each row has one recipient (customer, kitchen or agent), the order, a
    `kind` and a small `params` JSON with stable scalar values (order number, amount, reason code,
    reason note, agent id). Kitchen and agent names are joined at display time.
  - Rows are written by `Notifier.notify` (R11) in the same transaction as the order change. The
    recipients for each change come from one pure function, `messagesFor(event, order)`, which
    implements FR-046 and is unit-tested.
  - **Language**: nothing translated is stored. At display time the row's `kind` selects a
    translation key (`notifications.<kind>`) and `params` fill the ICU placeholders, so each viewer
    reads the message in their current language (FR-047), with the "Demo: not sent by SMS or
    WhatsApp" label as an interface string.
  - Kitchen messages belong to the kitchen, so every number on its sign-in list sees the same list.
- **Alternatives**: storing rendered text (would freeze one language); one table per role (three
  copies of the same shape).

## R15. Demo seed and coverage

- **Decision**: Extend the 001 catalogue pattern (001 R15): **content** stays in
  `seed/catalogue.json`, **logic** in `src/features/demo/`.
  - **Kitchens** gain `location: { lat, lng }` (required) and `prepMinutes` (optional, default 25).
    Locations for the researched kitchens are looked up once, while authoring the catalogue, from
    their address and landmark, and are recorded as approximate in the catalogue `notes`. The reset
    never calls the geocoder, so it stays offline and deterministic.
  - **Customers** gain `addresses: [{ key, label, house, street?, landmark, riderNote?, location }]`.
  - A new top-level **`orders`** list has `{ key, customer, address, kitchen, items: [{ dish,
    quantity }], payment, status, agent?, reason?, reasonNote?, cancelledBy?,
    placedMinutesBeforeReset }`. The schema checks that dishes belong to the kitchen, that agents
    exist and are active, and that each status has what it needs (an agent from Picked up onwards
    and for the seeded Ready order, a reason for Rejected and Cancelled).
  - **Timeline**: the loader walks the normal path from Placed to the order's status, one event
    every 4 minutes from `reset time − placedMinutesBeforeReset`, using the same domain functions
    as live orders (`canTransition`, `messagesFor`, `expectedAt`). Events and messages therefore
    match what a live run would produce. The Placed order uses `placedMinutesBeforeReset: 0`.
  - Ids are deterministic (`demoIds.order(key)` and so on), and the reset recreates
    `order_number_seq`, so order numbers repeat on every run.
- **Coverage test**: `catalogue.int.test.ts` gains a 002 block asserting FR-050 and FR-051: every
  kitchen has a location; the demo customer has two addresses; there is at least one order in each
  required state (Placed, needs agent, Ready and assigned, Picked up, Delivered cash, Rejected,
  Cancelled), all placed within the current IST day relative to the load time; and the Ready order
  is assigned to an active agent. A replacement catalogue that drops a scenario fails the test, not
  the demo.
- **E2E subjects**: `e2e/catalogue.ts` gains selectors (`placedOrder()`, `needsAgentOrder()`,
  `readyOrder()`, `demoCustomer()`, `orderableKitchen()`), still by flags and keys, never by name.
- **Open kitchens in tests**: placing an order needs an open kitchen, and e2e may run at any hour.
  The ordering spec files call an e2e-only fixture, `openAllDay(kitchenId)` in `e2e/fixtures.ts`,
  after the reset. It writes 00:00–24:00 hours for the kitchen used by the test directly in the test
  database. No app code changes and no clock override are needed.
- **Edge**: a reset run between midnight and about 01:30 IST puts some seeded orders on the
  previous day. This is documented in the quickstart rather than worked around.

## R16. Testing approach for 002

- **Unit (test-first)**: `lifecycle.ts` (every allowed and refused transition, assignment and
  pickup rules), `bill.ts` (totals, quantity bounds), `cart.ts` (add, replace, set quantity, cookie
  parsing), `eta.ts`, `expiry.ts` (window boundaries), `messagesFor`, `dispatchGroup`, IST "today"
  bounds, audio magic-byte check, Nominatim request building and cache keys (no network).
- **Integration** (real Postgres): every order, cart, address and agent service, including races
  (two concurrent transitions, expiry against acceptance, reassignment against pickup), lazy
  expiry writing its event and message, idempotent placing, the voice-note route's authorisation,
  the geocoding route handlers with the stand-in, and the agent-deactivation guard.
- **End-to-end** (Playwright, 360 px): one happy path per user story. US1 to US5 run on the mobile
  project; the dispatch board (US3) runs on desktop. A cross-role test drives the whole milestone
  with four browser contexts (customer, partner, admin, agent). Tile requests are blocked with
  `page.route` so tests never depend on the tile server.

## Dependencies added (one line each, per Principle VIII)

| Dependency | Reason |
|---|---|
| leaflet | The constitution's map library, for the static order map and the address pin picker (R8) |
| @types/leaflet (dev) | Types for Leaflet under TypeScript strict |

Nothing else: polling, audio, the LRU cache, the request queue and the sound file need no
dependency.
