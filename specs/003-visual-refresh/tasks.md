---

description: "Task list for 003-visual-refresh"
---

# Tasks: Visual Refresh

**Input**: Design documents from `specs/003-visual-refresh/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md, and the
visual reference `design/a-coast/` (with the owner's edits in spec.md Clarifications)

**Tests**: Included. Constitution Principle VI and spec FR-002, FR-027 and FR-028 require:
- test-first unit tests for the new pure helpers (tab-bar state, suggestion shaping);
- an integration test for the suggestions route handler;
- automated layout checks on every gate;
- a repeatable screenshot capture for reviews;
- all existing 350 unit and integration tests and 31 end-to-end tests staying green.

Test tasks come before the implementation they cover and must fail first.

**Organization**: Tasks are grouped by user story (US1–US6 from spec.md) so each story can be
restyled, checked and committed on its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: The user story the task belongs to (US1–US6 from spec.md)

## Path Conventions

Same single Next.js project as 001 and 002 (`src/app/` routes per surface, `src/features/<domain>/`,
`src/shared/`, `e2e/`). Unit tests are `*.test.ts`, integration tests `*.int.test.ts`, next to the
code. New end-to-end files are named `e2e/visual-*.spec.ts`.

## Conventions for every task

All 001 and 002 conventions still apply (see `specs/002-ordering/tasks.md`, "Conventions for every
task"). What 003 adds:

- **Reference**: match `design/a-coast/` for each screen, with the owner's edits winning where the
  mockup differs (spec Clarifications; `design/a-coast/index.html` lists which edits are drawn).
  Tokens and component contracts are in [contracts/ui.md](./contracts/ui.md).
- **No behaviour change** (FR-001): no edits to services, actions, queries' results, schemas,
  validation, permissions or routes, except the new suggestions handler (T031–T033). A component
  is restyled in place: same props, data, form fields and action calls.
- **Colour rule** (owner edit 2): status and group colours only in `StatusChip` and group icons,
  always with the word. No coloured rails, column rules, accent bars or tinted columns.
- **Test hooks**: keep every `data-testid` and accessible name listed in
  [contracts/ui.md](./contracts/ui.md) and research R15 on the element that now carries that
  information. An existing e2e file may change only how it finds an element (FR-002); assertion
  changes are E1 and E2 (both approved). Any further locator edit is added to the
  table in research R15 and named in the commit message.
- **Copy**: new strings as keys in `en.json` and `kn.json`, never renamed. Agent-drafted Kannada is
  listed in `machine-drafted.json`. Unused keys are removed from both files together and named in
  the commit. Message-key tasks edit the same files, so they never run in parallel.
- **Icons**: `lucide-react` named imports, `aria-hidden` beside visible text, or an accessible name
  from a key when the icon stands alone.
- **Motion**: only `transform`, `opacity` and `background-color`, using the duration tokens, which
  are 0 ms under reduced motion.
- **Commits**: one or more small commits per story, each referencing task ids, after that story's
  tests pass and `npm run lint` and `npm run typecheck` are clean. No subagents during implement.
- **Screens**: after each story, run `npm run screens` and compare the story's screens with the
  reference before committing.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Dependency, font, tokens and test configuration.

- [X] T001 Add `lucide-react` with `npm install lucide-react` (updates `package.json` and `package-lock.json`). Add a row for icons to the "one sanctioned tool per concern" table in `README.md`, with the one-line reason from research R3
- [X] T002 Replace Noto Sans and Noto Sans Kannada with Anek Kannada in `src/app/layout.tsx` (research R2):
  - call `Anek_Kannada({ subsets: ['kannada', 'latin'], axes: ['wdth'], display: 'swap', variable: '--font-anek' })`;
  - set the `<html>` class to its variable;
  - set the viewport `themeColor` to the Coast primary `#b8461a`.
- [X] T095 Write the contrast unit test `src/app/theme-contrast.test.ts` (SC-006; analyze C1) before T003. It reads the `@theme` block of `src/app/globals.css`, computes WCAG contrast ratios, and asserts:
  - at least 4.5:1 for every body-text pair: `ink`, `muted` and `subtle` on `page`, `surface` and `surface-sunk`; `on-primary` on `primary` and `primary-strong`; `primary` on `surface` (links); each `status-*` on its `status-*-soft`; `open`, `closed`, `warn` and `danger` on their `-soft` tints; `on-danger` on `danger`;
  - at least 3:1 for large text and meaningful icons: `sea`, `veg` and `nonveg` on `surface` and `page`, and `line-strong` on `surface` for control borders.
  It must fail until T003 defines the new tokens.
- [X] T003 Rewrite the `@theme` block and base styles in `src/app/globals.css` with the Coast tokens (research R1, contracts/ui.md, values from `design/a-coast/tokens.css`):
  - keep the existing names (`primary`, `primary-strong`, `on-primary`, `secondary`, `on-secondary`, `danger`, `on-danger`, `veg`, `nonveg`, `surface`, `page`, `ink`, `muted`, `line`, `open`, `closed`, `warn`, `spacing-touch`) with Coast values;
  - add `sea` and `sea-soft`, `subtle`, `surface-sunk`, `line-strong`, `-soft` tints for open, closed, veg, nonveg, warn and danger, and `status-{placed,accepted,preparing,ready,picked,delivered,rejected,cancelled}` with `-soft` tints;
  - add `--text-{caption,small,body,heading,title,display}` (13/14/16/18/22/28 px) with line heights, `--radius-{xs,sm,md,lg,xl}` (6/10/14/18/24 px), `--shadow-{1,2,3,bar}`, `--spacing-{topbar,tabbar,placebar}` (56/72/76 px), and `--duration-{fast,base}` (120/180 ms) with `--ease-out-soft`;
  - set `--font-sans: var(--font-anek), ui-sans-serif, system-ui, sans-serif`;
  - add `:lang(kn)` line heights (body 1.62, headings 1.42) and three `font-stretch` utility classes (`stretch-read` 100%, `stretch-head` 87.5%, `stretch-dense` 80%);
  - add a global `@media (prefers-reduced-motion: reduce)` rule setting the duration tokens to 0 ms and stopping `animate-pulse`;
  - restyle the Leaflet zoom-control block to the new tokens (keep 44 px controls).
- [X] T004 [P] Add `screens/` to `.gitignore`
- [X] T005 [P] Add a `layout` project to `playwright.config.ts` (Chromium, `isMobile: true`, `hasTouch: true`, `testMatch: /\/visual-.*\.spec\.ts/`; each test sets its own viewport) and keep the `mobile` and `desktop` projects' `testMatch` patterns from matching `visual-*` files
- [X] T006 [P] Create `playwright.screens.config.ts` (testDir `e2e/screens`, the same `webServer` and `use` settings as `playwright.config.ts`, one worker, no retries) and add the script `"screens": "NODE_OPTIONS=--conditions=react-server playwright test --config playwright.screens.config.ts"` to `package.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Verification tools first, so they guide the restyle, then the shared primitives every
surface uses.

**⚠️ CRITICAL**: No story work can begin until this phase is complete.

### Verification tools (research R13, R14)

- [X] T007 Write the layout helpers in `e2e/layout.ts`. Each takes a Playwright `page` and returns data for assertions:
  - `setLocale(page, 'en' | 'kn')`: sets the existing `locale` cookie;
  - `horizontalOverflow(page)`: `scrollWidth - innerWidth` of the document;
  - `smallTargets(page)`: visible `a`, `button`, `summary`, `select`, `input:not([type=hidden])` and `[role=button]` elements whose box is under 48×48, excluding links inside `p` (WCAG inline exception); returns a short description of each;
  - `fixedChrome(page)`: visible elements with computed `position` `fixed` or `sticky` touching the top or bottom edge; returns `{ top: count, bottom: count, totalHeight }`;
  - `fullyVisibleCount(page, locator)`: how many matches lie fully inside the viewport, above the bottom fixed bar;
  - `clippedText(page)`: elements whose `scrollWidth > clientWidth` or `scrollHeight > clientHeight` while `overflow` is not `visible`, excluding intentional one-line truncation marked with `data-truncate`;
  - `truncatedWithoutFullText(page)`: `data-truncate` elements that expose neither a `title` nor screen-reader text holding the full value (every layout check asserts this list is empty; analyze U1).
- [X] T008 Write the screenshot capture `e2e/screens/capture.spec.ts` (research R14):
  - `resetDemoData()` first;
  - sign in per role with `e2e/sign-in.ts`, choosing subjects through `e2e/catalogue.ts` flags (demo customer, the kitchen of the placed order, the agent of the ready order, the admin);
  - visit every route of each surface: customer, partner and agent at 360×780 and 390×844, admin at 1280×800, in `en` and `kn`;
  - add these states: home with suggestions open, kitchen with "Address and hours" open, cart with items, UPI sheet open, empty cart, partner sound prompt and pill, reject sheet open, board;
  - write `screens/<surface>/<route>-<width>-<locale>.png` and a `screens/index.html` contact sheet grouped by surface;
  - call `blockMapTiles(page)` before map pages.
- [X] T009 Run `npm run screens` on the unchanged UI to produce the "before" set, and move it to `screens/before/` (git-ignored with `screens/`) for comparison during review

### Shared icons and illustrations (research R3)

- [X] T010 [P] Create the custom SVG components in `src/shared/ui/icons/`, drawn from `design/a-coast/` and each `aria-hidden` unless given a `label` prop:
  - `veg-marks.tsx`: `VegMarkIcon` (square outline, filled circle) and `NonVegMarkIcon` (square outline, filled triangle), in `--color-veg` and `--color-nonveg`;
  - `coast-mark.tsx`: the Coast mark;
  - `empty-illustrations.tsx`: `EmptyCart`, `NoOrders`, `NoMessages`, `NoKitchens`, `NotFound`.
- [X] T011 [P] Redraw the kitchen and delivery map pins in `src/shared/maps/icons.ts` to the Coast pins (kitchen in primary, delivery in `sea`), keeping the existing exports and marker labels
- [X] T012 [P] Restyle `src/shared/ui/veg-mark.tsx` to use the new mark icons, keeping its props and accessible name

### Shared primitives (contracts/ui.md)

- [X] T013 [P] Restyle `src/shared/ui/button.tsx`:
  - variants `primary`, `secondary`, `ghost`, `danger`, plus a new `sea`;
  - an optional `icon` slot;
  - minimum height `min-h-touch` and `rounded-md`;
  - press feedback with `duration-fast`.
  Keep the `buttonClasses(variant, extra)` signature used across the app.
- [X] T014 [P] Create `src/shared/ui/chip.tsx` (`Chip`: a button or link, `pressed` rendered as `aria-pressed`, optional icon, `rounded-full`, min 48 px high)
- [X] T015 [P] Create `src/features/orders/components/status-chip.tsx` (`StatusChip`, with the Lucide icon and word per status, using `status-*` and `-soft` tokens; icons as in `design/a-coast/index.html`). Make `src/features/orders/components/status-badge.tsx` render `StatusChip`, keeping its props and any test ids
- [X] T016 [P] Restyle `src/shared/ui/card.tsx` with a `tone: 'default' | 'attention'` prop. Attention is a neutral 2 px ink outline: no coloured ring, rail or tint (owner edit 2)
- [X] T017 [P] Restyle `src/shared/ui/badge.tsx`, `field.tsx`, `form-message.tsx`, `phone-link.tsx`, `fallback-marker.tsx` and `photo.tsx` to the tokens: inputs `rounded-md` and 48 px, icons for phone links, fallback marker unchanged in meaning
- [X] T018 [P] Update `src/shared/ui/empty-state.tsx` to take an `illustration` prop (one of T010's illustrations), keeping `title`, `body` and `action`
- [X] T019 [P] Rework `src/shared/ui/route-states.tsx`:
  - `RouteLoading` becomes a restyled generic skeleton;
  - add the named skeleton building blocks `SkeletonBox`, `SkeletonRow` (kitchen-row height) and `SkeletonCard` (order-card height);
  - keep `role="status"` and the `common.loading` text;
  - restyle `RouteError` and `RouteNotFound` with an illustration (T010) and their existing actions.
- [X] T020 Restyle `src/shared/ui/app-header.tsx` as the slim top bar: `h-topbar`, mark plus wordmark (`common.appName`), an optional `back` link keeping `data-testid="back-link"`, and the `actions` slot for the language switch. Restyle `src/shared/ui/language-switch.tsx` as a pill with a languages icon, keeping its accessible names
- [X] T021 Extend `src/shared/ui/nav-links.tsx`:
  - items take a Lucide `icon`;
  - `layout` becomes `'bottom' | 'top'`, where `top` replaces `side`;
  - the active item gets `aria-current`, bold weight and a filled icon tile;
  - link names stay unchanged.
  Switch the admin layout's call to `top` in T071.
- [X] T022 Add the foundational message keys to `src/shared/i18n/messages/en.json`, `kn.json` and `machine-drafted.json`: `common.mark`, `common.back` (if missing), and the empty-state illustration alt texts under `empty.*` (research R16). Run the messages parity test

**Checkpoint**: Tokens, font, icons, primitives and test tools are in place; existing tests still
pass (`npm test`, `npm run test:e2e`); `npm run screens` shows the new base styles.

---

## Phase 3: User Story 1 - Customer orders through a calmer, finished-looking app (Priority: P1) 🎯 MVP

**Goal**: One slim top bar and a four-tab bottom bar carrying the cart total and ongoing order
status. Kitchen rows with landmark lines, search suggestions, a compact kitchen header, a cart with
a place-order bar, and an order page that reads status first, all in Coast.

**Independent Test**: At 390 and 360 px, in English and Kannada, go from home to a placed cash order
in four taps. The top carries one bar and the bottom one bar, search suggests while typing, and
three kitchens (four at 430 px) are visible (spec US1, SC-002, SC-004, SC-007a, SC-008).

### Tests for User Story 1 ⚠️ (write first; they must fail)

- [X] T023 [P] [US1] Unit tests for `tabBarState` in `src/features/cart/tab-bar-state.test.ts`, covering every rule in data-model.md "TabBarState":
  - `visible` is false only when `onCartPage` and `cart.count > 0`;
  - `orders.href` is always `/orders`;
  - `orders.state` is the ongoing status when `ongoing` exists and `ongoing.id !== excludeOrderId`, and null otherwise;
  - `cart` is null when the count is 0;
  - `active` equals `current`.
- [X] T024 [P] [US1] Unit tests for `toSuggestions` in `src/features/browse/suggestions.test.ts`:
  - at most 4 kitchens and 6 dishes, in the order given;
  - `total` holds the full counts;
  - fields as in data-model.md "Suggestions";
  - empty input gives empty lists.
- [X] T025 [P] [US1] Integration test for `GET /api/search/suggestions` in `src/app/api/search/suggestions/route.int.test.ts` (contracts/routes.md):
  - a valid query returns the same kitchens and dishes as `searchForCustomer` for the same input, capped;
  - `q` under 2 or over 80 characters, missing or not a string returns empty lists with status 200;
  - the dish-filter cookie is honoured;
  - `Cache-Control: no-store` is set.
- [X] T026 [US1] Customer layout checks in `e2e/visual-layout.spec.ts` (research R13), using T007's helpers. After `resetDemoData()` and `openAllDay(orderableKitchen().id)`, for home, kitchen (`orderableKitchen()`), cart with items, and the order page (`placedOrder()`, signed in as `demoCustomer()`), at 360×780 and 390×844 in `en` and `kn`, assert:
  - no horizontal overflow;
  - no small targets;
  - no clipped text;
  - at most one fixed bar at the top and one at the bottom, with total height ≤ 18% of 780 at 360×780;
  - no request to `fonts.googleapis.com` or `fonts.gstatic.com` during any page load (FR-007; analyze C3).
  Also assert at least 3 fully visible `kitchen-card` rows on home at 390×844 and at least 4 at 430×932, in both languages (SC-007a).
- [X] T027 [US1] Four-tap test in `e2e/visual-layout.spec.ts`, at 360×780 and 390×844, in both languages:
  - sign in as `demoCustomer()` (saved address and last payment preselected) and start on `/`;
  - count exactly four taps: the kitchen row, Add on `availableDishesIn(kitchen.key)[0]`, the Cart tab (`header-cart`), and Place order with cash;
  - assert the order page shows `#<number>` (SC-002, FR-004).
- [X] T028 [P] [US1] End-to-end suggestions test in `e2e/visual-search-suggestions.spec.ts` (390×844), using `searchableDish()` and `orderableKitchen()` from `e2e/catalogue.ts`:
  - typing two letters of `enTerm` shows `search-suggestions` within 1 s, with the dish;
  - choosing the dish opens `/kitchens/<id>#dish-<dishId>` with that `dish-row` in view;
  - typing a kitchen name and choosing it opens the kitchen;
  - a no-match string shows one "no matches" line;
  - pressing Enter still runs the existing search (URL `?q=`).
  Repeat the dish case with `knTerm`.
- [X] T029 [US1] **E1 (approved 2026-10-16)**: in `e2e/ordering-ongoing-strip.spec.ts` lines 25–29, replace the "strip above cart bar" assertion with "both `ongoing-strip` and `cart-bar` are visible and their boxes do not overlap". Name E1 in the commit message
- [X] T030 [US1] **E2 (approved 2026-10-16)** (research R15). In `e2e/ordering-ongoing-strip.spec.ts` lines 37–39:
  - clicking `ongoing-strip` opens `/orders`;
  - the first `order-card` there is the ongoing order, with its status;
  - clicking that card opens `/orders/<id>`, where `ongoing-strip` has count 0.
  Name E2 in the commit message.

### Implementation for User Story 1

- [X] T031 [US1] Implement `toSuggestions(results)` in `src/features/browse/suggestions.ts` (pure, no `server-only`) to pass T024
- [X] T032 [US1] Implement `GET` in `src/app/api/search/suggestions/route.ts` to pass T025:
  - Zod-validate `q` (string, NFC-normalised, trimmed, 2–80 characters; otherwise empty lists);
  - read the dish filter and locale as the home page does;
  - call `searchForCustomer`, then `toSuggestions`;
  - return JSON with `Cache-Control: no-store`;
  - on an unexpected error, log with context via `src/shared/log.ts` and return 500 `{ error: 'unavailable' }`.
- [X] T033 [US1] Implement `tabBarState(input)` in `src/features/cart/tab-bar-state.ts` (pure) to pass T023
- [X] T034 [US1] Create the server component `src/features/cart/components/customer-tab-bar.tsx` (`CustomerTabBar`, research R5):
  - props `current`, `excludeOrderId?`, `onCartPage?`; reads `getCartView(await readCart(), …)` and `getOngoingOrder` for the signed-in customer; uses `tabBarState`;
  - fixed bottom bar of height `h-tabbar` (72 px) with four tabs, each with a Lucide icon and a two-line label (word above, state below): Home; Orders (always `/orders`, state "· <status>" when ongoing); Cart (state "· ₹<item total>" and a count badge when the cart has items); Account;
  - test hooks: the Cart link keeps `data-testid="header-cart"`; its count-and-total summary has `data-testid="cart-bar"` and includes `cart.itemCount` text for screen readers; the Orders tab's state has `data-testid="ongoing-strip"` with `#<orderNo>` in its accessible text;
  - `aria-current` on the active tab;
  - also export a static `CustomerTabBarShell` (no live state) for error and not-found pages.
- [X] T035 [US1] Make `src/app/(customer)/layout.tsx` render only the slim `AppHeader` (mark, wordmark, language switch, account or sign-in moved into the Account tab), removing the second navigation row. `main` gets bottom padding `pb-tabbar` plus a safe-area inset
- [X] T036 [US1] Replace `CustomerDock` with `CustomerTabBar` in every customer page that uses it, passing `current` and, on the order page, `excludeOrderId`:
  - `src/app/(customer)/page.tsx`
  - `kitchens/[id]/page.tsx`
  - `cart/page.tsx` (`onCartPage`)
  - `orders/page.tsx`
  - `orders/[id]/page.tsx`
  - `messages/page.tsx`
  - `account/page.tsx`
  - `addresses/page.tsx`
  - `addresses/new/page.tsx`
  - `addresses/[id]/page.tsx`
  Add it to `search/page.tsx` and `login/page.tsx` too. Then delete `src/features/cart/components/customer-dock.tsx`, `src/features/cart/components/cart-bar.tsx` and `src/features/orders/components/ongoing-order-strip.tsx`.
- [X] T037 [US1] Create `src/features/cart/components/place-order-bar.tsx` and use it in `src/features/cart/components/checkout-form.tsx` (research R6):
  - a fixed bottom bar of height `h-placebar`, holding the existing submit button with label "Place order · ₹<grand total>" for a signed-in customer, or the existing "Sign in to check out" link for a guest;
  - same form, same submit, same double-tap guard and UPI sheet;
  - `src/app/(customer)/cart/page.tsx` adds the matching bottom padding.
- [X] T038 [P] [US1] Restyle the cart sections in `src/features/cart/components/cart-lines.tsx`, `bill-summary.tsx`, `add-to-cart.tsx` (stepper) and the address and payment parts of `checkout-form.tsx`:
  - cards with section headings;
  - the address card with a label icon;
  - payment choices as two selectable cards, "UPI (demo)" keeping its demo label;
  - the UPI sheet as a bottom sheet with a `duration-base` entrance.
- [X] T039 [US1] Make `src/features/browse/components/search-box.tsx` a client component (research R7):
  - keep the GET form, hidden filter fields, the `searchbox` input, the "Search" submit (icon button with that accessible name) and the "Clear search" link;
  - from 2 characters, fetch `/api/search/suggestions?q=` 150 ms after the last keystroke, aborting the previous request;
  - render `SearchSuggestions` under the box;
  - Escape or clearing closes it.
- [X] T040 [P] [US1] Create `src/features/browse/components/search-suggestions.tsx` (`data-testid="search-suggestions"`):
  - a "Kitchens" group of links to `/kitchens/<id>` with thumbnail, name (`LocalizedText`) and type;
  - a "Dishes" group of links to `/kitchens/<kitchenId>#dish-<dishId>` with photo, veg mark, name, kitchen name and price;
  - a final "Search for …" row submitting the form;
  - a single "no matches" line when both groups are empty;
  - a polite live region with the count.
- [X] T041 [US1] Replace the card markup in `src/features/browse/components/kitchen-card.tsx` with the kitchen row (research R12):
  - a 96 px square `Photo` (`rounded-md`), then name, the landmark as a one-line secondary text (`data-truncate`, full text for screen readers), type badge with icon, pure-veg badge where it applies, open state with icon and word (`kitchen-state` with `data-state`), and delivery estimate with icon;
  - fixed row height;
  - closed kitchens with a greyed photo and moon icon;
  - keep `data-testid="kitchen-card"` and `data-kitchen-id`.
  Restyle `kitchen-state-label.tsx` to match.
- [X] T042 [P] [US1] Restyle `src/features/browse/components/filter-bar.tsx`, `dish-filter-control.tsx` and `clear-filters.tsx` with `Chip` (T014): the filter chip row scrolls inside itself at 360 px; the dish filter is a segmented control with veg marks; links and query handling are unchanged
- [X] T043 [US1] Restyle `src/app/(customer)/page.tsx` (home) and `src/features/browse/components/search-results.tsx`:
  - title "Kitchens in Honnavar" style heading;
  - search box, chips, dish filter, kitchen rows and the illustrated empty states (`NoKitchens`);
  - search results use the same kitchen rows and a dish row style.
- [X] T044 [US1] Restyle the kitchen page `src/app/(customer)/kitchens/[id]/page.tsx` with `src/features/kitchens/components/kitchen-profile.tsx`, `src/features/browse/components/call-button.tsx` and `hours-table.tsx` (research R8):
  - a short hero photo with the back link;
  - one header card with name, call, type and pure-veg badges, open state with closing time, and delivery estimate;
  - address and hours inside a native `<details>` ("Address and hours") closed by default.
  The content and the 001/002 data are unchanged.
- [X] T045 [P] [US1] Restyle `src/features/browse/components/dish-row.tsx` and `menu-section.tsx`:
  - photo on the right with Add or the stepper overlapping its lower edge;
  - veg mark with word, name and price;
  - add `id="dish-<id>"` with `scroll-margin-top` (top bar plus 16 px) and a `:target` tint fading over `duration-base` (research R8);
  - keep `dish-row`, `data-dish-id` and `not-available`.
- [X] T046 [US1] Restyle the order page `src/app/(customer)/orders/[id]/page.tsx` with `src/features/orders/components/order-timeline.tsx`, `order-number.tsx`, `payment-label.tsx`, `customer-cancel.tsx`, `time-left.tsx` and `src/shared/maps/order-map.tsx`:
  - status and "Expected by" first, in a status card;
  - the six-step progress strip and timeline;
  - a framed map with Coast pins and a labelled fallback when tiles fail;
  - items and bill;
  - payment label with icon;
  - call kitchen and cancel unchanged in behaviour.
- [X] T047 [P] [US1] Restyle `src/app/(customer)/orders/page.tsx` with `src/features/orders/components/reorder-button.tsx`: ongoing orders first as cards with `StatusChip` (the first card is the ongoing order the Orders tab points to), then past orders, with the `NoOrders` empty state. Keep `order-card` and "Order again"
- [X] T048 [P] [US1] Restyle the account, messages and addresses screens:
  - `src/app/(customer)/account/page.tsx`: Messages and Addresses as icon rows at the top, then name, phone and sign out;
  - `src/app/(customer)/messages/page.tsx` with `src/features/notifications/components/message-list.tsx`: the demo label stays visible; `NoMessages` empty state;
  - `src/app/(customer)/addresses/page.tsx`: address cards with label icons; empty state.
- [X] T049 [P] [US1] Restyle the address flow: `src/app/(customer)/addresses/new/page.tsx`, `addresses/[id]/page.tsx`, `src/features/addresses/components/address-flow.tsx`, `address-details-form.tsx`, `address-label.tsx`, `voice-recorder.tsx`, `src/shared/audio/voice-note-player.tsx` and `src/shared/maps/pin-picker.tsx`. Use the tokens, icons on actions, and 48 px controls; fields, steps and validation are unchanged
- [X] T050 [P] [US1] Restyle the customer sign-in: `src/app/(customer)/login/page.tsx`, `src/features/auth/components/login-screen.tsx`, `sign-in-form.tsx`, `customer-name-form.tsx` and `src/features/demo/components/demo-panel.tsx`, keeping the demo panel's trimmed content ("Demo only", accounts, the fixed code). The login screen is shared by all four surfaces, so check each surface's login page renders correctly
- [X] T051 [US1] Add shaped loading skeletons (research R10, T019 blocks):
  - `src/app/(customer)/loading.tsx` for home (header, search, chips, three kitchen rows, tab bar placeholder);
  - new `kitchens/[id]/loading.tsx`, `cart/loading.tsx` and `orders/[id]/loading.tsx`, each reserving the real layout's boxes.
  Make `src/app/(customer)/error.tsx` and `not-found.tsx` render with `CustomerTabBarShell`.
- [X] T052 [US1] Add the US1 message keys to `en.json`, `kn.json` and `machine-drafted.json` (research R16):
  - `tabs.{home,orders,cart,account,ordersWithStatus,cartWithTotal,cartCount}`;
  - `kitchen.addressAndHours` (and `closesAt`/`opensAt` if missing);
  - `search.{suggestionsKitchens,suggestionsDishes,noSuggestions,allResultsFor,suggestionsCount}`;
  - `checkout.placeOrderWithTotal`.
  Remove keys left unused by the removed cart bar and strip (for example `cart.viewCart`, `ongoing.label` if unused) from both files. Run the parity test.
- [X] T053 [US1] Run `npm test`, `npm run test:e2e` (all existing specs plus T026–T029) and `npm run screens`. Compare the customer screens with `design/a-coast/` home, kitchen, cart and order, and fix differences in the files above. Commit with task ids, naming E1 and any locator edits

**Checkpoint**: The customer surface is refreshed and its layout checks pass in both languages.

---

## Phase 4: User Story 2 - Partner handles incoming orders at a glance (Priority: P1)

**Goal**: The sound prompt collapses to a pill. Order cards scan in one glance and keep the item
total and the customer's name, landmark and rider note. The reject step is a short sheet. All
partner screens are in Coast.

**Independent Test**: As the partner of `placedOrder()`'s kitchen at 390×844: turn on sounds and
reload to see the pill. Three cards are visible. Rejecting fits without scrolling, in both
languages (spec US2, SC-007).

### Tests for User Story 2 ⚠️

- [X] T054 [US2] Partner layout checks in `e2e/visual-layout.spec.ts`. Signed in as the kitchen of `placedOrder()` on `/partner/orders`, at 360×780 and 390×844 in `en` and `kn`, assert:
  - no horizontal overflow, small targets or clipped text;
  - at least 3 fully visible order cards at 390×844 (SC-007);
  - with the reject step open on the waiting order at 390×844, the reasons, note, Back and Reject are all inside the viewport without scrolling.
- [X] T055 [P] [US2] End-to-end sound pill test in `e2e/visual-partner-sound.spec.ts` (390×844):
  - on first visit `sound-prompt` is visible;
  - after tapping it, `sound-prompt` is hidden and `sound-pill` shows the "on" state;
  - after a reload, `sound-pill` shows (the "tap for sound" or "on" state) and `sound-prompt` stays hidden;
  - in a fresh browser context, `sound-prompt` shows again.

### Implementation for User Story 2

- [X] T056 [US2] Add `promptSeen()` and `rememberPromptSeen()` to `src/features/orders/components/alert-storage.ts` using `localStorage` key `hfd_alert_prompt_seen` (`'1'` or absent), guarded like the existing functions (research R9; data-model "Device preferences")
- [X] T057 [US2] Split `src/features/orders/components/new-order-alert.tsx` into the full `SoundPrompt` (keeps `data-testid="sound-prompt"`, shown until the prompt has been seen on this device) and `SoundPill` (`data-testid="sound-pill"`), which shows "Sounds on" or "Tap for sound" (a button doing the same unlock). The pill sits beside the page title. Keep the new-order banner (`new-order-banner`), the tone and the acknowledgement logic unchanged. The collapse animates opacity and transform only, inside reserved space
- [X] T058 [US2] Restyle `src/app/(partner)/partner/(protected)/layout.tsx`:
  - slim top bar with mark, wordmark, "Partner app" and the language switch;
  - the sound prompt or pill;
  - bottom `NavLinks` with icons, labels unchanged;
  - sign-out kept.
- [X] T059 [US2] Restyle `src/features/orders/components/partner-order-card.tsx` (FR-018, owner edits 3 and 5):
  - row 1: number, `StatusChip`, then time left (waiting) or age;
  - row 2: item count, **item total** (labelled for screen readers) and payment label with icon;
  - then customer display name, landmark and rider note, as today;
  - then dishes;
  - then the one next action.
  The waiting order gets `Card tone="attention"` and the countdown bar showing time left (time also in words). No rails or tints.
- [X] T060 [US2] Restyle `src/features/orders/components/partner-actions.tsx` and `acknowledge-order.tsx`:
  - reject opens a bottom sheet (`duration-base` entrance) with the four reasons as a 2×2 grid of `Chip`-style radio choices, the optional note, then Back and Reject side by side;
  - same form fields, names, validation and action calls;
  - accept, preparing and ready buttons with icons.
- [X] T061 [P] [US2] Restyle `src/app/(partner)/partner/(protected)/orders/page.tsx` (title with "Updated" time, Messages link, waiting orders first, empty state) and `orders/[id]/page.tsx` (detail in the same card language)
- [X] T062 [P] [US2] Restyle `src/app/(partner)/partner/(protected)/day/page.tsx` (totals as figures, order rows with `StatusChip`) and `page.tsx` (partner home)
- [X] T063 [P] [US2] Restyle the partner menu screens: `src/app/(partner)/partner/(protected)/menu/**` with `src/features/menu/components/menu-editor.tsx`, `category-form.tsx`, `dish-form.tsx`, `editor-pages.tsx` and `last-changed.tsx`. Use list rows with thumbnails and availability toggles; fields and actions are unchanged
- [X] T064 [P] [US2] Restyle `src/app/(partner)/partner/(protected)/hours/page.tsx` and `kitchen/page.tsx` with `src/features/kitchens/components/hours-editor.tsx`, `closure-control.tsx`, `status-notice.tsx` and `scope-fields.tsx`, and restyle `messages/page.tsx`
- [X] T065 [US2] Add skeletons `src/app/(partner)/partner/(protected)/orders/loading.tsx` (three order-card skeletons) and `orders/[id]/loading.tsx`. Restyle `src/app/(partner)/partner/error.tsx`, `not-found.tsx` and `loading.tsx`
- [X] T066 [US2] Add the US2 message keys (`alert.soundOnPill`, `alert.tapForSoundPill`, and any reworded partner labels) to `en.json`, `kn.json` and `machine-drafted.json`, removing unused keys from both files. Run the parity test
- [X] T067 [US2] Run `npm test`, `npm run test:e2e` and `npm run screens`. Compare the partner screens with `design/a-coast/partner-orders.html`, fix differences, and commit with task ids

**Checkpoint**: The partner surface is refreshed; the sound pill and reject sheet work in both
languages.

---

## Phase 5: User Story 3 - Admin dispatches from a board that uses the screen (Priority: P2)

**Goal**: Top navigation, five full-width board columns, and cards with what dispatch needs, in
Coast.

**Independent Test**: At 1280×800 with the seeded orders, every group is visible without sideways
scrolling, and an agent is assigned to `needsAgentOrder()` from its card (spec US3, SC-003).

### Tests for User Story 3 ⚠️

- [X] T068 [US3] Admin layout checks in `e2e/visual-layout.spec.ts`. Signed in as the admin on `/admin/orders`, at 1280×800 in `en` and `kn`, assert:
  - no horizontal overflow;
  - all five `group-*` columns are fully inside the viewport width;
  - no small targets or clipped text.
  At 1024×768, each column is at least 200 px wide and the board region (not the page) scrolls sideways.

### Implementation for User Story 3

- [X] T069 [US3] Restyle `src/features/orders/components/dispatch-board.tsx` (FR-020, FR-021, research R11):
  - five equal columns at ≥ 1280 px, each headed by group icon, word and count; no coloured rules or tints;
  - cards show number (link), `StatusChip` with minutes in status, kitchen, landmark, grand total, payment label, and the agent or "Needs agent" with the assign or reassign control on the card;
  - keep `group-*`, `board-order` and `data-order-no`;
  - columns keep a 200 px minimum below 1280 px.
- [X] T070 [P] [US3] Restyle `src/features/orders/components/assign-agent-form.tsx` (select showing each agent's undelivered count, then Assign or Reassign with icons) and `admin-cancel-form.tsx`; fields and actions are unchanged
- [X] T071 [US3] Restyle `src/app/(admin)/admin/(protected)/layout.tsx`:
  - top bar with mark, wordmark, "Admin panel", `NavLinks layout="top"` with icons, language switch and sign-out;
  - full-width `main`.
  Restyle `src/app/(admin)/admin/(protected)/orders/page.tsx` (title, "Updated" time, find-by-number field) and `orders/[id]/page.tsx` with `src/features/orders/components/order-history.tsx`.
- [X] T072 [P] [US3] Restyle the admin partner screens: `src/app/(admin)/admin/(protected)/partners/**` with `src/features/kitchens/components/admin/partner-table.tsx`, `kitchen-profile-form.tsx`, `photo-form.tsx`, `signin-list.tsx`, `status-panel.tsx` and `verification-panel.tsx`. Use tables with hairlines, status chips and the shared form styles
- [X] T073 [P] [US3] Restyle the admin agent screens (`src/app/(admin)/admin/(protected)/agents/**`, `src/features/agents/components/agent-table.tsx`, `agent-form.tsx`), `src/app/(admin)/admin/login/page.tsx` and `src/app/(admin)/admin/(protected)/page.tsx`
- [X] T074 [US3] Add the skeleton `src/app/(admin)/admin/(protected)/orders/loading.tsx` (five columns of card skeletons) and restyle `src/app/(admin)/admin/error.tsx`, `not-found.tsx` and `loading.tsx`
- [X] T075 [US3] Add any US3 message keys (for example the board's "Needs agent" label if not already a key) to `en.json`, `kn.json` and `machine-drafted.json`. Run the parity test, `npm test`, `npm run test:e2e` and `npm run screens`; compare with `design/a-coast/admin-board.html`; commit with task ids

**Checkpoint**: The admin surface is refreshed and the board uses the width.

---

## Phase 6: User Story 4 - Agent works with the same cards and actions as the partner (Priority: P2)

**Goal**: Today's figures, order cards in the partner card language, and an order page with
separate pickup and delivery sections and one primary next step.

**Independent Test**: As the agent of `readyOrder()` at 390×844: open the order and its delivery
location in maps, then mark it picked up and delivered with cash confirmed (spec US4).

### Tests for User Story 4 ⚠️

- [ ] T076 [US4] Agent layout checks in `e2e/visual-layout.spec.ts`. Signed in as `readyOrder().agent` on `/agent` and on the order page of `readyOrder()`, at 360×780 and 390×844 in `en` and `kn`, assert no horizontal overflow, small targets or clipped text, and that the next-step button is the only primary-variant button on the order page

### Implementation for User Story 4

- [ ] T077 [US4] Restyle `src/app/(agent)/agent/(protected)/page.tsx` (greeting, then today's deliveries and cash as two figure cards, then order cards) and `src/features/orders/components/agent-order-card.tsx`, using the partner card layout and `StatusChip` (FR-022)
- [ ] T078 [US4] Restyle `src/app/(agent)/agent/(protected)/orders/[id]/page.tsx` with `src/features/orders/components/agent-order-detail.tsx` and `agent-steps.tsx` (FR-023):
  - a "Pick up from" section (kitchen, call, open in maps, items);
  - a "Deliver to" section (customer name, address, landmark, rider note, voice note, call, open in maps);
  - the next step as the single primary button;
  - the cash confirmation as a bottom sheet.
  Behaviour is unchanged.
- [ ] T079 [P] [US4] Restyle `src/app/(agent)/agent/(protected)/layout.tsx` (top bar and bottom `NavLinks` with icons, labels unchanged), `messages/page.tsx`, `profile/page.tsx` and `src/app/(agent)/agent/login/page.tsx`
- [ ] T080 [US4] Add the skeleton `src/app/(agent)/agent/(protected)/loading.tsx` (two figures and two order cards). Restyle `src/app/(agent)/agent/error.tsx`, `not-found.tsx` and `loading.tsx`
- [ ] T081 [US4] Add any US4 message keys (`en.json`, `kn.json`, `machine-drafted.json`). Run the parity test, `npm test`, `npm run test:e2e` and `npm run screens`; commit with task ids

**Checkpoint**: All four surfaces are refreshed; the demo path runs end to end in Coast.

---

## Phase 7: User Story 5 - One coherent look in both languages (Priority: P2)

**Goal**: Every route on every surface uses the shared theme, without clipped Kannada; colour is
never alone; motion respects reduced motion.

**Independent Test**: In Kannada, visit every route of each surface at 360 px (admin at 1280 px):
no clipping or overflow, and every screen in the theme (spec US5).

### Tests for User Story 5 ⚠️

- [ ] T082 [US5] Every-route sweep in `e2e/visual-routes.spec.ts`. For each surface, sign in through `e2e/catalogue.ts` flags and visit every route listed in [contracts/routes.md](./contracts/routes.md) "Screens" (detail routes with seeded ids; customer, partner and agent at 360×780, 430×932 and 768×1024, admin at 1280×800) in `kn` and `en` (analyze C2, C4). Assert:
  - no horizontal overflow;
  - no clipped text;
  - no small targets;
  - at 768×1024, no text block wider than 720 px (readable line length; FR-011).
- [ ] T083 [P] [US5] Reduced-motion test in `e2e/visual-routes.spec.ts`: with `page.emulateMedia({ reducedMotion: 'reduce' })`, opening the reject sheet and the UPI sheet shows them with a computed `transition-duration` and `animation-duration` of `0s`. Without reduced motion, no transition on those elements exceeds 200 ms (SC-010)

### Implementation for User Story 5

- [ ] T096 [US5] Use tablet widths sensibly on customer, partner and agent (FR-011, spec edge case; analyze C2):
  - cap content at a readable maximum width (about 720 px, centred);
  - from 768 px, show kitchen rows, order lists and partner and agent cards in two columns;
  - keep the tab bar and the top bar full width with centred content.
  Edit the three surface layouts and the list containers in `src/app/(customer)/page.tsx`, `src/app/(customer)/orders/page.tsx`, `src/app/(partner)/partner/(protected)/orders/page.tsx` and `src/app/(agent)/agent/(protected)/page.tsx`.
- [ ] T084 [US5] Fix every finding from T082, T083 and T096 in the component files involved. Then review the screens set for colour-only states (owner edit 2 and FR-009): every open/closed, veg/non-veg, status and error state has a word or icon. Fix any remaining coloured rails, rules or tints
- [ ] T085 [US5] Run `npm run test:e2e` and `npm run screens`, compare the Kannada screens of all four surfaces with the reference, and commit with task ids

---

## Phase 8: User Story 6 - Loading, empty, error and not-found states look intentional (Priority: P3)

**Goal**: Designed states everywhere, in the selected language, with no layout shift when content
arrives.

**Independent Test**: Throttle the network and open home, kitchen, partner orders and the board.
Force an empty list and a not-found order on each surface (spec US6, SC-009).

### Tests for User Story 6 ⚠️

- [ ] T086 [US6] States test in `e2e/visual-states.spec.ts`:
  - a not-found URL on each surface (`/kitchens/<random uuid>`, `/partner/orders/<random uuid>`, `/agent/orders/<random uuid>`, `/admin/orders/<random uuid>`) shows the `NotFound` illustration, the surface's navigation and a way back;
  - the empty cart shows the `EmptyCart` illustration with the tab bar (not the place-order bar);
  - on home, kitchen, partner orders and the board, a `PerformanceObserver` for `layout-shift` records a cumulative score below 0.1 after load with a 3G-like `page.route` delay on images (SC-009).

### Implementation for User Story 6

- [ ] T087 [US6] Put an illustrated `EmptyState` (T018) on every empty list not already done in US1–US4, each with one next step where one exists:
  - partner orders with none;
  - partner day with none;
  - agent with no orders;
  - board groups with none (a short muted line, not an illustration);
  - customer addresses with none;
  - search with no results.
- [ ] T088 [US6] Fix every layout-shift and state finding from T086: reserve image boxes, fix skeleton sizes, give fonts size-adjusted fallbacks. Run `npm run test:e2e` and commit with task ids

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Sweeps, documentation, the screenshot review and the full gate.

- [ ] T089 [P] Update `README.md`:
  - icons (lucide-react) and the Anek Kannada font in the tool table;
  - `npm run screens` and where it writes;
  - the `layout` Playwright project.
- [ ] T090 [P] Run a parity sweep: `grep` `src/` for hard-coded user-facing text in JSX text, `aria-label`, `alt`, `placeholder` and `title` (icon buttons, illustrations, the tab bar, suggestions, the pill); confirm every new key exists in both languages and every agent-drafted Kannada key is listed in `machine-drafted.json`
- [ ] T091 [P] Remove dead code: components and CSS no longer used (old card markup, `layout="side"` branch, unused `RouteLoading` variants), commented-out code and debug logging. Confirm no client component imports a `server-only` module and that `src/app/globals.css` has no leftover Noto references
- [ ] T092 Check that no existing e2e file changed beyond E1, E2 and listed locator edits: `git diff main -- e2e/ ':!e2e/visual-*' ':!e2e/layout.ts' ':!e2e/screens'`. Record the list in the final report
- [ ] T093 Run `npm run screens` and review every screen against `design/a-coast/` and the owner's edits (quickstart "Review walkthrough" steps 1–13). Fix what differs and record anything left with a reason
- [ ] T094 Run the full gate (`npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run test:e2e`) and record the counts (existing 350 unit and integration plus new; existing 31 e2e plus new)

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (Phase 1)**: T001, T002, then T095 (contrast test, fails first), then T003 (uses T002's font variable); T004–T006 in parallel.
- **Foundational (Phase 2)**: depends on Setup and blocks every story.
  - Tools: T007 → T008 → T009 (the "before" set).
  - Icons T010–T012 and primitives T013–T019 in parallel.
  - T020 and T021 depend on T010 and T013. T022 comes after T010 and T018.
- **US1 (Phase 3)**: needs Foundational. Tests T023–T028 first; T029 and T030 any time before T053.
  - Then T031 (after T024) → T032 (after T025).
  - T033 (after T023) → T034 → T035 → T036.
  - T037 after T036. T039 → T040.
  - T041 → T043. T044 and T045 together.
  - T046–T050 in parallel.
  - T051 after T034. T052 after the components. T053 last.
- **US2 (Phase 4)**: needs Foundational. T056 → T057 → T058; T059 → T060; T061–T064 in parallel; T065, T066, T067 last. Its layout test T054 places nothing, so it does not need US1.
- **US3 (Phase 5)**: needs Foundational (T021 for top navigation).
- **US4 (Phase 6)**: needs Foundational and US2's partner card (T059) for the shared card layout.
- **US5 (Phase 7)**: needs US1–US4 (it sweeps every route). T082 and T083 → T096 → T084 → T085.
- **US6 (Phase 8)**: needs US1–US4.
- **Polish (Phase 9)**: needs all stories.

### Story completion order

```text
Setup → Foundational ─┬─ US1 (P1, MVP) ─┐
                      ├─ US2 (P1) ──────┼─ US4 (P2) ─┐
                      └─ US3 (P2) ──────┘            ├─ US5 (P2) ─ US6 (P3) ─ Polish
```

Recommended sequence for one implementer: US1 → US2 → US3 → US4 → US5 → US6 → Polish.

### Within each story

- Tests are written first and must fail. Then pure helpers and the route handler, then components,
  then pages, then skeletons, then message keys, then the story's run and commit.
- Message-key tasks (T022, T052, T066, T075, T081) edit the same JSON files and never run in
  parallel with each other.
- `e2e/visual-layout.spec.ts` is extended by T026, T027, T054, T068 and T076 in order, never in
  parallel.

### Parallel opportunities

- **Setup**: T004, T005 and T006.
- **Foundational**: T010–T019, which are separate files.
- **US1**: T023, T024, T025 and T028 (tests); T038, T040, T042, T045 and T047–T050 (separate component files).
- **US2**: T055 alongside T054; T061–T064.
- **US3**: T070, T072 and T073.
- **US4**: T079.
- **Across stories**: once Foundational is done, US2 and US3 can proceed alongside US1 (different files). They share only the message JSON files and `e2e/visual-layout.spec.ts`.

---

## Parallel Examples

### Foundational

```text
Task: "T010 Custom SVG components in src/shared/ui/icons/"
Task: "T013 Restyle src/shared/ui/button.tsx"
Task: "T014 Create src/shared/ui/chip.tsx"
Task: "T015 StatusChip in src/features/orders/components/status-chip.tsx"
```

### User Story 1

```text
Task: "T023 Unit tests for tabBarState in src/features/cart/tab-bar-state.test.ts"
Task: "T024 Unit tests for toSuggestions in src/features/browse/suggestions.test.ts"
Task: "T025 Integration test for GET /api/search/suggestions"
Task: "T028 Suggestions e2e in e2e/visual-search-suggestions.spec.ts"
```

---

## Implementation Strategy

### MVP first (User Story 1)

1. Phases 1 and 2: tokens, font, icons, primitives, layout helpers, screenshot capture and the
   "before" set.
2. Phase 3 (US1): the customer surface in Coast, with the tab bar, suggestions, place-order bar and
   layout checks.
3. **Stop and validate**: run the gate and the screens set, and show the owner the customer
   screens.

### Incremental delivery

US2 (partner) → US3 (admin) → US4 (agent) → US5 (every route, both languages) → US6 (states) →
Polish. Each story is committed after its tests and screens pass. The existing 001 and 002 tests
stay green at every commit.
