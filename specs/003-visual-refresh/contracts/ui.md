# UI Contract: Theme and Shared Components (003)

The contract other code relies on: theme token names, shared component props and the test hooks
that existing tests use. Values come from the Coast reference (`design/a-coast/tokens.css`);
decisions are in [research.md](../research.md).

## Theme tokens (Tailwind 4 `@theme`, `src/app/globals.css`)

Existing names keep their meaning with new values; new groups are added (R1).

| Token | Utility examples | Use |
|---|---|---|
| `--color-primary`, `--color-primary-strong`, `--color-on-primary` | `bg-primary`, `text-primary` | One primary action per screen; active tab |
| `--color-sea`, `--color-sea-soft` | `text-sea` | Call, map and delivery cues only |
| `--color-ink`, `--color-muted`, `--color-subtle` | `text-ink`, `text-muted` | Text levels (≥ 4.5:1 on page and surface) |
| `--color-page`, `--color-surface`, `--color-surface-sunk`, `--color-line`, `--color-line-strong` | `bg-page`, `border-line` | Backgrounds and hairlines |
| `--color-{open,closed,veg,nonveg,warn,danger}` and `-soft` | `text-open`, `bg-open-soft` | Meaning, always with a word or icon |
| `--color-status-{placed,accepted,preparing,ready,picked,delivered,rejected,cancelled}` and `-soft` | `text-status-ready bg-status-ready-soft` | **Only** in `StatusChip` and group icons (owner edit 2) |
| `--text-{caption,small,body,heading,title,display}` | `text-body` | 13/14/16/18/22/28 px, same for both scripts |
| `--radius-{xs,sm,md,lg,xl}` | `rounded-lg` | 6/10/14/18/24 px |
| `--shadow-{1,2,3,bar}` | `shadow-2` | Cards (1–2), sheets (3), fixed bars (bar) |
| `--spacing-{touch,topbar,tabbar,placebar}` | `min-h-touch`, `h-tabbar`, `pb-tabbar` | 48/56/72/76 px |
| `--duration-{fast,base}`, `--ease-out-soft` | `duration-fast` | 120/180 ms; 0 under reduced motion |
| `--font-sans` | `font-sans` | Anek Kannada (self-hosted) then system fallbacks |

Base styles: `:lang(kn)` raises line heights (body 1.62, headings 1.42). `font-stretch` levels:
100% reading, 87.5% headings and prices, 80% dense labels.

## Shared components (`src/shared/ui`)

| Component | Props (summary) | Notes and test hooks |
|---|---|---|
| `Button`, `ButtonLink`, `buttonClasses` | `variant: 'primary' \| 'secondary' \| 'ghost' \| 'danger' \| 'sea'`, `size`, `icon?` | Existing API kept; restyled; min 48 px |
| `Chip` (new) | `pressed?`, `icon?`, `href?` | Filter chips and reject reasons; `aria-pressed` for toggles |
| `StatusChip` (replaces `status-badge` styling) | `status` | Icon plus word, status tint; the only place status colour appears |
| `Card` | `as?`, `tone?: 'default' \| 'attention'` | Attention is a neutral 2 px ink outline for the waiting order; no coloured ring, rail or tint (owner edit 2) |
| `EmptyState` | `illustration`, `title`, `body?`, `action?` | Existing props plus `illustration` |
| `RouteLoading` and named skeletons | `variant` | Shaped skeletons (R10); `role="status"` with the loading text |
| `AppHeader` | `homeHref`, `actions?`, `back?` | Slim top bar: mark, wordmark, language switch; optional back link (`data-testid="back-link"` kept) |
| `NavLinks` | `items: { href; label; icon; exact? }[]`, `layout: 'bottom' \| 'top'` | Partner, agent (bottom) and admin (top); `aria-current` plus weight and icon tile, not colour alone; link names unchanged |
| `VegMark` | `isVeg` | Redrawn Indian marks; accessible name kept |
| `icons/*` | — | `CoastMark`, empty-state illustrations; `aria-hidden` unless given a label |

## Feature components with kept test hooks

| Component | Kept hooks |
|---|---|
| `KitchenRow` (`browse`) | `data-testid="kitchen-card"`, `data-kitchen-id`, inner `kitchen-state` with `data-state` |
| `DishRow` (`browse`) | `data-testid="dish-row"`, `data-dish-id`, new `id="dish-<id>"`, `not-available` |
| `SearchBox` (`browse`, client) | Input keeps the `searchbox` role; buttons "Search" and "Clear search"; suggestions list `data-testid="search-suggestions"` |
| `CustomerTabBar` (`cart`) | Cart tab link `data-testid="header-cart"` (count badge inside); its summary `data-testid="cart-bar"` (contains "{count} items" for screen readers and the total); Orders tab state `data-testid="ongoing-strip"` (contains `#<orderNo>` in its accessible text) |
| `PlaceOrderBar` (`cart`) | Holds the existing submit button and the "Sign in to check out" link unchanged |
| `SoundPrompt` / `SoundPill` (`orders`) | `sound-prompt` (full prompt) and `sound-pill` |
| `NewOrderBanner` (`orders`) | `new-order-banner` |
| `PartnerOrderCard`, `AgentOrderCard` | Existing hooks; shows item total and customer name, landmark, rider note (partner) |
| `DispatchBoard` | `group-*`, `board-order` with `data-order-no` |
| `MessageList` | `message-list` |
