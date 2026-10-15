# Feature Specification: Visual Refresh

**Feature Branch**: `003-visual-refresh`

**Created**: 2026-10-16

**Status**: Draft

**Input**: User description: "Feature 003, visual refresh of all four surfaces (customer, partner,
agent, admin). No new business behaviour: every existing unit, integration and e2e test stays
green, message keys may be added but not renamed, and the four-tap path from home to a placed cash
order is kept." (full description in the `/speckit-specify` request for 003)

**Sources**: PRD in `docs/prd/`; capability status in `docs/fidelity-matrix.md`; builds on
`specs/001-platform-core/spec.md` and `specs/002-ordering/spec.md`, whose behaviour this feature
keeps unchanged. Layout problems come from the owner's first walkthrough of 002.

## Clarifications

### Session 2026-10-16

- Q: What goes in the customer's bottom navigation, and where do the cart and the ongoing order
  live? → A: Four tabs: Home, Orders (shows the ongoing order's status), Cart (count and running
  ₹ total), Account (with Messages and Addresses inside). The Cart tab shows the running total on
  the kitchen page too, so no in-page cart bar is needed.
- Q: What happens when a customer chooses a search suggestion? → A: A kitchen suggestion opens
  that kitchen; a dish suggestion opens its kitchen scrolled to that dish.
- Q: On the cart screen, how does "Place order" stay reachable with only one bottom bar? → A: On
  the cart the bottom navigation is replaced by a fixed "Place order · ₹total" bar; a back control
  returns to browsing.
- Q: When an element moves, may an existing end-to-end test change how it finds that element? → A:
  Yes, only how a test finds an element; what it checks stays the same, and every such edit is
  listed in the plan and the commit.
- Q: How are the layout rules verified? → A: Both: new automated checks on the six reference
  screens at 360 and 390 px in both languages plus the board at 1280 px, and a screenshot set for
  review. The capture is repeatable and kept in the repository with the tests, because the planning
  session uses the same set for its reviews.
- Owner notes: the text app name as wordmark is fine for now; each direction may propose a simple
  mark beside it (a later feature needs an app icon), not required. Every direction shows at least
  two of its six mockup screens in Kannada, because the type pairing is the biggest risk.

## User Scenarios & Testing *(mandatory)*

This feature changes how every screen looks and is arranged, not what any screen does. Each story
below is a surface or a cross-cutting quality that can be redesigned, reviewed and shipped on its
own, with the 001 and 002 behaviour (and their tests) unchanged.

### User Story 1 - Customer orders through a calmer, finished-looking app (Priority: P1)

A customer on a typical phone (390–430 px wide) opens the app, finds a kitchen through the list or
the search box, adds dishes and places a cash order. The screens look like a finished product:
pictures and icons where they help, clear hierarchy, comfortable spacing that uses the width of a
normal phone, and a single navigation bar at the bottom that also carries the cart and any ongoing
order. Nothing stacks on top of the content the customer is reading.

**Why this priority**: The customer path is the demo's opening and the screen most people will
judge the product by; it also has the most visible layout problems today (two header rows plus a
cart bar plus an ongoing-order strip).

**Independent Test**: At 390 px and at 360 px, in English and in Kannada, go from home to a placed
cash order in four taps; check that the top of the screen carries at most one bar, the bottom at
most one, and that search suggests names while typing.

**Acceptance Scenarios**:

1. **Given** a customer on the home screen with an empty cart and no ongoing order, **When** the
   screen loads, **Then** there is one slim top bar (brand and language) and one bottom
   navigation bar, and no other fixed bar.
2. **Given** a customer with items in the cart, **When** they browse home or a kitchen page,
   **Then** the Cart tab shows the item count and running total (updated as dishes are added),
   there is no separate in-page cart bar, and one tap opens the cart.
3. **Given** a signed-in customer with an ongoing order, **When** they are on any customer screen
   other than that order's page, **Then** the Orders tab shows the order's current status and one
   tap opens that order, without an extra stacked strip.
4. **Given** the home screen, **When** the customer types at least two letters of a kitchen or
   dish name (in either language), **Then** matching kitchen and dish names are suggested below
   the box while typing; choosing a kitchen opens it, and choosing a dish opens its kitchen
   scrolled to that dish.
5. **Given** a kitchen page, **When** it opens, **Then** the kitchen name, its badges (type, pure
   veg, open or closed) and the delivery estimate sit together in a compact header, and the
   address and opening hours are collapsed until the customer expands them.
6. **Given** the cart, **When** it opens, **Then** lines, bill, address and payment read as
   distinct, clearly ordered sections; the bottom navigation is replaced by a fixed
   "Place order · ₹total" bar, and a back control returns to browsing.
7. **Given** an order page, **When** it opens, **Then** status, expected time, timeline and map
   are arranged so the current status is the first thing read.
8. **Given** a screen with nothing to show (no kitchens match, empty cart, no orders, no
   messages), **When** it opens, **Then** it shows an illustrated empty state with one next step.

---

### User Story 2 - Partner handles incoming orders at a glance (Priority: P1)

A kitchen partner keeps the app open during service. New orders stand out, each order card scans
in a second (number, status, time left or age, item count and total), and accepting, rejecting or
moving an order on takes little space and few taps. The order-sound prompt does not take over the
screen once sounds have been turned on.

**Why this priority**: The partner screen is the second half of the demo and is used under time
pressure; a slow-to-scan card or a long reject form costs orders.

**Independent Test**: As the partner of the seeded waiting order at 390 px, turn on sounds, then
accept one order and reject another with a reason, without scrolling inside the reject step.

**Acceptance Scenarios**:

1. **Given** a partner whose order sounds are off, **When** they open any partner screen, **Then**
   a prompt to turn on order sounds is shown; **after** the first tap that turns them on, the
   prompt becomes a compact pill showing the sound state and stays compact on later visits on that
   device.
2. **Given** the partner orders list, **When** it shows several orders, **Then** each card shows
   order number, status (icon and text), time left to answer or time since placed, item count,
   item total and payment method, with waiting orders visually first and distinct.
3. **Given** a waiting order, **When** the partner chooses to reject it, **Then** the reasons are
   offered as compact choices and the reject and back actions fit on one screen at 390×844
   without scrolling.
4. **Given** the partner's day view, menu, hours and kitchen screens, **When** they open, **Then**
   they use the same theme, card and action language as the orders screen.

---

### User Story 3 - Admin dispatches from a board that uses the screen (Priority: P2)

The admin, on a laptop or desktop, sees every order group side by side and can tell from each card
what dispatch needs to know: order number, kitchen, delivery area or landmark, status and how long
it has been in it, total and payment method, and the assigned agent if any. Assigning or
reassigning an agent happens on the card.

**Why this priority**: Dispatch is the step that links partner and agent in the demo; it works
today but the columns are narrow and cards need opening.

**Independent Test**: At 1280 px wide, open the board with the seeded orders and assign an agent to
the order needing one without opening it or scrolling sideways.

**Acceptance Scenarios**:

1. **Given** the board at 1280 px or wider, **When** it loads, **Then** all order groups are
   visible side by side without horizontal scrolling, each with its count.
2. **Given** an order card on the board, **When** the admin reads it, **Then** it shows the fields
   listed above, with status time shown as elapsed time.
3. **Given** the other admin screens (partners, menus, hours, agents, order detail), **When** they
   open, **Then** they share the board's theme, tables and forms language.

---

### User Story 4 - Agent works with the same cards and actions as the partner (Priority: P2)

A delivery agent sees today's count and cash, and their assigned orders as cards in the same visual
language as the partner's, with pickup and delivery clearly separated on the order page and the
next action (picked up, delivered, collect cash) as the one obvious button.

**Why this priority**: The agent closes the demo loop; consistency with the partner screen means
one set of patterns for the people who run the town's operations.

**Independent Test**: As the agent holding the seeded ready order at 390 px, open it, open the
delivery location in maps, mark it picked up and delivered with cash confirmed.

**Acceptance Scenarios**:

1. **Given** the agent home, **When** it opens, **Then** today's deliveries and cash are shown as
   two clear figures above the order cards.
2. **Given** an agent order page, **When** it opens, **Then** pickup (kitchen) and delivery
   (customer address, landmark, voice note) are visually separate sections, each with its call and
   open-in-maps actions, and the single next step is the primary button.

---

### User Story 5 - One coherent look in both languages (Priority: P2)

Every screen on every surface, including sign-in, account, addresses, messages, menu and hours
editors, and admin forms, uses one theme: the same colours, type sizes, spacing, corner radius and
elevation, and one type family whose Kannada and Latin letters feel like a pair. Kannada text is
never clipped, crowded or set smaller than English.

**Why this priority**: A refresh that covers only the six demo screens leaves the rest looking like
the old app; parity between the two languages is a constitutional rule.

**Independent Test**: Switch to Kannada and visit every route of each surface at 360 px (admin at
1280 px); no text is clipped or overlapping and every screen uses the shared theme.

**Acceptance Scenarios**:

1. **Given** any screen, **When** viewed in Kannada and then in English, **Then** both use the
   same layout without clipping, overflow or overlapping text.
2. **Given** a state shown by colour (open or closed, veg or non-veg, order status, errors),
   **When** it is displayed, **Then** it also carries text or an icon or shape that conveys the
   same meaning.
3. **Given** a user who has asked their phone to reduce motion, **When** sheets, strips or
   transitions would animate, **Then** they appear without animation.

---

### User Story 6 - Loading, empty, error and not-found states look intentional (Priority: P3)

Wherever content is loading, missing, failed or not found, the user sees a designed state in the
selected language: placeholders shaped like the content while loading, an illustration and one
next step when empty, a plain-language message and retry when something failed.

**Why this priority**: Required by the constitution already; this story brings those states up to
the new look rather than adding behaviour.

**Independent Test**: Throttle the network and open the home, kitchen, partner orders and admin
board screens; force an empty list and a not-found order on each surface.

**Acceptance Scenarios**:

1. **Given** a slow connection, **When** a list or detail screen is loading, **Then** placeholders
   in the shape of the coming content appear, and the real content replaces them without moving
   the rest of the page.
2. **Given** an error or not-found page on any surface, **When** it shows, **Then** it uses the
   surface's navigation and theme and offers a way back.

---

### Edge Cases

- Long names: kitchen and dish names at their maximum length, in Kannada, on cards, the cart and
  the board, wrap or truncate with the full name still available; never overlap badges or prices.
- A partner-authored name missing in the selected language keeps its fallback marker in the new
  design.
- 360 px with the phone's text size raised one step: content reflows; nothing is cut off
  horizontally.
- Cart and ongoing order at the same time: the Cart tab shows the cart and the Orders tab shows
  the ongoing order, side by side, neither hiding the other.
- Long totals or Kannada tab labels at 360 px: the four tabs keep their 48 px targets; the Cart
  tab's total stays legible (labels may shorten, the total does not disappear).
- Empty cart screen: there is nothing to place, so it shows the empty state with the normal bottom
  navigation instead of the place-order bar.
- The ongoing order finishes while the customer is browsing: the bottom navigation stops showing
  it on the next refresh without the layout jumping.
- An order page for the ongoing order itself does not also advertise that order in the navigation.
- Search suggestions with no match: the box says so rather than showing an empty list; on a slow
  connection, typing is never blocked.
- Images that fail to load or kitchens without photos keep the existing placeholders, restyled.
- The map failing to load tiles (offline, provider down) still shows a framed area with the
  markers' labels, and the open-in-maps action on the screens that have it (agent).
- Admin at widths between 1024 and 1280 px: the board remains usable (columns may scroll sideways);
  below 1024 px admin is not a design target.
- Tablet widths (600–1024 px) on customer, partner and agent: content does not stretch into
  unreadably wide lines; lists may use two columns.
- Sound pill on a device where the browser blocks sound again after reload: the pill shows that
  sound needs a tap, without returning to the full-size prompt.

## Requirements *(mandatory)*

### Functional Requirements

**Guardrails (behaviour unchanged)**

- **FR-001**: Every behaviour specified in 001 and 002 MUST stay as specified: same routes, same
  data shown and accepted, same validation, same permissions, same states and transitions.
- **FR-002**: The existing unit, integration and end-to-end tests MUST pass at the end of this
  feature. When an element moves (for example the cart link moving from the header into the bottom
  navigation), an end-to-end test MAY change only how it finds that element; what it checks MUST
  stay the same, and every such edit MUST be listed in the plan and in the commit that makes it.
- **FR-003**: Interface text keys MAY be added; existing keys MUST NOT be renamed. A key the new
  design no longer uses MAY be removed only from both languages together.
- **FR-004**: A customer MUST still be able to go from the home screen to a placed cash-on-delivery
  order in four taps (open kitchen, add dish, open cart, place order) when a saved address and the
  last payment choice are preselected.
- **FR-005**: No copy changes beyond what the new layout needs (for example a shorter label in a
  pill or a navigation tab); each changed or new string exists in both languages.

**Theme and type**

- **FR-006**: All four surfaces MUST use one shared theme: a named colour palette (including the
  meaning colours for open, closed, veg, non-veg, warning, danger and each order status), a type
  scale, a spacing scale, corner radii and elevation levels, defined once and used by every screen.
  Light theme only.
- **FR-007**: One type family MUST be used whose Kannada and Latin letters are designed to match in
  weight and proportion; Kannada MUST NOT be rendered smaller than the Latin text beside it. Fonts
  MUST be served by the app itself, with no request to an outside font service when a page loads.
- **FR-008**: Icons MUST be used wherever they carry meaning (navigation, statuses, actions,
  payment method, call, maps, time), always alongside a text label or an accessible name; custom
  drawings MUST be used where no standard icon fits (veg and non-veg marks, kitchen and delivery
  map pins, empty-state illustrations).
- **FR-009**: Colour MUST never be the only carrier of meaning; every coloured state also has text,
  an icon or a shape.
- **FR-010**: Motion MUST be limited to purposeful transitions (sheets, strips, navigation
  feedback, pill collapse) each finishing in under 200 ms, MUST NOT shift surrounding content, and
  MUST be skipped when the user's device asks for reduced motion.
- **FR-011**: Layouts MUST be designed for 390–430 px wide phones first, stay fully usable at
  360 px, use tablet widths with readable line lengths (lists may become two columns), and design
  the admin surface for 1280 px and wider. Every tap target MUST be at least 48 by 48 px.

**Customer**

- **FR-012**: The home search MUST suggest matching kitchen and dish names, in either language,
  while the customer types (from the second character), using the same matching rules as the
  existing search. Choosing a kitchen suggestion MUST open that kitchen; choosing a dish
  suggestion MUST open its kitchen scrolled to that dish. Submitting the box without choosing a
  suggestion runs the existing search. The existing search results, clear control and URL-kept
  query and filters MUST keep working.
- **FR-013**: Customer screens MUST have one slim top bar (brand, language switch) and one bottom
  navigation bar with four tabs: Home; Orders, which shows the ongoing order's current status when
  there is one; Cart, which shows the item count and running ₹ total; and Account, which holds
  Messages and Addresses. No other bar may be fixed to the screen at the same time; the in-page
  cart bar and the ongoing-order strip are replaced by these tabs, including on the kitchen page.
- **FR-013a**: On the cart screen the bottom navigation MUST be replaced by a fixed
  "Place order · ₹total" bar, with a back control that returns to browsing; this is the only
  screen where the bottom navigation is replaced.
- **FR-014**: The kitchen page header MUST place the kitchen name, its badges and the delivery
  estimate together in a compact block; address and opening hours MUST be collapsible and
  collapsed by default; call and open/closed information stay visible.
- **FR-015**: Kitchen cards on home and search MUST show photo, name, badges, open state and
  delivery estimate in a layout that shows more than one card on a 390×844 screen.
- **FR-016**: Cart, order page, orders list, messages, account, addresses and sign-in screens MUST
  be redesigned in the shared theme with clear section hierarchy and one obvious next step.

**Partner**

- **FR-017**: The order-sound prompt MUST collapse to a compact pill after the first tap that turns
  sounds on, remembered on that device; the pill shows whether sounds are on or need a tap.
- **FR-018**: Partner order cards MUST show order number, status with icon, time left to answer
  (waiting orders) or time since placed, item count, item total (the amount partners see today,
  not the grand total) and payment method; waiting orders MUST be visually distinct and listed
  first, as today.
- **FR-019**: The reject step MUST present reasons as compact choices and keep the reasons, the
  optional note and both actions within one 390×844 screen.

**Admin**

- **FR-020**: The dispatch board MUST show every order group side by side at 1280 px and wider
  without horizontal scrolling, each group with its count.
- **FR-021**: Each board card MUST show order number, kitchen, delivery area or landmark, status
  and elapsed time in it, grand total, payment method and assigned agent (or that one is needed),
  with assign and reassign on the card as today.

**Agent**

- **FR-022**: Agent order cards and actions MUST use the same card, status and button design as the
  partner surface; today's deliveries and cash MUST appear as two prominent figures on the agent
  home.
- **FR-023**: The agent order page MUST separate pickup and delivery into distinct sections, each
  with its call and open-in-maps actions, and present the single next step as the primary action.

**States**

- **FR-024**: Every list and detail screen MUST show content-shaped placeholders while loading that
  are replaced without moving the rest of the page; every empty list MUST show an illustration,
  a short message and one next step where one exists; error and not-found pages MUST use the
  surface's theme and navigation and offer a way back. No permanent spinner or blank screen.

**Verification**

- **FR-027**: New automated checks MUST cover the layout rules on the six reference screens at 360
  and 390 px in both languages, and on the admin board at 1280 px: no sideways scrolling, tap
  targets of at least 48 by 48 px, at most one fixed bar at the top and one at the bottom, and the
  four-tap cash order path. They run with the existing test suites on every gate.
- **FR-028**: A repeatable screenshot capture MUST produce the review set (every customer, partner
  and agent screen at 360 and 390 px, admin screens at 1280 px, in both languages, from a fresh
  demo reset) and MUST be kept in the repository with the tests, so the owner and the planning
  session review the same set.

**Design exploration (before planning)**

- **FR-025**: Before planning, two or three distinct design directions MUST be produced as static
  mockups of six screens (home, kitchen, cart, order page, partner orders, admin board), using real
  seeded kitchens and dishes, with phone screens at 390 px and the admin board at 1280 px, each
  direction with a one-paragraph rationale covering palette, type pairing, density and how it
  solves the known layout problems. Each direction MUST show at least two of its six screens in
  Kannada, because the Kannada and Latin type pairing is the feature's biggest risk. Each direction
  uses the text app name as a wordmark and MAY propose a simple mark beside it (a later feature
  needs an app icon); a mark is not required.
- **FR-026**: The owner picks one direction (possibly with edits); planning MUST start only after
  that choice, and the chosen direction becomes the reference for every screen in this feature.

### Text Categories

Per Constitution Principle II, every new kind of text in this feature belongs to one category. Text
already categorised in 001 and 002 keeps its category.

| Text | Category | Behaviour |
|---|---|---|
| Bottom navigation labels, cart and ongoing-order summaries in the navigation, sound pill text, address-and-hours expanders, search suggestion headings and "no suggestions" text | Interface string | Translated via keys; both languages required |
| Empty-state, loading and error messages added or reworded for the new layout | Interface string | Translated via keys |
| Accessible names for icon-only controls and illustrations | Interface string | Translated via keys; announced by screen readers in the selected language |
| Kitchen and dish names in suggestions, cards and headers | Partner-authored content | Language pair; fallback to the other language with the visible marker |
| Brand name in the top bar | Proper noun / brand name | Not translated |
| Counts, totals, elapsed and remaining times in cards and navigation | System formatting | `kn-IN` / `en-IN` locale, Latin digits, ₹ symbol |

### Integration Fidelity

Per Constitution Principle III and `docs/fidelity-matrix.md`: this feature changes no integration.
Every row stays as 001 and 002 left it (UPI and SMS/WhatsApp remain declared stand-ins and keep
their visible demo labels in the new design). Map tiles and address lookup are unchanged.

| Capability | Status in this feature | Notes |
|---|---|---|
| Theme, fonts, icons, illustrations | Real | Served by the app; no outside service |
| Search suggestions | Real | Uses the app's own kitchen and dish data |
| All 001/002 capabilities | Unchanged | Demo labels on stand-ins stay visible in the new design |

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All tests that pass on `main` before this feature (350 unit and integration, 31
  end-to-end) pass at its end.
- **SC-002**: A customer goes from the home screen to a placed cash order in four taps at 360 px
  and at 390 px, in both languages.
- **SC-003**: At 360, 390 and 430 px widths, no customer, partner or agent screen scrolls sideways
  in either language; at 1280 px, the admin board shows every order group without sideways
  scrolling.
- **SC-004**: On customer screens at 360×780, fixed bars (top and bottom together) take no more
  than 18% of the screen height, and never more than one bar at the top and one at the bottom.
- **SC-005**: On the six reference screens, every tap target measures at least 48×48 px.
- **SC-006**: Body text meets a 4.5:1 contrast ratio against its background, and large text and
  meaningful icons meet 3:1, across the palette.
- **SC-007**: On the partner orders screen at 390×844, at least three order cards are fully visible
  without scrolling.
- **SC-008**: Search suggestions appear within 1 second of typing the second letter on an ordinary
  mobile connection.
- **SC-009**: After a screen has displayed, its content does not jump when images, fonts or
  refreshed data arrive (no visible layout shift on the six reference screens).
- **SC-010**: Every transition finishes in under 200 ms, and none plays when reduced motion is
  requested.
- **SC-011**: The owner signs off one design direction, and in the final walkthrough judges the six
  reference screens on both phone and desktop as matching it.

## Assumptions

- "No new business behaviour" allows presentation-only additions the brief asks for: search
  suggestions, collapsible kitchen details, the sound pill, and moving cart and ongoing-order
  access into the bottom navigation. None changes what data is stored or what any role may do.
- Existing interface keys that fall out of use may be removed from both languages together; no key
  is renamed. Machine-drafted Kannada for new keys follows the 001 rule (marked pending native
  review).
- The demo panel on sign-in screens is restyled but keeps its trimmed content ("Demo only",
  accounts, the fixed code).
- Admin is designed for 1280 px and wider and remains usable from 1024 px; smaller admin widths are
  not a target, as today.
- The visible language switch stays on every screen (Constitution Principle II); on customer
  screens it lives in the slim top bar.
- Performance budgets are not a gate for this feature; pages keep the 001 defaults (server-rendered,
  lazily loaded images) and no animation library is added.
- Dark mode, new features and copy rewrites are out of scope.
- The design mockups are review artefacts kept with the spec; they are not shipped with the app.
