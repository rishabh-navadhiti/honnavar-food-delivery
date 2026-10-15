# Quickstart: Ordering (002)

A run-and-validate guide for the ordering milestone. It lists commands and expected outcomes only.
Behaviour is in [spec.md](./spec.md), screens in [contracts/routes.md](./contracts/routes.md), data
in [data-model.md](./data-model.md). Setup is the same as
[001 quickstart](../001-platform-core/quickstart.md).

## Environment

Copy `.env.example` to `.env.local`. The 001 variables are unchanged. New variables (all validated
at startup, all with working defaults):

| Variable | Demo value | Purpose |
|---|---|---|
| `DELIVERY_FEE_RUPEES` | `30` | Flat delivery fee on every order |
| `DELIVERY_MINUTES` | `15` | Added to the kitchen's preparation minutes for "Expected by" |
| `ACCEPT_WINDOW_MINUTES` | `10` | After this, an unanswered order is rejected automatically |
| `GEOCODING_PROVIDER` | `nominatim` | `stand-in` for offline work and tests |
| `NOMINATIM_BASE_URL` | `https://nominatim.openstreetmap.org` | Map search and address lookup |
| `GEOCODING_CONTACT` | project repository URL | Sent in the User-Agent, as Nominatim's policy requires |
| `MAP_TILE_URL` | `https://tile.openstreetmap.org/{z}/{x}/{y}.png` | Map tiles |
| `MAP_TILE_ATTRIBUTION` | `© OpenStreetMap contributors` | Shown on every map |

## Run

```bash
npm install
docker compose up -d db
npm run demo:reset             # also restores addresses, demo orders and messages
npm run dev                    # http://localhost:3000
```

## Check gates (all must pass before claiming done)

```bash
npm run lint
npm run typecheck
npm test                       # unit + integration (TEST_DATABASE_URL)
npm run build
npm run test:e2e               # RESETS the DATABASE_URL database; geocoding uses the stand-in
```

The e2e web server runs with `GEOCODING_PROVIDER=stand-in`, blocks map-tile requests, and uses
Chromium's fake microphone, so the suite needs no network beyond localhost.

## Demo walkthrough: four screens (US1 to US5)

Run a reset just before the demo. Use four browser windows (or phones): **customer** and
**partner** at 360 px, **admin** at desktop width, **agent** at 360 px. Demo numbers and the fixed
code are on every sign-in screen. Run the demo during the chosen kitchen's opening hours (or set
its hours as admin first). Pick subjects by catalogue flags and keys, as in 001.

| Step | Screen | Do | Expect |
|---|---|---|---|
| 0 | Partner | Sign in as the kitchen of `demo-placed`; tap "Turn on order sounds" | `demo-placed` is highlighted with time left, and the tone repeats until you open it |
| 1 | Partner | Open `demo-placed` → Accept → Preparing → Ready | Status moves at each tap |
| 2 | Customer | Guest: open an open kitchen → Add two dishes → cart bar | Bill: item total + ₹30 + grand total; the kitchen page shows "40–50 min" for a 25-minute kitchen |
| 3 | Customer | "Sign in to check out" → demo customer | Back on `/cart` with the same cart, last address and payment preselected |
| 4 | Customer | Choose UPI → Place order → confirm the demo sheet | Order page: number `#10xx`, "Paid by UPI (demo)", "Expected by", timeline at "Placed", map with kitchen and delivery markers |
| 5 | Partner | (any partner screen, sound on) | Within 15 s: tone plus a banner for the new order; Accept it |
| 6 | Customer | Keep the order page open | Within 15 s: "Accepted" with its time; no refresh needed |
| 7 | Admin | `/admin/orders` | The new order under "Needs agent", plus `demo-needs-agent`; assign the first active agent (shows its undelivered count) |
| 8 | Agent | Sign in as that agent | Today's count and cash (from `demo-delivered`); the new order and `demo-ready` listed |
| 9 | Partner | Mark the new order Preparing → Ready | Agent screen enables "Picked up" within 15 s |
| 10 | Agent | Open the order → "Open delivery location in maps" | The phone's map app opens with directions to the pin |
| 11 | Agent | Picked up → Delivered | Customer timeline ends at "Delivered"; the board moves it to "Finished" |
| 12 | Agent | Open `demo-ready` → Picked up → Delivered → confirm "Collected ₹…" | Today's cash grows by that order's grand total |
| 13 | Each role | Open Messages | Entries for every update above, labelled "Demo: not sent by SMS or WhatsApp", in the selected language |
| 14 | Any | Switch to ಕನ್ನಡ on each screen | All new text in Kannada; times like "ಮಧ್ಯಾಹ್ನ 1:30"; dish and kitchen names with fallback markers where needed |

Target: steps 2 to 11 in under five minutes (SC-002).

## Further validation scenarios

| # | Steps | Expected | Spec |
|---|---|---|---|
| 1 | Add a dish from a second kitchen | Replace prompt; cancelling keeps the cart | FR-002 |
| 2 | As partner, mark a carted dish unavailable, then place the order | Not placed; the cart shows what changed | FR-012 |
| 3 | Double-tap "Place order" on a slow connection (DevTools throttling) | One order | FR-013 |
| 4 | Add an address: deny location → search "bus stand" → move the pin → Continue → fill details, record a 5 s voice note, label Work | Saved; pin starts at Honnavar centre; text under the pin updates after the pin settles; the voice note plays back | FR-053–FR-055 |
| 5 | Set `NOMINATIM_BASE_URL` to an unreachable URL, restart, add an address | "Address could not be looked up"; the pin can still be placed and saved | FR-056 |
| 6 | Leave `demo-placed` unanswered for `ACCEPT_WINDOW_MINUTES`, then open any screen listing it | Rejected, "Kitchen did not respond", event by "system"; the customer has a message | FR-020 |
| 7 | Customer cancels a Placed order; then tries to cancel an Accepted one | First cancels; no cancel button on the second | FR-027 |
| 8 | Admin reassigns an assigned order; the first agent's open order page refreshes | It says reassigned, with no actions | US4 scenario 9 |
| 9 | Admin tries to deactivate the agent holding `demo-ready` | Refused, listing the order number | FR-036 |
| 10 | Two windows as the same partner: both tap Accept on one order | One succeeds; the other sees "already accepted" | FR-021 |
| 11 | Open another customer's `/orders/<id>`, another kitchen's `/partner/orders/<id>`, and a voice-note URL while signed out | Not found each time | FR-049, FR-055 |
| 12 | Run `npm run demo:reset` twice and compare `/admin/orders` | Same orders, same numbers, same states | SC-009 |

A reset between midnight and about 01:30 IST puts some seeded orders on the previous day, so the
"today" totals start lower. Reset later for the demo.
