# Research: Visual Refresh (003)

Decisions for the plan, each with rationale and alternatives. The visual reference is Direction A
"Coast" (`design/a-coast/`) with the owner's five edits (spec Clarifications, 2026-10-16). Where the
mockup and an owner edit disagree, the edit wins; `design/a-coast/index.html` lists which edits are
drawn and which are decided but not drawn.

## R1. Theme tokens as Tailwind 4 `@theme` variables

**Decision**: Move the Coast tokens (`design/a-coast/tokens.css`) into the existing `@theme` block
in `src/app/globals.css`, keeping today's token names and changing their values, and adding the
groups the mockup introduces:

| Group | Tailwind namespace | Examples (value from Coast) |
|---|---|---|
| Brand and neutrals (kept names) | `--color-*` | `primary` #b8461a, `primary-strong` #9c3512, `ink` #2b1b12, `muted` #5c4a3e, `line` #ece2d5, `page` #faf4ea, `surface` #fff |
| Secondary | `--color-sea`, `--color-sea-soft` | #0e6e67, #dff2ef (call, map, delivery cues only) |
| Meaning | `--color-{open,closed,veg,nonveg,warn,danger}` + `-soft` tints | open #18794e, nonveg #8f3b1b, danger #b42318 |
| Order status | `--color-status-{placed,accepted,preparing,ready,picked,delivered,rejected,cancelled}` + `-soft` | text colour ≥ 4.5:1 on its tint |
| Type scale | `--text-{caption,small,body,heading,title,display}` with paired `--line-height` | 13/14/16/18/22/28 px |
| Radii | `--radius-{xs,sm,md,lg,xl}` | 6/10/14/18/24 px; pills use `rounded-full` |
| Elevation | `--shadow-{1,2,3,bar}` | warm layered shadows from the mockup |
| Sizes | `--spacing-touch` (kept, 48 px), `--spacing-topbar` 56 px, `--spacing-tabbar` 72 px, `--spacing-placebar` 76 px | |
| Motion | `--duration-fast` 120 ms, `--duration-base` 180 ms, `--ease-out-soft` | |

Spacing stays on Tailwind's 4 px scale (the Coast spacing tokens are exactly that scale), so no
custom spacing tokens beyond the bar heights. Kannada line heights are applied with
`:lang(kn)` rules on the base text styles (Coast: body 1.62, headings 1.42), so components never
branch on locale.

**Owner edit 2** is enforced by the token set itself: status and group colours exist only as
text-and-tint pairs used by the status chip and the group icon; no component uses them for borders,
rails or bars. A unit test over `globals.css` is not worth it; the review screenshot set (R14) and
code review cover it.

**Rationale**: Keeping the existing names (`primary`, `ink`, `muted`, `line`, `veg`, …) means most
current class names keep working, which keeps the restyle a value change for many components and
avoids touching files that only need the new colours. Tailwind 4 reads `@theme` variables as both
utilities and plain CSS variables.

**Alternatives**: A separate `tokens.css` imported before Tailwind (two places to look); renaming
every token to the mockup's names (`tile-600`, `sea-600`) and rewriting every class (large churn for
no user benefit).

## R2. Anek Kannada, self-hosted with `next/font`

**Decision**: Replace Noto Sans and Noto Sans Kannada in `src/app/layout.tsx` with one
`next/font/google` call: `Anek_Kannada({ subsets: ['kannada', 'latin'], axes: ['wdth'], display:
'swap', variable: '--font-anek' })`. The variable font covers weights 100–800 and widths 75–125; the
theme uses three widths as in the mockup (100 reading, 87.5 headings and prices, 80 dense labels on
tabs and board cards) via `font-stretch`. `--font-sans` becomes `var(--font-anek), ui-sans-serif,
system-ui, sans-serif`. A system Kannada face remains the fallback for any glyph outside the subset.

**Rationale**: `next/font/google` downloads the files at build time and serves them from the app's
own origin, so no page load requests an outside font service (FR-007), and it sets size-adjusted
fallbacks that limit layout shift while the font loads (SC-009). Anek Kannada was drawn for Kannada
and Latin together, which is the owner's chosen answer to the pairing risk. Next 16's font data
lists Anek Kannada with `kannada`, `latin` and `latin-ext` subsets and the `wdth` and `wght` axes.

**Alternatives**: `next/font/local` with committed WOFF2 files (works offline at build time, but adds
binaries and a licence file to maintain; 001 already builds with `next/font/google`); keeping Noto
for body text (rejected with Directions B and C).

**Note**: As today, `npm run build` needs network access to fetch the font once per clean build.

## R3. Icons: lucide-react plus custom SVGs

**Decision**: Add **lucide-react** (dependency, one line: "tree-shaken React icon components for the
Lucide set the design uses; replaces ad-hoc glyphs like × and →"). Import icons by name only. Every
icon is `aria-hidden` beside visible text, or carries an accessible name from a translation key when
it stands alone (icon buttons such as clear search, back, language). Custom SVG React components in
`src/shared/ui/icons/`: veg and non-veg marks (Indian convention: square outline with a filled
circle for veg, a filled triangle for non-veg; replaces `veg-mark.tsx` glyphs), the Coast mark, and
empty-state illustrations (empty cart, no orders, no messages, no kitchens match, not found).
Map pins in `src/shared/maps/icons.ts` are redrawn to the Coast kitchen and delivery pins.

**Rationale**: Lucide is the set the design brief names and the mockups use; lucide-react 1.x
declares React 19 as a supported peer. Named imports ship only the icons used.

**Alternatives**: Inline SVG copies of Lucide icons (no dependency but hundreds of lines to
maintain); an icon font (accessibility and layout-shift problems).

## R4. Motion in CSS only

**Decision**: Transitions use the motion tokens (R1) on `transform`, `opacity` and `background-color`
only, never on properties that move layout. Uses: bottom sheet entrance (reject step, UPI demo
sheet), the address-and-hours expander chevron, the sound prompt collapsing to the pill (opacity and
transform on an element whose space is already reserved), tab and chip press feedback, and the
`:target` tint on a dish opened from a suggestion. A global
`@media (prefers-reduced-motion: reduce)` rule sets the duration tokens to 0 ms. No animation
library.

**Rationale**: FR-010 and SC-010: under 200 ms, no layout shift, skipped on request. Transform and
opacity are compositor-only and cheap on low-end phones.

**Alternatives**: View Transitions API (newer, uneven on older Android Chrome); an animation
library (forbidden by the brief).

## R5. Customer bottom navigation with live cart and order state

**Decision**: A server component `CustomerTabBar` replaces `CustomerDock` on every customer page
that renders the dock today (home, kitchen, cart, orders, order page, messages, account, addresses).
Each page passes its context (`current` tab, the order id on an order page, `cart` page flag). The
bar reads, per request, the cart view (count and item total, as the cart bar does today) and the
ongoing order (as the strip does today), and renders four fixed-position tabs:

- **Home**.
- **Orders**: with an ongoing order (and not on that order's page), the label reads
  "Orders · <status>" and the link opens that order; otherwise it opens the order list.
- **Cart**: with items, "Cart · ₹<item total>" and a count badge; otherwise "Cart".
- **Account**: account, with Messages and Addresses reached from it.

Labels are two lines (word above, state below) inside a fixed-height bar (`--spacing-tabbar`,
72 px), so a state appearing or disappearing never changes the bar's height (no layout shift). The
active tab is marked with `aria-current`, weight and a filled icon tile, not colour alone. Pages add
bottom padding equal to the bar so content is never hidden behind it. The slim top bar (wordmark and
language switch) moves into the customer layout; the second header row is removed.

Freshness is unchanged from 002: the bar is re-rendered on every navigation and every server
action's revalidation, and on pages that already poll (`LiveRefresh` on the order page). Error and
not-found pages (client components) render the same bar without live state.

**Test hooks kept (FR-002)**: the Cart tab link keeps `data-testid="header-cart"`; its count-and-
total summary carries `data-testid="cart-bar"` and includes the existing "{count} items" text for
screen readers; the Orders tab's ongoing state carries `data-testid="ongoing-strip"` and includes
the order number in its accessible text. Existing assertions therefore keep finding the same
information in its new place.

**Rationale**: Rendering the bar per page (as the dock is today) keeps it server-rendered with no
new client fetching or endpoint, and keeps today's freshness rules. A layout-level bar would not
re-render on client navigation (App Router keeps shared layouts), so its cart and order state would
go stale.

**Alternatives**: A client tab bar fed by a new JSON endpoint and polling (more client code, a new
route, and a loading flicker on first paint); a layout-level server bar (stale state, see above).

## R6. Cart screen: the place-order bar replaces the tab bar

**Decision**: On `/cart` with items, `CustomerTabBar` renders nothing and the checkout form renders a
fixed bottom bar (`--spacing-placebar`, 76 px) holding the primary action: "Place order · ₹<grand
total>" for a signed-in customer (the existing submit button, inside the form), or the existing
"Sign in to check out" link for a guest. The back link in the top bar returns to the kitchen (the
fixed parent rule from 002). With an empty cart, the normal tab bar shows with the empty state.

**Rationale**: FR-013a. Keeping the submit button inside the existing form keeps the 002 behaviour
(double-tap guard, UPI sheet, seen prices) untouched; only its position changes. The four-tap path
is open kitchen, Add, Cart tab, Place order.

**Alternatives**: A separate bar component posting the form by `form=` attribute (splits the
button from the form logic for no gain).

## R7. Search suggestions while typing

**Decision**: A GET route handler `/api/search/suggestions?q=` (Zod: `q` trimmed, 2–80 characters;
otherwise an empty result) calls the existing `searchForCustomer` with the visitor's dish filter
and locale, and returns at most 4 kitchens and 6 dishes as small JSON objects (id, name pair,
kitchen name pair for dishes, open state, price, veg flag, photo id). The `SearchBox` becomes a
client component: after the second character it waits 150 ms after the last keystroke, aborts any
earlier request, and shows the list under the box. A kitchen suggestion links to
`/kitchens/<id>`; a dish suggestion links to `/kitchens/<id>#dish-<dishId>`. Enter (or the Search
button) still submits the same GET form as today, so the existing results page, clear control and
URL-kept filters are unchanged, and the box works without JavaScript.

The input keeps the `searchbox` role; suggestions are a labelled list of links under it with a
polite live region announcing how many matched, rather than an ARIA combobox (which would change
the role existing tests and assistive technology rely on). Escape or clearing the box closes the
list. "No matches" is a single line, never an empty box.

**Latency (SC-008)**: the query is the same substring match over active kitchens and dishes (11
kitchens and about 90 dishes in the demo; 100 orders a day pilot scale). The 150 ms debounce plus
one small request on an ordinary mobile connection is well under 1 s; the handler sets
`Cache-Control: no-store` because results depend on open state.

**No new behaviour**: matching rules are exactly the existing search's (FR-012), via the same
function.

**Alternatives**: A server action (POST, not abortable as cleanly, not cacheable); shipping the
whole catalogue name list to the client (larger page, stale open state).

## R8. Kitchen page: compact header and scroll to a dish

**Decision**: Dish rows get `id="dish-<dishId>"` with `scroll-margin-top` equal to the top bar plus
a gap, so `#dish-…` lands below the fixed bar, and a CSS `:target` tint that fades (R4) marks the
dish. No JavaScript. The header card holds name, type and pure-veg badges, open state with closing
time, delivery estimate and call; address and hours sit in a native `<details>` element closed by
default (keyboard and screen-reader accessible, no JavaScript).

**Rationale**: Native fragment navigation and `<details>` are the lightest correct tools and work
on slow phones before hydration.

**Alternatives**: Client-side scroll with `scrollIntoView` (needs JS and a hydration wait).

## R9. Partner sound pill

**Decision**: Keep the 002 sound unlock exactly (per-tab memory that sound was turned on). Add one
device-level flag in `localStorage` (`hfd_alert_prompt_seen`) set on the first tap that turns sound
on. With the flag set, the prompt renders as a compact pill beside the page title: "Sounds on"
when sound is on in this tab, or "Tap for sound" (a button that does the same unlock) when the
browser needs a new tap after a reload. Without the flag, the full prompt shows as today and keeps
`data-testid="sound-prompt"`; the pill has `data-testid="sound-pill"`. Storage access is guarded as
in `alert-storage.ts`; if storage is blocked the full prompt shows, as today.

**Rationale**: FR-017 asks for the pill "remembered on that device"; browsers require a fresh tap to
play sound after a reload, which the pill's second state covers without the full-size prompt.

**Alternatives**: A cookie (sent with every request for a client-only preference).

## R10. Loading, empty, error and not-found states

**Decision**: Replace the generic `RouteLoading` with route-shaped skeletons in `loading.tsx` files
for the six reference routes plus the agent home and partner order page: each skeleton reserves the
same boxes as the real layout (header card, list rows of the real row height, tab bar placeholder),
so content replaces it without moving (SC-009). Other routes keep the shared skeleton, restyled.
Empty states use the new `EmptyState` with an illustration (R3), one message and one next step.
Error and not-found pages keep their messages and retry, restyled with the surface's top bar and
navigation (the customer tab bar without live state, R5). Pulse animation stops under reduced
motion.

**Rationale**: FR-024 and Constitution VII. Shaped skeletons are what prevent shift.

**Alternatives**: Spinners (forbidden as a permanent state and they shift layout on arrival).

## R11. Partner, agent and admin presentation

**Decision**:

- **Partner order card** (owner edits 3 and 5): number, status chip (icon and word), time left
  (waiting) or age, item count, **item total** (as today), payment label, customer display name,
  landmark and rider note (as today), dishes, then the one next action. The waiting order keeps
  its countdown as words; the countdown bar from the mockup stays only as a time-left indicator
  inside the card (functional, not decorative), with the time also in text.
- **Reject step**: a bottom sheet with reasons as a 2×2 grid of 48 px choices, the optional note,
  and Back and Reject side by side; same form, fields and validation as today.
- **Agent**: today's deliveries and cash as two figures; order cards reuse the partner card
  component's layout and status chip; the order page separates pickup and delivery sections with
  their call and open-in-maps actions; the next step is the primary button.
- **Admin**: navigation moves from the side column to a top bar so the board gets the full width;
  five equal columns at ≥ 1280 px with group icon, word and count; cards show number, status chip
  and minutes in status, kitchen, landmark, grand total, payment, and agent or "Needs agent" with
  assign/reassign on the card. No coloured column rules or card rails (owner edit 2). Between 1024
  and 1280 px the board keeps a 200 px column minimum and scrolls sideways (spec edge case).

**Rationale**: Mirrors the reference screens with the owner edits; no data or permission changes.

## R12. Kitchen rows on home and search (owner edit 1)

**Decision**: Kitchens are list rows: a 96 px square photo (Coast `radius-md`) on the left; name,
type badge, open state with closing or opening time, and delivery estimate on the right; landmark
on one line where it fits. Row height is fixed at the photo height plus padding so three rows fit
at 390×844 and four at 430×932 below the top bar, search box and filters (SC-007a), in both
languages. Closed kitchens keep their place and greyed photo with word and icon. The
`kitchen-card` test id and `data-kitchen-id` stay on the row.

**Rationale**: Owner edit 1, measured by SC-007a and the layout checks (R13).

## R13. Automated layout checks (FR-027)

**Decision**: A new end-to-end spec `e2e/visual-layout.spec.ts` in a new Playwright project
`layout` (Chromium, touch). For each reference screen (home, kitchen, cart with items, order page,
partner orders, admin board) it runs in English and Kannada (setting the existing `locale` cookie)
at 360×780 and 390×844 (board at 1280×800) and asserts:

1. No sideways scroll: `scrollWidth ≤ innerWidth` on the document.
2. Tap targets: every visible `a`, `button`, `summary`, `select`, `input` (except hidden inputs) and
   `[role=button]` has a bounding box at least 48×48, except links inside running text (`p`
   descendants), which WCAG exempts as inline targets.
3. Fixed chrome: at most one fixed or sticky element touching the top edge and one touching the
   bottom edge; on customer screens at 360×780 their heights sum to at most 18% of the viewport
   (SC-004).
4. Counts: three kitchens fully visible at 390×844 and four at 430×932 on home (SC-007a); three
   partner order cards at 390×844 (SC-007); every board group visible without sideways scroll at
   1280 (SC-003).
5. The four-tap path: from home, signed in with the seeded address and last payment, exactly four
   taps (kitchen, Add, Cart tab, Place order) reach a placed cash order, at 360 and 390 px.

It runs inside `npm run test:e2e`, so it is part of every gate. The checks are written as small
helpers in `e2e/layout.ts` so later features can reuse them.

**Rationale**: Owner answer Q5 (C): automated checks plus screenshots.

**Alternatives**: Visual snapshot diffs (brittle across fonts and data; screenshots are for human
review instead, R14).

## R14. Repeatable screenshot capture kept in the repo (FR-028)

**Decision**: `e2e/screens/capture.spec.ts` with its own config `playwright.screens.config.ts`
(same web server settings as the e2e config), run by a new script `npm run screens`. It resets the
demo data, signs in as each role using catalogue flags (never names), and visits every route of
each surface: customer, partner and agent at 360×780 and 390×844, admin at 1280×800, in English and
Kannada, with a fixed list of states (suggestions open, address-and-hours expanded, reject sheet
open, UPI sheet open, empty cart, sound prompt and pill). Images go to `screens/<surface>/<route>-
<width>-<locale>.png` (git-ignored), with an `index.html` contact sheet. It is not part of
`test:e2e`, so it never slows the gate; the planning session runs the same command for its reviews.

**Rationale**: Owner answer Q5 plus the note that the planning session reviews the same set.

**Alternatives**: A plain Node script with Playwright's library API (would duplicate the web server
and sign-in helpers the test runner already provides).

## R15. Existing e2e tests and locator edits (FR-002)

**Decision**: Keep every existing test hook on the element that now carries the same information
(R5, R9, R12): `header-cart`, `cart-bar`, `ongoing-strip`, `kitchen-card`, `kitchen-state`,
`sound-prompt`, `new-order-banner`, `dish-row`, `back-link`, `board-order`, `group-*`,
`message-list`; keep accessible names used by tests ("Search", "Clear search", "Sign in to check
out", "Orders", "Menu", "Messages", "My deliveries", "Profile", the language buttons, "Call …").
With that, one edit is expected:

| # | File | Lines | Today | Proposed | Why |
|---|---|---|---|---|---|
| E1 | `e2e/ordering-ongoing-strip.spec.ts` | 25–29 | Asserts the ongoing strip sits **above** the cart bar | Asserts both are visible and do **not overlap** | The old assertion encodes the stacked layout this feature removes (spec FR-013); "both reachable, neither hiding the other" is the spec's edge case. This changes an assertion, not only a locator, so it needs the owner's agreement under FR-002 |

Any further edit found during implementation is limited to how an element is found, listed in this
table and in the commit that makes it.

**Rationale**: FR-002 as clarified (Q4).

## R16. Interface text keys

**Decision**: Keys are added, none renamed. Expected new keys (both languages, Kannada
machine-drafted and listed in `machine-drafted.json` as in 001):

- `tabs`: `home`, `orders`, `cart`, `account`, `ordersWithStatus` ("Orders · {status}"),
  `cartWithTotal` ("Cart · {total}"), `cartCount` (accessible "{count} items").
- `kitchen`: `addressAndHours`, `closesAt`, `opensAt` (only if not already present).
- `search`: `suggestionsKitchens`, `suggestionsDishes`, `noSuggestions`, `allResultsFor`,
  `suggestionsCount` (live region).
- `alert`: `soundOnPill`, `tapForSoundPill`.
- `empty`: illustration alt texts and any reworded empty-state lines.
- `common`: `mark` (accessible name of the logo mark), `back` (if not present).

Keys the new design no longer uses (for example `cart.viewCart` from the old cart bar) are removed
from both files together, per FR-003, and listed in the commit. The parity test catches any
one-sided change.

**Rationale**: FR-003, FR-005, Constitution II.

## Dependencies added (one line each, per Principle VIII)

- `lucide-react`: tree-shaken icon components for the Lucide set the design uses (R3).

No other dependency. Anek Kannada replaces Noto through the existing `next/font` mechanism.
