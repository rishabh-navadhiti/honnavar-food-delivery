# Design exploration brief (003 visual refresh)

Shared brief for every direction. Each direction is a static HTML mockup set under
`specs/003-visual-refresh/design/<direction>/`. Mockups are review artefacts, not product code.

## Read first

- Spec: `specs/003-visual-refresh/spec.md` (Clarifications, US1–US6, FR-006 to FR-026). The
  clarified answers are binding: four-tab customer bottom nav (Home · Orders with ongoing-order
  status · Cart with count and running ₹ total · Account holding Messages and Addresses); no in-page
  cart bar; on the cart screen the bottom nav is replaced by a fixed "Place order · ₹total" bar
  with a back control; search suggestions while typing (kitchen → opens kitchen, dish → opens its
  kitchen at that dish); kitchen header with name + badges + delivery estimate together, address
  and hours collapsed; partner sound prompt collapses to a pill; compact reject reasons; admin
  board with every group side by side at 1280 px.
- Today's screens (what we are replacing): `../planning/review/002-screens/*.png` relative to the
  repo root, i.e. `/Users/rish/Development/Honnavar Food Delivery/planning/review/002-screens/`.
  Notes: `/Users/rish/Development/Honnavar Food Delivery/planning/review/002-review.md`.
- Real content: `seed/catalogue.json` (kitchens with en/kn names, type, pureVeg, prepMinutes,
  landmark, categories, dishes with en/kn names, prices, veg flag, image file; seeded orders).
  Photos: `seed/images/<kitchen-key>.jpg` and `seed/images/<kitchen-key>--<dish-key>.jpg`.
  Reference them from a mockup at `design/<direction>/<screen>.html` as
  `../../../../seed/images/<file>.jpg` (do not copy images).
- Real interface text: `src/shared/i18n/messages/en.json` and `kn.json`. Use the existing strings
  wherever a screen element already exists (namespaces such as nav, home, kitchen, search, cart,
  checkout, orderPage, timeline, orderStatus, partnerOrders, alert, orderReason, dispatch,
  dispatchGroup, paymentMethod, kitchenType, kitchenState, veg). New strings (tab labels, pill,
  expanders, suggestions) may be drafted; draft Kannada for them carefully and mark nothing as
  final.
- Current theme and components for reference only: `src/app/globals.css`, `src/shared/ui/`,
  `src/features/*/components/`.

## The six screens (each direction makes all six)

| File | Width | Must show |
|---|---|---|
| `home.html` | 390 | Slim top bar (wordmark, language switch), search box, filter chips, dish filter, kitchen cards with photo/name/badges/open state/delivery estimate, bottom nav with Cart tab showing count + ₹ total and Orders tab showing an ongoing order status. A second frame on the same page: the search box with suggestions open after typing two letters (kitchens and dishes, en). |
| `kitchen.html` | 390 | Compact header (name, badges, delivery estimate, call), collapsed address + hours expander, category sections, dish rows with photo, veg mark, price, Add and the quantity stepper state on one dish; bottom nav Cart tab with running total. |
| `cart.html` | 390 | Lines with steppers, bill (item total, delivery fee ₹30, grand total), saved address chosen, payment choice (UPI demo / Cash on delivery), fixed "Place order · ₹total" bar replacing the nav, back control. |
| `order.html` | 390 | Ongoing order: order number, current status first, "Expected by", timeline, map frame with kitchen and delivery pins (draw a stylised map, no tiles), items and bill, payment label, call kitchen. |
| `partner-orders.html` | 390 | Partner orders list: sound pill (collapsed state) plus, in a second frame, the first-time full prompt; waiting order card highlighted with time left; accepted / preparing / ready cards; one card scannable in a second (number, status icon+text, time, item count, item total as partners see today, payment). A third frame: the reject step with compact reason choices, optional note, Reject and Back within 390×844. |
| `admin-board.html` | 1280 | Dispatch board, five groups side by side with counts (use `dispatchGroup` names), cards with number, kitchen, area/landmark, status + elapsed time, total, payment, agent or "needs agent" with assign control; admin top/side navigation. |

**Kannada:** every direction shows `kitchen.html` and `partner-orders.html` in **both** English and
Kannada (two frames side by side, or a language toggle in the mockup that swaps text). These are
the type-pairing proof. Use real `kn.json` strings and the real Kannada kitchen and dish names.

Also make `index.html` for the direction: the rationale paragraph, the token sheet (palette swatches
with names and hex, type scale shown in both scripts, spacing scale, radii, elevation levels, icon
set sample, veg/non-veg marks, the two map pins, one empty-state illustration), an optional simple
mark beside the wordmark, and links to the six screens. Optionally one 360 px frame of home to show
it still fits.

## Hard rules (from the spec and constitution)

- Light theme only. One shared set of tokens as CSS custom properties in `tokens.css` per
  direction, used by every screen in that direction.
- Phone frames 390 px wide (CSS px), about 844 px tall, drawn with a thin device outline on a
  neutral page so several frames sit side by side. Content must also fit 360 px without sideways
  scroll.
- Tap targets ≥ 48×48 px. Body text contrast ≥ 4.5:1, large text and meaningful icons ≥ 3:1.
- Colour never alone: every status/veg/open state has text or an icon/shape as well.
- Kannada never smaller than Latin beside it; check line height for Kannada (it needs more).
- Icons: Lucide. In mockups, load `https://unpkg.com/lucide@latest` and call
  `lucide.createIcons()`, or inline the SVGs. Custom SVG for veg/non-veg marks (Indian convention:
  square outline with a filled circle for veg; for non-veg a filled triangle), map pins, empty
  states.
- Fonts: may load from Google Fonts in the mockup (the product will self-host). Use the font
  pairing assigned to your direction.
- Motion: describe it (it can be shown with CSS transitions under 200 ms); no animation library.
- Fixed chrome on customer screens: one top bar and one bottom bar only; together ≤ 18% of a
  360×780 screen (≈ 140 px).
- Partner orders at 390×844: at least three order cards fully visible without scrolling.
- Use real kitchens and dishes from the catalogue (pick open ones with photos); prices from the
  catalogue; delivery fee ₹30; order numbers like #1042.
- No new features: nothing on a screen that 001/002 do not already do, except the clarified items
  above. Keep the "Demo" labels on the UPI stand-in ("Paid by UPI (demo)") visible.

## Deliverable

`design/<direction>/` containing `index.html`, `tokens.css`, the six screen files and any small
SVGs. Each file opens directly from disk in a browser. Keep it hand-written HTML/CSS; no build
step, no framework. End with a one-paragraph rationale (also at the top of `index.html`) covering
palette, type pairing, density, and how the direction solves the known layout problems.
