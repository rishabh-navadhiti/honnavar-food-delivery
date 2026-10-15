# Contract: Services and Server Actions (002)

Same pattern as [001 server actions](../../001-platform-core/contracts/server-actions.md): each
operation is a **service** `(actor, input) => Promise<Result<T>>` in
`src/features/<feature>/services/`, validated with Zod through `parseInput`, never importing
`next/*`. The `'use server'` action is a thin wrapper that resolves the actor from the session,
calls the service, then revalidates or redirects. Errors are codes that map to translation keys;
`invalid`, `unauthorised` and `unexpected` apply everywhere and are not repeated below.

Every order service runs lazy expiry for the order first
([R5](../research.md#r5-automatic-rejection-without-a-background-job-fr-020)), then a
compare-and-set update, the `order_events` row and the messages in one transaction
([R4](../research.md#r4-order-state-machine-and-races)). A lost race returns
`order_moved_on { status }`.

New actor kinds: `{ role: 'customer', customerId, phone }` and `{ role: 'agent', agentId, phone }`,
alongside 001's partner and admin actors.

```text
Reason      = 'kitchen_busy' | 'item_unavailable' | 'kitchen_closing' | 'other'          // partner rejection
AdminReason = 'customer_request' | 'kitchen_issue' | 'no_agent' | 'delivery_problem' | 'other'
Note        = string ≤ 200, required when the reason is 'other'
LatLng      = { lat: number, lng: number }   // within India bounds
```

## Cart (`src/features/cart`): no session needed; reads and writes the `hfd_cart` cookie

| Action | Input | Success | Errors |
|---|---|---|---|
| `addToCart` | `{ dishId, replace?: boolean }` | cart with the dish at quantity 1 (or +1) | `other_kitchen { kitchenId }` (unless `replace`); `dish_unavailable`; `kitchen_closed`; `cart_full` (30 lines); `quantity_limit` (20) |
| `setCartQuantity` | `{ dishId, qty: 0–20 }` | updated; 0 removes the line; an empty cart clears the cookie | `quantity_limit` |
| `clearCart` | `{}` | cookie cleared | none |

The cart service is pure over (cookie value, menu rows); the action owns cookie reading and
writing.

## Addresses (`src/features/addresses`): customer

| Action | Input | Success | Errors |
|---|---|---|---|
| `saveAddress` | `{ id?, label, house (1–100), street? (≤150), landmark (1–100), riderNote? (≤200), location: LatLng, geocodedText? (≤300), voiceNote?: File \| null, removeVoiceNote?: boolean }` | `{ id }` | `invalid_audio` (type, size or magic bytes); `address_limit` (10); `not_found` (another customer's id) |
| `deleteAddress` | `{ id }` | deleted; unused voice clip deleted | `not_found` |

## Ordering: customer (`src/features/orders`)

| Action | Input | Success | Errors |
|---|---|---|---|
| `placeOrder` | `{ placeKey: uuid, addressId, paymentMethod: 'cod' \| 'upi_demo', upiConfirmed?: true }` plus the cart cookie | `{ orderId }`; cart cleared; messages to customer and kitchen. UPI calls `PaymentProvider.confirmUpi` (stand-in) and stores its reference | `cart_empty`; `cart_changed { changes: [{ dishId, kind: 'unavailable' \| 'removed' \| 'price', oldPrice?, newPrice? }] }` (cookie rewritten); `kitchen_closed { opensAt? }`; `kitchen_unavailable` (no longer Active: cart cleared); `upi_not_confirmed`; `not_found` (address) |
| `cancelOrderByCustomer` | `{ orderId }` | status `cancelled` | `not_found`; `order_moved_on` (no longer Placed) |
| `reorder` *(optional, FR-052)* | `{ orderId, replace?: boolean }` | cart filled with still-available dishes at current prices; `{ leftOut: dishName[] }` | `not_found`; `other_kitchen` |

`placeOrder` computes `expected_at` ([R13](../research.md#r13-expected-delivery-time-fr-057-to-fr-059)),
copies the address snapshot and dish snapshots, and takes `delivery_fee` from `DELIVERY_FEE_RUPEES`.

## Ordering: partner (kitchen from the session)

| Action | Input | Success | Errors |
|---|---|---|---|
| `acceptOrder` | `{ orderId }` | `accepted` | `not_found` (other kitchen); `order_moved_on` |
| `rejectOrder` | `{ orderId, reason: Reason, note? }` | `rejected` with reason | `not_found`; `order_moved_on` |
| `markPreparing` | `{ orderId }` | `preparing` | `not_found`; `order_moved_on` |
| `markReady` | `{ orderId }` | `ready` | `not_found`; `order_moved_on` |

## Ordering: admin

| Action | Input | Success | Errors |
|---|---|---|---|
| `assignAgent` | `{ orderId, agentId }` | agent set; event `assigned` or `reassigned`; messages | `not_found`; `agent_inactive`; `same_agent`; `not_assignable { status }` (Placed, or picked up or later); `order_moved_on` |
| `cancelOrderByAdmin` | `{ orderId, reason: AdminReason, note? }` | `cancelled` with reason | `not_found`; `order_moved_on` (already final) |
| `setAgentActive` (changed, 001) | `{ id, active }` | as before | **new** `agent_has_orders { orderNos }` when deactivating |
| `createKitchen`, `updateKitchenProfile` (changed, 001) | adds `location?: LatLng \| null`, `prepMinutes: int 5–120` | as before | as before |

## Ordering: agent

| Action | Input | Success | Errors |
|---|---|---|---|
| `markPickedUp` | `{ orderId }` | `picked_up` | `not_found` (not assigned to this agent now); `not_ready`; `order_moved_on` |
| `markDelivered` | `{ orderId, cashCollected?: true }` | `delivered`; for `cod` records `cash_collected = grand_total` | `not_found`; `cash_not_confirmed` (COD without confirmation); `order_moved_on` |

## Read models (server-side queries)

Each runs lazy expiry for its scope before reading.

| Query | Used by | Notes |
|---|---|---|
| `getCartView(cookie, customer?)` | `/cart`, cart bar | Priced lines and bill; flags unavailable, removed or repriced dishes; saved addresses and preselection (last order's address and payment method, FR-009, FR-010) |
| `getCustomerOrder(customerId, orderId)` | `/orders/[id]` | null unless the customer's; events for the timeline; kitchen and delivery locations for the map |
| `listCustomerOrders(customerId)` | `/orders` | ongoing first, then past |
| `listPartnerOrders(kitchenId, now)` | `/partner/orders` | open orders with time left for Placed |
| `getPartnerOrder(kitchenId, orderId)` | `/partner/orders/[id]` | no customer phone or address beyond landmark and rider note (FR-032) |
| `getPartnerDay(kitchenId, now)` | `/partner/day` | today's orders and totals (FR-031) |
| `getNewOrderFeed(kitchenId, now)` | `GET /partner/orders/new` | Placed orders only |
| `getDispatchBoard(now)` | `/admin/orders` | five groups; active agents with undelivered counts |
| `getAdminOrder(orderId)` / `findOrderByNumber(no)` | `/admin/orders/[id]` | full detail and history |
| `listAgentOrders(agentId)`, `getAgentToday(agentId, now)` | `/agent` | assigned unfinished orders; today's count and cash |
| `getAgentOrder(agentId, orderId)` | `/agent/orders/[id]` | returns `{ state: 'mine' \| 'reassigned' \| 'cancelled' }` so the screen can explain |
| `listMessages(recipient)` | `/messages`, `/partner/messages`, `/agent/messages` | newest first, 100 per page |
