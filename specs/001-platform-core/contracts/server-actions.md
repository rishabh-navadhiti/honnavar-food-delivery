# Contract: Server Actions

All mutations are server actions (see [research R12](../research.md#r12-server-actions-validation-and-errors)).
Every action follows the same steps:

1. Parse the input with its Zod schema. On failure it returns `{ ok: false, error: { code: 'invalid',
   fieldErrors } }`, where field errors are translation keys.
2. Load and check the session for the required surface. On failure: `{ ok: false, error: { code:
   'unauthorised' } }`.
3. Authorise the target. A partner may act only on `session.kitchenId`; an admin may act on any
   kitchen.
4. Perform the write in a transaction, stamping `updated_by_role`, `updated_by_phone` and
   `updated_at` where FR-055 applies.
5. Return `{ ok: true, data }` and revalidate the affected paths.

Actions never throw across the boundary. Unexpected errors are logged and returned as `{ ok: false,
error: { code: 'unexpected' } }`. Shared value types:

```text
Phone        = string, normalised to 10 digits starting 6–9 (accepts +91 / 0 / spaces on input)
LocalizedReq = { en?: string, kn?: string }  // trimmed, at least one non-empty
LocalizedOpt = { en?: string, kn?: string }  // may be empty
Range        = { opens: "HH:MM", closes: "HH:MM" } // opens < closes, closes ≤ "24:00"
WeekHours    = Record<1..7, Range[0..2]>      // non-overlapping per day
ActorRole    = 'admin' | 'partner'
```

## Shared (any surface, no session)

| Action | Input | Success | Errors |
|---|---|---|---|
| `setLocale` | `{ locale: 'en' \| 'kn' }` | sets the `locale` cookie (1 year) | `invalid` |
| `setDishFilter` | `{ filter: 'all' \| 'veg' \| 'nonveg' }` | sets the `hfd_dish_filter` cookie (1 year) | `invalid` |

## Auth (`src/features/auth`)

| Action | Input | Success | Errors |
|---|---|---|---|
| `requestCode` | `{ surface, phone }` | `{ codeSent: true }` (stand-in: nothing sent) | `invalid` (bad phone); `not_registered` (partner/agent/admin number not registered for that surface); `inactive` (agent inactive) |
| `verifyCode` | `{ surface, phone, code }` | session created, surface cookie set, redirect to the surface home (or a same-surface `next`) | `invalid`; `wrong_code`; `not_registered`; `inactive` |
| `signOut` | `{ surface }` | session row deleted, cookie cleared | none |
| `updateCustomerName` | `{ displayName: string ≤ 60 \| '' }` | updated | `invalid`, `unauthorised` |

`requestCode` for the customer surface never fails registration checks. `verifyCode` creates the
`customers` row on first success (FR-005). Registration is checked again in `verifyCode`, because
the state may have changed between the two steps.

## Admin: partners (`src/features/kitchens`)

| Action | Input | Success | Errors |
|---|---|---|---|
| `createKitchen` | `{ name: LocalizedReq, description: LocalizedOpt, type, pureVeg, address, landmark, contacts: {phone, isPrimary}[] (≥1, exactly 1 primary), signins: {phone, personName}[] (≥1), hours: WeekHours, photo?: File }` | `{ id }`, status `pending` | `invalid`; `signin_phone_taken { kitchenName }` |
| `updateKitchenProfile` | `{ kitchenId, …same fields except signins and hours }` | updated | `invalid`; `pure_veg_conflict { nonVegCount }` |
| `addSignin` | `{ kitchenId, phone, personName }` | added | `invalid`; `signin_phone_taken { kitchenName }` |
| `removeSignin` | `{ kitchenId, signinId }` | removed; that subject's sessions deleted | `last_signin` |
| `recordVerification` | `{ kitchenId, kind, reference }` | stored with the verifying admin and time; passes through `VerificationProvider.check` (stand-in) | `invalid`; `kind_mismatch` |
| `setKitchenStatus` | `{ kitchenId, status, reason? }` | updated | `needs_verification` (to active); `reason_required` (to suspended) |
| `setKitchenPhoto` | `{ kitchenId, photo: File \| null }` | updated | `invalid_image` (type or size) |

## Kitchen operations: partner or admin (`src/features/menu`, `src/features/kitchens`)

The surface is either partner (kitchen taken from the session) or admin (`kitchenId` in the input).
Every write stamps FR-055.

| Action | Input | Success | Errors |
|---|---|---|---|
| `closeTemporarily` | `{ kitchenId? }` | `{ reopensAt \| null }` | `already_closed` |
| `reopen` | `{ kitchenId? }` | reopened | `not_closed` |
| `saveHours` | `{ kitchenId?, hours: WeekHours }` | saved; `reopens_at` recalculated if closed | `invalid` (per-day field errors: `range_order`, `range_overlap`) |
| `saveCategory` | `{ kitchenId?, id?, name: LocalizedReq }` | `{ id }` | `invalid` |
| `deleteCategory` | `{ kitchenId?, id }` | deleted | `category_not_empty` |
| `reorderCategories` | `{ kitchenId?, ids: uuid[] }` | saved | `invalid` (ids must be exactly the kitchen's categories) |
| `saveDish` | `{ kitchenId?, id?, categoryId, name: LocalizedReq, description: LocalizedOpt, priceRupees: int 1–100000, isVeg, available, photo?: File \| null }` | `{ id, missingLanguage?: 'en' \| 'kn' }` | `invalid`; `pure_veg_kitchen`; `invalid_image` |
| `setDishAvailable` | `{ kitchenId?, id, available }` | saved | `invalid` |
| `deleteDish` | `{ kitchenId?, id }` | deleted | none |
| `reorderDishes` | `{ kitchenId?, categoryId, ids: uuid[] }` | saved | `invalid` |

## Admin: agents (`src/features/agents`)

| Action | Input | Success | Errors |
|---|---|---|---|
| `saveAgent` | `{ id?, name, phone, vehicleType, vehicleReg? }` | `{ id }` | `invalid`; `agent_phone_taken { agentName }` |
| `setAgentActive` | `{ id, active }` | updated; deactivating deletes the agent's sessions | none |

## Read models (server-side queries, not actions)

| Query | Used by | Notes |
|---|---|---|
| `listKitchensForCustomer({ type?, pureVeg?, openNow?, dishFilter, now })` | `/` | Active only; open kitchens first, then by localised name |
| `getKitchenForCustomer(id, dishFilter)` | `/kitchens/[id]` | null unless active; categories with no matching dishes omitted |
| `searchForCustomer(q, dishFilter)` | `/search` | R9 |
| `getPartnerDashboard(kitchenId)` | `/partner` | status, reason, state, missing-language counts |
| `listKitchensForAdmin({ status?, type?, q? })` | `/admin/partners` | q matches either name or any contact or sign-in phone |
