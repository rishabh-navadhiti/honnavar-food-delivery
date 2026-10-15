# Contract: Routes, Screens and Route Handlers (002)

Extends [001 routes](../../001-platform-core/contracts/routes.md). The same rules apply:
server-rendered, no locale prefix, a visible language switch, loading, empty, error and not-found
states on every screen (FR-049), and every protected page calls `requireSession(surface)` itself.
"Polls" means the page mounts `<LiveRefresh />` ([R3](../research.md#r3-cross-role-updates-by-polling-fr-022)).

## Customer surface `(customer)`

| Path | Auth | Purpose | Polls | Spec |
|---|---|---|---|---|
| `/kitchens/[id]` (changed) | Guest OK | Adds "Add" / quantity steppers per dish (unavailable when the kitchen is closed or the dish unavailable), the sticky cart bar, the replace-cart prompt (`?replace=<dishId>` renders it without JS), and the delivery-time range | | US1, FR-001–FR-006, FR-059 |
| `/cart` | Guest OK | Lines with steppers, bill. Guest: "Sign in to check out" → `/login?next=/cart`. Signed in: address picker (preselected), payment choice (preselected), "Place order" with hidden `placeKey`; UPI opens the demo confirmation sheet first | | US1, FR-003, FR-007–FR-013 |
| `/addresses` | Customer | Saved addresses: list, edit, delete, add | | FR-008 |
| `/addresses/new?next=` | Customer | Step 1 map screen (pin picker, search, use current location, address under the pin) → step 2 details form (house, street, landmark, rider note, voice note, label). Saves, then returns to `next` (same-surface paths only) | | FR-053–FR-055 |
| `/addresses/[id]` | Customer | Edit the same fields; not-found unless the customer owns it | | FR-008 |
| `/orders` | Customer | Ongoing orders first; past orders below (FR-052, optional reorder button) | | FR-024, US8 |
| `/orders/[id]` | Customer | Order page: number, kitchen with call button, items, bill, payment, address, "Expected by", status timeline with times, agent name and call button, static map, cancel (while Placed), rejection/cancellation reason, "nothing was charged" note for UPI | Yes, until finished | US5, FR-025–FR-027, FR-023, FR-058 |
| `/messages` | Customer | Message log, newest first | | US6, FR-047 |
| `/account` (changed) | Customer | Adds links to addresses, orders and messages | | |

The customer header gains an "Orders" entry and a cart badge (item count) on every screen
(FR-024).

## Partner surface `(partner)/partner`

| Path | Auth | Purpose | Polls | Spec |
|---|---|---|---|---|
| layout (changed) | Partner | Mounts `<NewOrderAlert />` on every partner screen: sound unlock prompt, repeating tone, highlighted banner | feed | FR-029 |
| `/partner/orders` | Partner | Open orders (placed highlighted with time left, accepted, preparing, ready, picked up); accept, reject with reason, preparing, ready | Yes | US2, FR-028, FR-030, FR-020 |
| `/partner/orders/[id]` | Partner | One order: items, display name, landmark, rider note, status and actions; acknowledges the alert; not-found for other kitchens' orders | Yes | FR-028, FR-032 |
| `/partner/day` | Partner | Today's orders newest first and totals | | FR-031 |
| `/partner/messages` | Partner | Kitchen message log | | FR-047 |

"Orders" becomes the first item of the partner navigation.

## Agent surface `(agent)/agent`

| Path | Auth | Purpose | Polls | Spec |
|---|---|---|---|---|
| `/agent` (changed) | Agent | Today's delivery count and cash collected; assigned undelivered orders; "No deliveries yet" when none | Yes | US4, FR-039, FR-044 |
| `/agent/orders/[id]` | Agent | Kitchen and customer details with call buttons, items, address with voice-note player, open-in-maps links, "Picked up" (only when Ready), "Delivered" with the cash confirmation for COD; shows "reassigned" or "cancelled" when it no longer belongs to the agent | Yes | FR-040–FR-043 |
| `/agent/messages` | Agent | Agent message log | | FR-047 |

## Admin surface `(admin)/admin` (desktop-first)

| Path | Auth | Purpose | Polls | Spec |
|---|---|---|---|---|
| `/admin` (changed) | Admin | Redirects to `/admin/orders` | | |
| `/admin/orders` | Admin | Dispatch board: five groups; unfinished orders of any day plus orders finished today; agent assign control with undelivered counts; "find by number" (`?no=1042` redirects to the order) | Yes | US3, FR-033, FR-034 |
| `/admin/orders/[id]` | Admin | Full order view with history, assign/reassign, cancel with reason, voice-note player | Yes | FR-035, FR-038, FR-018 |
| `/admin/partners/new`, `/admin/partners/[id]` (changed) | Admin | Kitchen form gains the map pin picker and preparation minutes | | FR-037, FR-057 |
| `/admin/agents/[id]` (changed) | Admin | Deactivation shows `agent_has_orders` with the order numbers | | FR-036 |

## Route handlers

| Method and path | Auth | Response |
|---|---|---|
| `GET /partner/orders/new` | Partner session (else 401) | `{ orders: [{ id, orderNo, placedAt }] }` for the session kitchen's Placed orders, after lazy expiry. `Cache-Control: no-store`. Used by `<NewOrderAlert />` |
| `GET /api/geo/search?q=&locale=` | Customer or admin session (else 401) | `{ places: [{ label, lat, lng }] }` (max 5); `q` 3–100 characters; 503 `{ error: 'unavailable' \| 'busy' }` |
| `GET /api/geo/reverse?lat=&lng=&locale=` | Customer or admin session (else 401) | `{ label: string \| null }`; lat and lng validated to India bounds; 503 as above |
| `GET /voice-notes/[id]` | Customer owning an address that uses it, agent assigned to an unfinished order whose snapshot uses it, or any admin (else 404) | The clip bytes with its stored mime type, `Cache-Control: private, max-age=3600` |
| `GET /media/[id]/[variant]` | Public | Unchanged from 001 |

All query parameters are parsed with Zod and fail closed with 400.

## Auth redirects

As in 001. `/cart` is public. Placing an order requires a customer session, and the place action
returns `unauthorised` if it is missing. `/addresses/new?next=` accepts only customer-surface paths.
