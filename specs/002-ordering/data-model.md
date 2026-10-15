# Data Model: Ordering (002)

Phase 1 output for [plan.md](./plan.md). This extends the
[001 data model](../001-platform-core/data-model.md): the same conventions apply (PostgreSQL via
Drizzle, versioned migrations, UUID ids, normalised 10-digit phones, `timestamptz`, IST for display
and "today"). Money is whole rupees in `integer` columns. Coordinates are `numeric(9,6)`.

The cart is **not** a table. It lives in the `hfd_cart` cookie
([R1](./research.md#r1-cart-storage)):
`{ v: 1, kitchenId: uuid, lines: [{ dishId: uuid, qty: 1–20 }] (≤ 30 lines, unique dishId) }`.

## New enums

| Enum | Values |
|---|---|
| `order_status` | `placed`, `accepted`, `rejected`, `preparing`, `ready`, `picked_up`, `delivered`, `cancelled` |
| `payment_method` | `cod`, `upi_demo` |
| `order_reason` | `kitchen_busy`, `item_unavailable`, `kitchen_closing`, `kitchen_no_response` (system only), `customer_request`, `kitchen_issue`, `no_agent`, `delivery_problem`, `other` |
| `order_event_kind` | `placed`, `accepted`, `rejected`, `preparing`, `ready`, `assigned`, `reassigned`, `picked_up`, `delivered`, `cancelled` |
| `order_actor` | `customer`, `partner`, `agent`, `admin`, `system` |
| `address_label` | `home`, `work`, `other` |
| `message_recipient` | `customer`, `kitchen`, `agent` |
| `message_kind` | customer: `order_placed`, `order_accepted`, `order_rejected`, `order_preparing`, `order_picked_up`, `order_delivered`, `order_cancelled`; kitchen: `kitchen_new_order`, `kitchen_agent_assigned`, `kitchen_order_cancelled`; agent: `agent_assigned`, `agent_unassigned`, `agent_order_cancelled` |

Rejection reasons a partner may choose: `kitchen_busy`, `item_unavailable`, `kitchen_closing`,
`other`. Admin cancellation reasons: `customer_request`, `kitchen_issue`, `no_agent`,
`delivery_problem`, `other`. `other` requires a note in both lists (FR-019). A customer
cancellation has no reason. The lists are enforced by the Zod schemas of each service.

## Changed tables

### `kitchens` (from 001): three new columns

| Field | Type | Rules |
|---|---|---|
| location_lat, location_lng | numeric(9,6) | nullable together (CHECK both null or both set); lat 6–37, lng 68–98 (India bounds) |
| prep_minutes | smallint | not null, default 25, CHECK 5–120 (FR-057) |

Set on the admin create and profile forms (FR-037). Partners cannot change them (001 FR-038).

### `agents` (from 001): no new columns

New rule: `setAgentActive(false)` is refused with `agent_has_orders { orderNos }` while the agent
holds an order whose status is not `delivered`, `rejected` or `cancelled` (FR-036).

## New tables

### `customer_addresses`

| Field | Type | Rules |
|---|---|---|
| id | uuid PK | |
| customer_id | uuid FK → customers, cascade | |
| label | `address_label` | not null |
| house | varchar(100) | not null, trimmed: house or door number or house name (FR-054) |
| street | varchar(150) | nullable: street or area line |
| landmark | varchar(100) | not null |
| rider_note | varchar(200) | nullable |
| voice_note_id | uuid FK → audio_clips, set null | nullable (FR-055) |
| lat, lng | numeric(9,6) | not null; India bounds as for kitchens |
| geocoded_text | varchar(300) | nullable: the address found under the pin when saved; null when lookup failed (FR-056) |
| created_at, updated_at | timestamptz | |

At most 10 addresses per customer (service rule). Deleting an address never changes orders, which
keep a snapshot. Index on (`customer_id`).

### `audio_clips`

| Field | Type | Rules |
|---|---|---|
| id | uuid PK | |
| sha256 | char(64) | unique |
| mime | varchar(40) | `audio/webm`, `audio/ogg` or `audio/mp4` |
| bytes | bytea | ≤ 600 KB, magic bytes checked ([R9](./research.md#r9-landmark-voice-note-fr-055)) |
| byte_size | integer | |
| created_at | timestamptz | |

Deleted when no address and no order references it.

### `orders`

| Field | Type | Rules |
|---|---|---|
| id | uuid PK | used in URLs (`/orders/[id]`) |
| order_no | integer | unique, from sequence `order_number_seq` starting at 1001 ([R6](./research.md#r6-order-numbers)) |
| customer_id | uuid FK → customers, restrict | |
| kitchen_id | uuid FK → kitchens, restrict | |
| place_key | uuid | unique with `customer_id` (idempotent placing, FR-013) |
| status | `order_status` | not null, default `placed` |
| payment_method | `payment_method` | not null |
| payment_reference | varchar(40) | set for `upi_demo` (from the payment stand-in), else null |
| item_total, delivery_fee, grand_total | integer | CHECK `grand_total = item_total + delivery_fee`, all ≥ 0 (FR-003, SC-005) |
| expected_at | timestamptz | placing time + kitchen `prep_minutes` + `DELIVERY_MINUTES`; never changed (FR-058) |
| agent_id | uuid FK → agents, restrict | nullable; who holds the order |
| assigned_at | timestamptz | nullable |
| reason | `order_reason` | set for `rejected` and admin `cancelled`; CHECK not null when status = `rejected` |
| reason_note | varchar(200) | required when reason = `other` |
| cash_collected | integer | set on delivery of `cod` orders; CHECK equals `grand_total` when set (FR-043) |
| address_id | uuid FK → customer_addresses, set null | the saved address it came from; used to preselect the next checkout (FR-009) |
| addr_label, addr_house, addr_street, addr_landmark, addr_rider_note, addr_lat, addr_lng, addr_geocoded_text | as in `customer_addresses` | **snapshot** at placing (FR-014) |
| addr_voice_note_id | uuid FK → audio_clips, restrict | snapshot of the voice note, kept alive by this reference |
| placed_at | timestamptz | not null |
| status_changed_at | timestamptz | not null; time of the latest event |
| finished_at | timestamptz | set on delivered, rejected or cancelled |

Indexes: (`kitchen_id`, `placed_at`), (`customer_id`, `placed_at`), (`agent_id`) where not
finished, (`status`), and a partial index on (`placed_at`) where `status = 'placed'` for lazy expiry.

CHECKs mirroring the lifecycle: `agent_id` must be null when status is `placed` or `rejected`, and
must be set when status is `picked_up` or `delivered`.

### `order_items`

| Field | Type | Rules |
|---|---|---|
| order_id | uuid FK → orders, cascade | |
| position | smallint | order of lines; PK (`order_id`, `position`) |
| dish_id | uuid FK → dishes, set null | nullable once the dish is deleted |
| name_en, name_kn | varchar(80) | snapshot; CHECK at least one (FR-014) |
| is_veg | boolean | snapshot |
| price_rupees | integer | snapshot, 1–100000 |
| quantity | smallint | 1–20 |
| line_total | integer | CHECK `= price_rupees * quantity` |

### `order_events` (history, FR-018)

| Field | Type | Rules |
|---|---|---|
| id | uuid PK | |
| order_id | uuid FK → orders, cascade | |
| kind | `order_event_kind` | |
| actor | `order_actor` | |
| actor_phone | varchar(10) | the customer's, partner sign-in's, agent's or admin's phone; null for `system` |
| agent_id | uuid FK → agents | for `assigned` and `reassigned`: the new agent |
| previous_agent_id | uuid FK → agents | for `reassigned` |
| reason, reason_note | as on `orders` | for `rejected` and `cancelled` |
| at | timestamptz | not null |

Index on (`order_id`, `at`). Written in the same transaction as the order update it describes.

### `messages` (SMS and WhatsApp stand-in, FR-045 to FR-047)

| Field | Type | Rules |
|---|---|---|
| id | uuid PK | |
| recipient | `message_recipient` | |
| customer_id, kitchen_id, agent_id | uuid FKs, cascade | exactly one set, matching `recipient` (CHECK) |
| order_id | uuid FK → orders, cascade | |
| kind | `message_kind` | |
| params | jsonb | `{ orderNo, amount?, reason?, reasonNote?, agentId? }`; scalar values only |
| created_at | timestamptz | |

No translated text is stored. The list renders `notifications.<kind>` with `params` in the viewer's
language ([R14](./research.md#r14-message-log-sms-and-whatsapp-stand-in)). Indexes on (`customer_id`,
`created_at`), (`kitchen_id`, `created_at`), (`agent_id`, `created_at`).

## Order lifecycle (FR-016, FR-017)

```text
                    accept (partner)            preparing (partner)          ready (partner)
   ┌────────┐ ─────────────────────▶ ┌──────────┐ ─────────────────▶ ┌───────────┐ ─────────────▶ ┌───────┐
   │ placed │                        │ accepted │                    │ preparing │                │ ready │
   └────────┘                        └──────────┘                    └───────────┘                └───────┘
     │  │  │                                                                                          │
     │  │  └─ reject (partner, reason) / window passed (system, kitchen_no_response) ─▶ rejected       │ pickup (assigned agent;
     │  └──── cancel (customer, no reason) ─────────────────────────────────────────────▶ cancelled    │  needs an agent)
     │                                                                                                 ▼
     │        cancel (admin, reason) from any non-final status ─────────────────────▶ cancelled  ┌───────────┐
     │                                                                                            │ picked_up │
     │                                                                                            └───────────┘
     │                                                                                                 │ deliver (assigned agent;
     │                                                                                                 ▼  cod: confirm cash)
     │                                                                                            ┌───────────┐
     └─ (final states: delivered, rejected, cancelled; no further changes)                        │ delivered │
                                                                                                  └───────────┘

Assignment (alongside status, not a status):
  assign / reassign (admin, active agent) allowed when status ∈ {accepted, preparing, ready}
  → sets agent_id, assigned_at; event `assigned` (first time) or `reassigned` (with previous agent).
  Not allowed once picked_up. Pickup requires status = ready AND agent_id = the acting agent.
```

Every arrow is a compare-and-set update plus one `order_events` row plus messages from
`messagesFor`, in one transaction ([R4](./research.md#r4-order-state-machine-and-races)). Lazy expiry
is the `placed → rejected (system)` arrow, applied whenever orders are read
([R5](./research.md#r5-automatic-rejection-without-a-background-job-fr-020)).

### Messages per change (FR-046)

| Change | Customer | Kitchen | Agent |
|---|---|---|---|
| placed | `order_placed` | `kitchen_new_order` | |
| accepted | `order_accepted` | | |
| rejected (partner or system) | `order_rejected` | | |
| preparing | `order_preparing` | | |
| ready | | | |
| assigned | | `kitchen_agent_assigned` | `agent_assigned` |
| reassigned | | `kitchen_agent_assigned` | new agent `agent_assigned`; previous agent `agent_unassigned` |
| picked_up | `order_picked_up` | | |
| delivered | `order_delivered` | | |
| cancelled (customer or admin) | `order_cancelled` | `kitchen_order_cancelled` | `agent_order_cancelled` if an agent held it |

## Cross-table rules (enforced in services, covered by integration tests)

| Rule | Source |
|---|---|
| A cart holds one kitchen's dishes; adding another kitchen's dish needs `replace` | FR-002 |
| Placing re-checks kitchen Active and open, every dish present and available, prices unchanged; otherwise `cart_changed { changes }` and the cart cookie is rewritten | FR-012 |
| Placing with a `place_key` already used by this customer returns that order | FR-013 |
| A customer reads and cancels only their own orders; a partner only their kitchen's; an agent only orders assigned to them now; admins all | FR-030 (001), FR-042, FR-049 |
| Only active agents can be assigned; the board shows each agent's undelivered count | FR-034 |
| An agent holding unfinished orders cannot be deactivated | FR-036 |
| A voice-note clip is served only to its owner customer, the assigned agent of an order using it, or an admin | FR-055 |
| Partners never receive the customer's phone or address beyond landmark and rider note | FR-032 |

## Derived values (pure, unit-tested)

| Value | Function |
|---|---|
| Cart bill: lines, item total, delivery fee, grand total | `bill(lines, deliveryFee)` |
| Next state or refusal for an action | `canTransition(order, action, actor)` |
| Dispatch board group | `dispatchGroup(order)`: `waiting_kitchen`, `needs_agent`, `assigned`, `out_for_delivery`, `finished` |
| Overdue Placed order and time left | `isOverdue(placedAt, now, windowMin)`, `timeLeft(…)` |
| Expected time and kitchen range | `expectedAt(…)`, `etaRange(…)` |
| Messages for a change | `messagesFor(event, order)` |
| IST day bounds for "today" | `istDayBounds(now)` (built on 001's `ist.ts`) |
| Partner day totals | received, accepted, rejected or cancelled, delivered, delivered item-total value (FR-031) |
| Agent today | delivered count and sum of `cash_collected`, by `finished_at` in today's IST bounds (FR-044) |

## Seed outline additions (FR-050, FR-051)

Content lives in `seed/catalogue.json` ([R15](./research.md#r15-demo-seed-and-coverage)); the
rows below describe what it must contain, selected by flags and keys, never by name.

- Every kitchen: `location` (approximate, from its address and landmark) and `prepMinutes`
  (default 25).
- The demo customer: two addresses (`home` and `work`) with locations in Honnavar, one with a
  rider note.
- Orders, all at active kitchens and placed within the last 90 minutes before the reset:

| Key | Status at reset | Detail | For |
|---|---|---|---|
| `demo-placed` | Placed | `placedMinutesBeforeReset: 0`, cash on delivery | Partner accept demo (US2) |
| `demo-needs-agent` | Accepted, no agent | UPI demo | Admin assign demo (US3) |
| `demo-ready` | Ready, assigned to the first active agent | cash on delivery | Agent demo (US4) |
| `demo-out` | Picked up by the second active agent | UPI demo | Board "out for delivery", customer timeline |
| `demo-delivered` | Delivered by the first active agent | cash on delivery, cash collected | Agent "today" totals, partner day view |
| `demo-rejected` | Rejected (`kitchen_busy`) | | Customer sees reason |
| `demo-cancelled` | Cancelled by admin (`customer_request`) | | Board "finished", messages |

The Placed, needs-agent and Ready orders use kitchens whose sign-in numbers are on the demo panel
(all sign-ins are), and the Ready order uses the agent listed first on the agent demo panel (FR-051).
