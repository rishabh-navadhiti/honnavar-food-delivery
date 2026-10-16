# Data Model: Visual Refresh (003)

**No database change.** No tables, columns, enums, migrations or seed changes. The demo reset and
the catalogue coverage test are untouched.

This feature adds only view models: plain shapes passed from server components to the new UI
components, built from the existing read models in `features/orders/queries.ts` and
`features/browse/queries.ts`.

## TabBarState (customer bottom navigation, R5)

Built by a pure function `tabBarState(input)` in `features/cart/tab-bar-state.ts` (unit tested).

| Input | Type | Source |
|---|---|---|
| `current` | `'home' \| 'orders' \| 'cart' \| 'account'` | the page |
| `cart` | `{ count: number; itemTotal: number } \| null` | `getCartView` (as the cart bar today) |
| `ongoing` | `{ id; orderNo; status } \| null` | `getOngoingOrder` (as the strip today) |
| `excludeOrderId` | `string \| undefined` | the order page passes its own id |
| `onCartPage` | `boolean` | the cart page |

| Output | Rule |
|---|---|
| `visible` | `false` only when `onCartPage` and `cart.count > 0` (the place-order bar replaces the tabs) |
| `orders` | `{ href: '/orders', state: status }` when `ongoing` exists and `ongoing.id !== excludeOrderId`; otherwise `{ href: '/orders', state: null }` (the tab always opens the list) |
| `cart` | `{ count, itemTotal }` when `count > 0`; otherwise `null` (label "Cart" only) |
| `active` | `current` |

## Suggestions (search while typing, R7)

Built by a pure function `toSuggestions(results)` in `features/browse/suggestions.ts` (unit tested)
from the existing `SearchResults`.

| Field | Type | Notes |
|---|---|---|
| `kitchens` | up to 4 of `{ id; name: LocalizedPair; type; state: KitchenState }` | same order as the existing search's kitchen list |
| `dishes` | up to 6 of `{ id; name: LocalizedPair; isVeg; priceRupees; photoImageId; kitchen: { id; name: LocalizedPair } }` | same order as the existing search's dish list |
| `total` | `{ kitchens: number; dishes: number }` | full counts, for the live region and "All results" |

Validation of the query (`q`: string, trimmed, 2–80 characters) happens in the route handler
([contracts/routes.md](./contracts/routes.md)); anything else returns empty lists.

## Device preferences (client only)

| Key | Storage | Values | Use |
|---|---|---|---|
| `hfd_alert_prompt_seen` | `localStorage` | `'1'` or absent | Partner sound prompt shows as a pill once seen on this device (R9) |
| `hfd_alert_sound_on` | `sessionStorage` (unchanged from 002) | `'1'` or absent | Sound unlocked in this tab |

Every access is guarded; blocked storage falls back to the full prompt.
