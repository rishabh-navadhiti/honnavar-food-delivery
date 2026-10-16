# Routes: Visual Refresh (003)

No route is added, removed or renamed for users. Every 001 and 002 screen keeps its URL, data,
actions and permissions ([002 routes](../../002-ordering/contracts/routes.md)). One read-only route
handler is added.

## GET `/api/search/suggestions`

Suggestions while typing on the home search (FR-012, R7).

| | |
|---|---|
| Auth | None (public, like the home screen and search) |
| Query | `q`: string, NFC-normalised, trimmed, 2–80 characters (Zod; anything else → empty result, status 200) |
| Context | Dish filter and locale from the existing validated cookies; current time from the server |
| Calls | `searchForCustomer({ q, dishFilter, now, locale })`, then `toSuggestions` ([data-model](../data-model.md#suggestions-search-while-typing-r7)) |
| 200 body | `{ kitchens: [...], dishes: [...], total: { kitchens, dishes } }` |
| Headers | `Cache-Control: no-store` (results depend on open state) |
| Errors | Unexpected failure → 500 with `{ error: 'unavailable' }`, logged with context; the client shows nothing and the normal search still works |

Client behaviour: from the second character, request 150 ms after the last keystroke and abort
earlier requests. A kitchen suggestion links to `/kitchens/<id>`; a dish suggestion links to
`/kitchens/<kitchenId>#dish-<dishId>`. Enter or the Search button submits the existing GET form to
`/` unchanged.

Integration test: a valid query returns the same kitchens and dishes (capped) as `searchForCustomer`
for the same input; queries under 2 or over 80 characters return empty lists; the dish filter
cookie is honoured.

## Screens: structure changes only

| Surface | Screen | Change (presentation only) |
|---|---|---|
| Customer | all | Slim top bar (wordmark, mark, language); four-tab bottom bar per page (R5); content padded above it |
| Customer | `/` home | Search box with suggestions; filter chips; dish filter; kitchen rows (R12); illustrated empty state |
| Customer | `/kitchens/[id]` | Hero photo, compact header card, address and hours in `<details>`, dish rows with `id="dish-<id>"` |
| Customer | `/cart` | Sections for lines, bill, address, payment; place-order bar replaces the tabs when the cart has items (R6) |
| Customer | `/orders/[id]` | Status and expected time first, timeline, map with Coast pins, items and bill |
| Customer | `/orders`, `/messages`, `/account`, `/addresses/**`, `/login`, `/search` | Restyled; Messages and Addresses reached from Account |
| Partner | layout | Top bar with the mark and language; sound prompt or pill (R9); bottom navigation with icons |
| Partner | `/partner/orders`, `/partner/orders/[id]` | Cards per R11; reject step as a sheet |
| Partner | day, menu, hours, kitchen, messages, login | Restyled in the shared language |
| Agent | home, order page, messages, profile, login | Two figures; partner card language; pickup and delivery sections |
| Admin | layout | Top navigation instead of the side column |
| Admin | `/admin/orders` board, `/admin/orders/[id]` | Full-width columns, cards per R11 |
| Admin | partners, menus, hours, agents | Restyled tables and forms |
| All | `loading.tsx`, `error.tsx`, `not-found.tsx` | Shaped skeletons and illustrated states (R10) |
