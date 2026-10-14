# Contract: Routes and Screens

Every route is server-rendered, with no locale prefix. The language comes from the `locale` cookie
(see [research R2](../research.md#r2-internationalisation-library)). Each surface is a route group
in `src/app/` with its own layout, sign-in screen and session cookie.

Every screen has loading, empty, error and not-found states (FR-047) and a visible language
switch (FR-012).

## Customer surface: route group `(customer)`, mobile-first

| Path | Auth | Purpose | Spec |
|---|---|---|---|
| `/` | Guest OK | Home: active kitchens, kitchen filters, dish filter, search box | US1, US5, FR-039, FR-042, FR-043 |
| `/?type=restaurant\|home_kitchen\|cloud_kitchen&pureVeg=1&open=1` | Guest OK | Kitchen filters as search params (combinable) | FR-042 |
| `/search?q=` | Guest OK | Kitchen and dish results, honouring the dish filter | FR-044, FR-045 |
| `/kitchens/[id]` | Guest OK | Kitchen page: hours, tap-to-call (`tel:` link), menu by category. Not-found unless the kitchen is active | FR-041, FR-023 |
| `/login` | Guest | Phone → code → signed in; demo panel when `DEMO_MODE` | US2, FR-003–FR-005, FR-011 |
| `/account` | Customer | Phone number, display name, sign out | FR-010 |

## Partner surface: route group `(partner)`, prefix `/partner`, mobile-first

| Path | Auth | Purpose | Spec |
|---|---|---|---|
| `/partner/login` | Guest | Sign-in for numbers on a kitchen sign-in list | FR-006, FR-053 |
| `/partner` | Partner | Dashboard: status notice (pending/suspended + reason), open state, temporary close/reopen, missing-translation count | US3, FR-031, FR-036, FR-037 |
| `/partner/menu` | Partner | Categories and dishes list; reorder; availability switches | FR-033, FR-034 |
| `/partner/menu/categories/new`, `/partner/menu/categories/[id]` | Partner | Category form | FR-033 |
| `/partner/menu/dishes/new?category=`, `/partner/menu/dishes/[id]` | Partner | Dish form (bilingual, price, veg mark, photo, available) | FR-034, FR-035 |
| `/partner/hours` | Partner | Weekly hours editor | FR-032 |
| `/partner/kitchen` | Partner | Read-only kitchen profile (admin-managed fields) | FR-038 |

## Agent surface: route group `(agent)`, prefix `/agent`, mobile-first

| Path | Auth | Purpose | Spec |
|---|---|---|---|
| `/agent/login` | Guest | Sign-in for active registered agents | FR-006, FR-007 |
| `/agent` | Agent | "No deliveries yet" screen | FR-046 |
| `/agent/profile` | Agent | Name, phone, vehicle | FR-046 |

## Admin surface: route group `(admin)`, prefix `/admin`, desktop-first

| Path | Auth | Purpose | Spec |
|---|---|---|---|
| `/admin/login` | Guest | Sign-in for seeded admins | FR-006 |
| `/admin` | Admin | Redirects to `/admin/partners` | |
| `/admin/partners?status=&type=&q=` | Admin | Partner list, filters, search by name (either language) or any phone | FR-024 |
| `/admin/partners/new` | Admin | Create kitchen (profile, contacts, sign-in list, hours, photo) | FR-019, FR-053 |
| `/admin/partners/[id]` | Admin | Edit profile; status changes; verification; sign-in list | FR-019–FR-022, FR-053 |
| `/admin/partners/[id]/menu`, `.../menu/categories/...`, `.../menu/dishes/...`, `/admin/partners/[id]/hours` | Admin | The same menu and hours editors as the partner surface, targeting any kitchen; shows last changed by and when | FR-054, FR-055 |
| `/admin/agents`, `/admin/agents/new`, `/admin/agents/[id]` | Admin | Agent list, create, edit, active switch | FR-026, FR-027 |

The menu and hours editor components are shared between `/partner/...` and
`/admin/partners/[id]/...`. Only the kitchen id source differs: the partner's session, or the route
param for admins.

## Route handlers

| Method and path | Auth | Response |
|---|---|---|
| `GET /media/[id]/[variant]` (`variant` = `s`\|`l`) | Public | `image/webp`, `Cache-Control: public, max-age=31536000, immutable`; 404 if missing |

## Auth redirects

- A protected path without a valid session for **that surface** redirects to that surface's
  `/login`, carrying a `next` param that is restricted to same-surface paths.
- An invalid session (e.g. agent deactivated, number removed from the sign-in list) is deleted and
  treated as missing (FR-007, FR-053).
