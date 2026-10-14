# Data Model: Platform Core (001)

Phase 1 output for [plan.md](./plan.md). Tables are PostgreSQL via Drizzle; every change is a
versioned migration. Ids are UUIDs. Phone numbers are stored normalised as 10 ASCII digits starting
with 6–9 (see [research R4](./research.md#r4-sign-in-sessions-and-per-surface-roles)). Timestamps
are `timestamptz`; all display and hours logic uses IST.

## Identity: how the spec's "Account" maps to tables

The spec's **Account** is a person identified by mobile number who may hold several roles. There is
no shared accounts table. The phone number is the shared identity, and each role has its own
registration table with its own uniqueness rule:

| Role | Table | Registered by | Sign-in allowed when |
|---|---|---|---|
| Customer | `customers` | Self, on first sign-in (FR-005) | Always |
| Partner | `kitchen_signins` | Admin (FR-053) | Phone is on a kitchen's sign-in list |
| Agent | `agents` | Admin (FR-026) | Agent exists and `active = true` |
| Admin | `admins` | Demo data only (FR-006) | Admin exists |

The same phone may appear in several of these tables, and the entry point decides which one is
used (spec edge case).

## Tables

### `customers`

| Field | Type | Rules |
|---|---|---|
| id | uuid PK | |
| phone | varchar(10) | unique, not null |
| display_name | varchar(60) | nullable, trimmed (FR-010) |
| created_at | timestamptz | |

### `admins`

| Field | Type | Rules |
|---|---|---|
| id | uuid PK | |
| phone | varchar(10) | unique, not null |
| name | varchar(60) | not null |

### `agents`

| Field | Type | Rules |
|---|---|---|
| id | uuid PK | |
| phone | varchar(10) | unique (FR-027) |
| name | varchar(60) | not null |
| vehicle_type | enum `vehicle_type` (`bicycle`, `two_wheeler`, `other`) | not null |
| vehicle_reg | varchar(20) | nullable, uppercased |
| active | boolean | default true |
| created_at, updated_at | timestamptz | |

### `sessions`

| Field | Type | Rules |
|---|---|---|
| token_hash | char(64) PK | SHA-256 hex of the cookie token; the raw token is never stored |
| surface | enum `surface` (`customer`, `partner`, `agent`, `admin`) | |
| phone | varchar(10) | |
| subject_id | uuid | `customers.id`, `admins.id`, `agents.id`, or `kitchen_signins.id` |
| kitchen_id | uuid | set only when surface = partner |
| created_at, last_seen_at, expires_at | timestamptz | lifetime 30 days, extended when used |

**Validity check on every request** (R4): the session exists, has not expired, and its subject
still qualifies. That means an agent row that is still active, a `kitchen_signins` row that still
exists with the same kitchen, or an admin row that still exists. If the check fails, the row is
deleted. Index on (`surface`, `subject_id`).

### `kitchens`

| Field | Type | Rules |
|---|---|---|
| id | uuid PK | also used in the customer URL `/kitchens/[id]` |
| name_en, name_kn | varchar(80) | nullable; CHECK at least one is non-empty (FR-016) |
| description_en, description_kn | varchar(300) | nullable |
| type | enum `kitchen_type` (`restaurant`, `home_kitchen`, `cloud_kitchen`) | not null |
| pure_veg | boolean | declared by admin (FR-035) |
| address | varchar(200) | not null; user-generated text |
| landmark | varchar(100) | not null; user-generated text |
| photo_image_id | uuid FK → images | nullable |
| status | enum `kitchen_status` (`pending`, `active`, `suspended`) | default `pending` (FR-020) |
| suspension_reason | varchar(200) | CHECK required when status = `suspended` |
| closed_at | timestamptz | nullable; set when temporarily closed |
| reopens_at | timestamptz | nullable; computed by `closureEnd` (R10); null = no future period |
| closure_updated_by_role, closure_updated_by_phone, closure_updated_at | enum `actor_role` (`admin`, `partner`), varchar(10), timestamptz | FR-055 |
| hours_updated_by_role, hours_updated_by_phone, hours_updated_at | same | FR-055 (weekly hours as a whole) |
| created_at, updated_at | timestamptz | |

**Temporarily closed** means `closed_at IS NOT NULL AND (reopens_at IS NULL OR reopens_at > now)`.
Reopening early sets both columns to null. An expired closure needs no cleanup job, because the
condition simply stops matching.

### `kitchen_contacts` (customer-facing numbers)

| Field | Type | Rules |
|---|---|---|
| id | uuid PK | |
| kitchen_id | uuid FK → kitchens, cascade | |
| phone | varchar(10) | |
| is_primary | boolean | exactly one per kitchen: partial unique index on (`kitchen_id`) WHERE `is_primary` |
| position | smallint | display order |

At least one contact per kitchen is enforced in the server action. Contacts **never** grant
sign-in (FR-053).

### `kitchen_signins` (partner sign-in list)

| Field | Type | Rules |
|---|---|---|
| id | uuid PK | |
| kitchen_id | uuid FK → kitchens, cascade | |
| phone | varchar(10) | **unique across all kitchens** (FR-025) |
| person_name | varchar(60) | not null (owner or helper) |
| created_at | timestamptz | |

At least one sign-in per kitchen: the last one cannot be removed (server action rule). Removing a
row deletes that subject's partner sessions in the same transaction, and the per-request check
covers anything missed.

### `kitchen_hours`

| Field | Type | Rules |
|---|---|---|
| kitchen_id | uuid FK → kitchens, cascade | |
| weekday | smallint | 1 = Monday … 7 = Sunday (ISO) |
| slot | smallint | 1 or 2 |
| opens_min | smallint | 0–1439, minutes after midnight IST |
| closes_min | smallint | 1–1440; CHECK `opens_min < closes_min` (no crossing midnight) |

PK (`kitchen_id`, `weekday`, `slot`). A missing row means no range. A day with no rows is closed.
Overlap between slot 1 and slot 2 is rejected by the Zod schema (FR-032). Hours are saved by
replacing all of a kitchen's rows in one transaction.

### `verifications`

| Field | Type | Rules |
|---|---|---|
| kitchen_id | uuid PK, FK → kitchens | one current verification per kitchen |
| kind | enum `verification_kind` (`fssai_licence`, `hygiene_check`) | must match type: restaurant and cloud kitchen use `fssai_licence`; home kitchen uses `hygiene_check` |
| reference | varchar(40) | FSSAI: exactly 14 digits; hygiene check: 3–40 characters |
| verified_by_admin_id | uuid FK → admins | |
| verified_at | timestamptz | |

No document is stored (spec review edit 3).

### `menu_categories`

| Field | Type | Rules |
|---|---|---|
| id | uuid PK | |
| kitchen_id | uuid FK → kitchens, cascade | |
| name_en, name_kn | varchar(60) | CHECK at least one |
| position | integer | order within the kitchen |
| updated_by_role, updated_by_phone, updated_at | | FR-055 |

### `dishes`

| Field | Type | Rules |
|---|---|---|
| id | uuid PK | |
| kitchen_id | uuid FK → kitchens, cascade | kept alongside the category for simpler queries |
| category_id | uuid FK → menu_categories, **restrict** | a category with dishes cannot be deleted (FR-033) |
| name_en, name_kn | varchar(80) | CHECK at least one |
| description_en, description_kn | varchar(300) | nullable |
| price_rupees | integer | CHECK 1–100000, whole rupees |
| is_veg | boolean | must be true when the kitchen is pure veg (FR-035, enforced in actions) |
| photo_image_id | uuid FK → images | nullable |
| available | boolean | default true |
| position | integer | order within the category |
| updated_by_role, updated_by_phone, updated_at | | FR-055 |

### `images`

| Field | Type | Rules |
|---|---|---|
| id | uuid PK | |
| sha256 | char(64) | unique; identical uploads reuse the row |
| small | bytea | WebP, 320 px wide |
| large | bytea | WebP, 800 px wide |
| created_at | timestamptz | |

When a photo is replaced or its dish or kitchen is deleted, the old image row is deleted if
nothing else references it.

## Cross-table rules (enforced in server actions, covered by integration tests)

| Rule | Source |
|---|---|
| A dish in a pure-veg kitchen must be veg | FR-035 |
| A kitchen cannot be set pure veg while it has non-veg dishes; the error reports the count | FR-035, edge case |
| A kitchen cannot become `active` without a `verifications` row | FR-022 |
| Verification kind must match kitchen type | FR-021 |
| Customer queries only ever return `status = 'active'` kitchens | FR-023 |
| A partner's actions are scoped to the session's `kitchen_id`; admins may target any kitchen | FR-030, FR-054 |
| Every write to a dish, category, hours or closure stamps `updated_by_*` from the session | FR-055 |

## State transitions

### Kitchen status

```text
          create
            │
            ▼
       ┌─────────┐  activate (needs verification)  ┌────────┐
       │ pending │ ───────────────────────────────▶ │ active │
       └─────────┘                                  └────────┘
            ▲  │ suspend (reason)                  │      ▲
            │  ▼                                   │      │ reinstate (verification present)
       ┌───────────┐ ◀──────── suspend (reason) ───┘      │
       │ suspended │ ─────────────────────────────────────┘
       └───────────┘ ── back to pending (admin) ──▶ pending
```

Partners can sign in in every status (FR-037, clarification Q5).

### Temporary closure (R10)

```text
not closed ──close(now)──▶ closed { closed_at = now, reopens_at = closureEnd(hours, now) }
closed ──reopen early──▶ not closed (both columns null)
closed ──now ≥ reopens_at──▶ not closed (implicit; no write)
closed ──hours edited──▶ closed { reopens_at = closureEnd(newHours, closed_at) }
```

## Derived (not stored) values

| Value | Function (pure, unit-tested) |
|---|---|
| Kitchen state: `open`, `closed{nextOpening}`, `closed{hoursNotSet}`, `temporarilyClosed{reopensAt}` | `kitchenState(kitchen, hours, now)` |
| Closure end | `closureEnd(hours, closedAt)` |
| Localised text with fallback marker | `pickLocalized({en, kn}, locale)` → `{ text, lang, isFallback }` |
| Kitchen matches the dish filter | at least one **available** dish with matching `is_veg`; `all` always matches (FR-043) |
| Missing-language list for the partner app | categories and dishes where one name is empty (FR-036) |

## Seed outline (demo state, FR-049 to FR-052)

This outline is the **stand-in catalogue**. The final demo data is based on real Honnavar
businesses with researched menus (spec FR-050) and will replace it as a data file
(`seed/catalogue.json` plus `seed/images/`, [research R15](./research.md#r15-demo-reset-and-seed)),
with no code change. Each kitchen records `menuSource` (`researched` or `fabricated`). Kannada
text in the stand-in is drafted by the agent and listed for native review. Demo sign-in numbers
use the `90000xxxxx` block.

| # | Kitchen | Type | Pure veg | Status / state at reset | Notes |
|---|---|---|---|---|---|
| 1 | Sharavathi Udupi Bhavana, near KSRTC bus stand | Restaurant | Yes | Active, open daytime | Two sign-ins (owner + helper); neer dose, masale dose, goli baje, kashaya |
| 2 | Sagara Fish Meals, near the port / Sharavathi bridge | Restaurant | No | Active | Fish thali, bangude fry, anjal fry, veg thali |
| 3 | Market Road Lunch Home | Restaurant | No | **Suspended** ("Hygiene complaint under review") | |
| 4 | Shanta's Konkani Kitchen, Prabhatnagar | Home kitchen | Yes | Active | Patrode, kotte kadubu; **one dish with no Kannada name** |
| 5 | Havyaka Oota Mane | Home kitchen | Yes | **Pending** (no verification) | Holige, tambuli, appe huli |
| 6 | Kamalakka's Fish Curry, Kasarkod road | Home kitchen | No | Active, **temporarily closed at reset** | Fish curry meals, kane fry, neer dose |
| 7 | Karki Amma's Kitchen | Home kitchen | No | Active | Chicken curry, egg curry; **one unavailable dish** |
| 8 | Honnavar Biryani Box | Cloud kitchen | No | Active, **hours 18:30–23:00 only** (closed at typical demo times) | Chicken, egg and veg biryani |
| 9 | Goli Baje Corner | Cloud kitchen | Yes | Active | Goli baje, buns, masala tea |

Accounts: 1 admin; 1 customer; 3 agents (2 active, 1 inactive); one sign-in per kitchen plus a
helper at kitchen 1. A kitchen with no hours set is not seeded, because that edge case is covered by
tests rather than the demo.
