# Quickstart: Visual Refresh (003)

A run-and-validate guide. Behaviour is unchanged from 002 ([002 quickstart](../002-ordering/quickstart.md));
the reference look is [`design/a-coast/`](./design/a-coast/index.html) with the owner's edits in
[spec.md](./spec.md#clarifications).

## Run

```bash
npm install                    # adds lucide-react
docker compose up -d db
npm run demo:reset
npm run dev                    # http://localhost:3000
```

No new environment variables. `npm run build` fetches Anek Kannada once (as it fetched Noto
before); pages never request an outside font service.

## Check gates (all must pass before claiming done)

```bash
npm run lint
npm run typecheck
npm test                       # 350 existing + new unit/integration tests
npm run build
npm run test:e2e               # existing 31 + the layout checks (RESETS the DATABASE_URL database)
```

The `layout` project checks, for home, kitchen, cart, order page, partner orders (360 and 390 px)
and the admin board (1280 px), in English and Kannada: no sideways scroll, 48 px targets, at most
one fixed bar top and bottom within 18% of 360×780, kitchen and partner card counts, and the
four-tap cash order.

## Screenshot set (owner and planning reviews)

```bash
npm run screens                # resets demo data; writes screens/<surface>/<route>-<width>-<locale>.png
open screens/index.html        # contact sheet
```

Customer, partner and agent at 360 and 390 px, admin at 1280 px, both languages, plus the states
listed in research R14. Not part of the gate.

## Review walkthrough (compare with the Coast reference)

| # | Screen | Do | Expect |
|---|---|---|---|
| 1 | Home, 390 px | Open | One slim top bar, one tab bar; three kitchen rows with landmark lines visible (four at 430 px) |
| 2 | Home | Type "pr" | Kitchens and dishes suggested within a second; a dish opens its kitchen at that dish, tinted |
| 3 | Kitchen | Open; tap "Address and hours" | Compact header with badges and estimate; details expand without moving the header |
| 4 | Kitchen | Add two dishes | Cart tab reads "Cart · ₹…" with a count; no in-page cart bar |
| 5 | Cart (signed in) | Open from the Cart tab | Place-order bar replaces the tabs; Place order → order page (four taps from home) |
| 6 | Order page, then home | Watch; go home; tap Orders | Status first; elsewhere the tab reads "Orders · <status>" and opens the list with this order first |
| 7 | Partner orders, 390 px | First visit; tap the prompt; reload | Full prompt once, then the pill; three cards visible; card shows item total, name, landmark, rider note |
| 8 | Partner | Reject the waiting order | Sheet with four reasons, note, Back and Reject, no scrolling at 390×844 |
| 9 | Admin board, 1280 px | Open | Five columns, no sideways scroll; colour only in chips and group icons; assign on the card |
| 10 | Agent home and order | Open | Two figures; pickup and delivery sections with call and open in maps |
| 11 | Any | Switch to ಕನ್ನಡ | Same layouts; Kannada not clipped or smaller |
| 12 | Any | Turn on "reduce motion" in the OS | No transitions |
| 13 | Any list | Slow 3G in DevTools | Shaped skeletons, no jump when content arrives |
