# Implementation Plan: Visual Refresh

**Branch**: `003-visual-refresh` | **Date**: 2026-10-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/003-visual-refresh/spec.md` (Approved, with the design
pick). Visual reference: Direction A "Coast", [`design/a-coast/`](./design/a-coast/index.html), with
the owner's five edits (spec Clarifications).

## Summary

Restyle every screen of the four surfaces to the Coast direction without changing what any screen
does. The main changes, by surface:

- **Theme**: one set of Coast tokens (palette, type scale, radii, elevation, motion) in Tailwind 4's
  `@theme`, keeping today's token names so most classes keep working (R1).
- **Type and icons**: Anek Kannada for both scripts, self-hosted through `next/font` (R2), and
  Lucide icons plus custom SVGs for veg marks, map pins, the mark and empty states (R3).
- **Customer**:
  - One slim top bar and one four-tab bottom bar (Home, Orders · status, Cart · ₹total, Account),
    server-rendered per page like today's dock, so cart and order state stay fresh (R5).
  - On the cart, a "Place order · ₹total" bar replaces the tabs (R6).
  - Kitchens are list rows with 96 px photos (R12).
  - The kitchen page has a compact header with address and hours folded (R8).
  - Search suggests kitchens and dishes while typing, through one small route handler over the
    existing search (R7).
- **Partner**: the sound prompt collapses to a pill (R9), cards that scan in a glance keep the item
  total and the customer's name, landmark and rider note, and the reject step is a short sheet
  (R11).
- **Agent**: the partner card language, plus pickup and delivery sections (R11).
- **Admin**: a top bar, five full-width board columns, and cards with what dispatch needs (R11).
- **Everywhere**: shaped loading skeletons, illustrated empty states, and restyled error and
  not-found pages (R10).
- **Verification**: new automated layout checks join the e2e gate (R13), and a repeatable
  screenshot capture serves the owner's and the planning session's reviews (R14).

No database, service, permission or route behaviour changes. One new dependency (lucide-react) and
one small read-only route handler for suggestions.

## Technical Context

**Language/Version**: TypeScript 6.0 (strict) on Node.js 24 LTS (unchanged)

**Primary Dependencies**: the 002 stack (Next.js 16.4, React 19.3, Tailwind CSS 4, Drizzle 0.45,
Zod 4, next-intl 4, Leaflet 1.9.4, sharp) plus **lucide-react**
([research R3](./research.md#r3-icons-lucide-react-plus-custom-svgs)). Font: Anek Kannada through
`next/font/google`, replacing Noto Sans and Noto Sans Kannada (R2).

**Storage**: No changes. No migrations. One device-level `localStorage` flag for the partner sound
pill (R9).

**Testing**:
- Vitest unchanged: 350 unit and integration tests stay green.
- Playwright: the existing 31 e2e tests stay green. Assertion edits (R15): E1 and E2 approved by
  the owner.
- A new `layout` project runs `e2e/visual-layout.spec.ts`: 360 and 390 px (430 for the kitchen
  count), en and kn, the board at 1280 (R13).
- A separate `npm run screens` capture, not part of the gate (R14).
- Unit tests for the new pure helpers: tab-bar state and suggestion trimming.
- An integration test for the suggestions route handler.

**Target Platform**: Unchanged. Low-end Android Chrome at 360 px minimum, designed for 390–430 px;
admin designed for 1280 px or wider and usable from 1024 px.

**Project Type**: Web application (one Next.js codebase, four surfaces)

**Performance Goals**: No budgets for this feature (spec). Suggestions in under 1 s (SC-008); no
visible layout shift on the six reference screens (SC-009); every transition under 200 ms (SC-010).

**Constraints**:
- Behaviour, routes, data, validation and permissions unchanged (FR-001).
- Message keys added, never renamed (FR-003).
- Four taps to a placed cash order (FR-004).
- Light theme only.
- No animation library.
- Fonts and icons served by the app (FR-007).
- Kannada never smaller than Latin.
- 48 px targets.
- Colour never alone; colour only in status chips and group icons (owner edit 2).

**Scale/Scope**:
- About 45 routes across four surfaces are restyled.
- About 30 shared and feature components are restyled or replaced.
- New components: customer tab bar, place-order bar, suggestions, sound pill, kitchen row,
  skeletons, empty-state illustrations, icons.

No open `NEEDS CLARIFICATION` items. Every decision requested for this plan is resolved in
[research.md](./research.md):

| Decision | Where |
|---|---|
| Tokens | R1 |
| Font | R2 |
| Icons | R3 |
| Motion | R4 |
| Tab-bar state and freshness | R5 |
| Place-order bar | R6 |
| Suggestions source and latency | R7 |
| Scroll to dish | R8 |
| Sound pill persistence | R9 |
| Skeletons | R10 |
| Layout checks | R13 |
| Screenshot capture | R14 |
| E2E locator edits | R15 |
| Message keys | R16 |

## Constitution Check

*Gate before Phase 0, re-checked after Phase 1 design. Result: **PASS** both times. Test assertion
edits are raised for the owner rather than made silently: E1 and E2 approved 2026-10-16.*

| Principle | How this plan complies | Pre | Post |
|---|---|---|---|
| I. Spec first | Approved spec plus the design pick. No new requirements; owner edits are recorded in the spec before this plan. Routine choices listed below | ✅ | ✅ |
| II. Both languages, equal | New strings only through keys in en and kn (parity test); Kannada machine-drafted and marked. One family for both scripts at equal sizes with taller Kannada line heights; layout checks run in both languages | ✅ | ✅ |
| III. Honest integrations | No integration changes. UPI and message-log stand-ins keep their visible demo labels. Fonts are self-hosted; icons are bundled | ✅ | ✅ |
| IV. First-time smartphone users | Four taps kept and tested. 48 px targets tested. One top bar and one bottom bar. Icons always with words. Colour never alone. Server-rendered tab bar; `<details>` and fragment links instead of JS. Suggestions are progressive (the form works without JS) | ✅ | ✅ |
| V. Typed and validated at the edges | The suggestions handler validates `q` with Zod and fails closed to an empty result. No new actions. The dish filter and locale come from the existing validated cookies | ✅ | ✅ |
| VI. Tested where it matters | Existing suites unchanged and green. New unit tests for pure helpers, an integration test for the handler, and the layout e2e on every gate. Seed unchanged | ✅ | ✅ |
| VII. Explicit states, honest errors | Route-shaped skeletons, illustrated empty states, restyled error and not-found pages on every surface (R10) | ✅ | ✅ |
| VIII. Simplicity | One dependency with a reason. No state library, no client data layer, no animation library. Existing token names kept to keep the change small | ✅ | ✅ |
| Tech & architecture | Tailwind tokens, `next/font`, Server Components by default; client components only for the search box, sound pill and existing interactive leaves | ✅ | ✅ |
| Workflow | Branch `003-visual-refresh` in its own worktree. Spec approved with the design pick. This plan goes to the owner before tasks. `/speckit-checklist` skipped as in 001 and 002 unless asked | ✅ | ✅ |

### Routine choices made by the agent (for review, per Principle I)

1. Today's token names (`primary`, `ink`, `muted`, `line`, `veg`, …) keep their names with Coast
   values; new groups are added beside them (R1).
2. The customer tab bar is rendered by each page, like today's dock, not by the layout, so cart and
   order state stay fresh on navigation (R5).
3. The Orders tab always opens the orders list; the ongoing order is its first card with its
   status, and its label reads "Orders · <status>" (R5, owner plan review).
4. On the cart with items, the ongoing order is not shown (the place-order bar replaces the tabs);
   it shows again on any other screen (R6).
5. Tab labels are two lines (word above, state below) in a fixed 72 px bar so states never shift
   the layout (R5).
6. Suggestions: from 2 characters, after 150 ms, at most 4 kitchens and 6 dishes, as links under a
   normal search box, not an ARIA combobox (R7).
7. Address and hours use a native `<details>` element; scroll to a dish uses the URL fragment and a
   CSS `:target` tint (R8).
8. The sound pill is remembered per device in `localStorage`; the sound unlock itself stays per tab,
   because browsers need a fresh tap after a reload (R9).
9. The waiting partner order counts down in words only; the mockup's countdown bar was dropped
   during implementation so three cards fit at 390×844 (SC-007). Every decorative colour rule is
   removed (owner edit 2).
15. On the partner orders list itself the new-order banner is not repeated: the waiting order is
    first, outlined and counting down there, and the sound still plays (FR-029 stays met; SC-007).
    Every other partner screen shows the banner as before.
16. The partner card's middle block (items, dishes, customer) is the link to the order, and the
    customer's landmark and rider note share one line (full text in its title and on the order page).
17. Partner orders' "Today" and "Messages" links are 48 px icon buttons with their names for screen
    readers.
10. Admin navigation moves from a side column to a top bar; the board keeps a 200 px column minimum
    and scrolls sideways between 1024 and 1280 px (R11).
11. Shaped skeletons cover the six reference routes plus agent home and the partner order page;
    other routes use the restyled shared skeleton (R10).
12. Tap-target checks exempt links inside running text (WCAG's inline exception) (R13).
13. Screenshots are written to a git-ignored `screens/` folder with an `index.html` contact sheet
    (R14).
14. Strings left unused by the new design are removed from both languages together and listed in
    the commit (R16).

## Project Structure

### Documentation (this feature)

```text
specs/003-visual-refresh/
├── spec.md              # Approved specification with the design pick
├── plan.md              # This file
├── research.md          # Phase 0: decisions R1–R16 and the dependency reason
├── data-model.md        # Phase 1: no schema change; view models for the new components
├── quickstart.md        # Phase 1: run guide, gate, screenshot capture, review walkthrough
├── contracts/
│   ├── routes.md        # The suggestions route handler; screens and their new structure
│   └── ui.md            # Theme tokens and shared UI components (props, test hooks)
├── design/              # Exploration: brief, three directions, comparison; a-coast is the reference
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 (/speckit-tasks; not created here)
```

### Source Code (repository root)

New and changed paths only. Everything else is as in
[002's structure](../002-ordering/plan.md#source-code-repository-root).

```text
src/
├── app/
│   ├── globals.css                       # Coast tokens in @theme, base type, :lang(kn), motion, reduced motion (R1, R4)
│   ├── layout.tsx                        # Anek Kannada via next/font; theme colour (R2)
│   ├── (customer)/layout.tsx             # slim top bar only; second header row removed (R5)
│   ├── (customer)/**/page.tsx            # CustomerDock → CustomerTabBar; restyled sections
│   ├── (customer)/**/loading.tsx         # shaped skeletons: home, kitchen, cart, order (R10)
│   ├── (partner)/partner/(protected)/    # layout (pill, top bar), orders list/detail, day, menu, hours, kitchen restyled
│   ├── (agent)/agent/(protected)/        # home figures, cards, order page sections
│   ├── (admin)/admin/(protected)/        # top navigation layout; board; forms and tables restyled
│   └── api/search/suggestions/route.ts   # GET suggestions (R7)
├── features/
│   ├── browse/components/                # kitchen-row (replaces kitchen-card markup), search-box (client, suggestions),
│   │                                     # search-suggestions, dish-row (id + :target), kitchen header, hours in <details>
│   ├── browse/suggestions.ts             # pure trimming and shaping of search results (+ unit test)
│   ├── cart/components/                  # customer-tab-bar, place-order-bar; cart-bar and customer-dock removed
│   ├── cart/tab-bar-state.ts             # pure state for the tab labels (+ unit test)
│   ├── orders/components/                # partner/agent order card, reject sheet, board card/columns, sound pill,
│   │                                     # status chip with icon; ongoing-order-strip removed
│   └── …/components/                     # other surfaces' components restyled in place
└── shared/
    ├── ui/                               # button, card, badge, chip, field, empty-state (illustrated), route-states
    │                                     # (skeletons), app-header (slim top bar), nav-links (icons, top/bottom)
    ├── ui/icons/                         # veg/non-veg marks, mark, empty-state illustrations (SVG components)
    └── maps/icons.ts                     # Coast kitchen and delivery pins
e2e/
├── visual-layout.spec.ts                 # FR-027 checks (R13)
├── layout.ts                             # helpers: sideways scroll, targets, fixed chrome, counts
├── screens/capture.spec.ts               # FR-028 capture (R14)
└── ordering-ongoing-strip.spec.ts        # E1 and E2 (approved) only (R15)
playwright.config.ts                      # new `layout` project
playwright.screens.config.ts              # capture config (same web server)
package.json                              # lucide-react; "screens" script
.gitignore                                # screens/
```

**Structure decision**: Same single Next.js project and feature-domain layout. Shared primitives
(buttons, chips, cards, skeletons, empty states, icons) live in `src/shared/ui`, because all four
surfaces use them. Cards that belong to one domain stay in that feature (`orders/components` for
partner, agent and board cards). Components the new design replaces are deleted rather than left
unused (Principle VIII): `cart-bar`, `customer-dock` and `ongoing-order-strip`.

## Complexity Tracking

No constitution violations. Two items for the owner:

| Item | Why | Simpler alternative rejected because |
|---|---|---|
| E2 (approved 2026-10-16): follow the Orders tab to the list, then the first card (`ordering-ongoing-strip.spec.ts` lines 37–39) | Follows from the owner's plan-review edit | Keeping the old assertion would make the tab open the order page, which the owner ruled out |
| E1 (approved 2026-10-16): change one existing e2e assertion (`ordering-ongoing-strip.spec.ts`, "strip above cart bar" → "both visible, not overlapping") | The assertion encodes the stacked layout this feature removes; FR-002 allows only locator changes, so this needs the owner's agreement | Keeping the old assertion would force the old stacked layout back, which contradicts FR-013 |
| A new route handler for suggestions (`/api/search/suggestions`) | Suggestions while typing need a small, abortable read; it calls the existing search function, so matching rules are unchanged | A server action is POST-only and less clean to abort. Sending every name to the client is heavier and goes stale on open state |
