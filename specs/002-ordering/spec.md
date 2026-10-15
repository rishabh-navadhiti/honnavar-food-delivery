# Feature Specification: Ordering

**Feature Branch**: `002-ordering`

**Created**: 2026-10-15

**Status**: Draft

**Input**: User description: "Ordering: a customer can order from one kitchen and every role sees the
same order move through its lifecycle. First demo milestone: customer places, partner accepts,
admin assigns an agent, agent picks up and delivers, customer watches the status and a map."
(full description in the `/speckit-specify` request for 002)

**Sources**: PRD in `docs/prd/`; capability status in `docs/fidelity-matrix.md`; builds on
`specs/001-platform-core/spec.md` (accounts, kitchens, menus, hours, agents).

## Clarifications

### Session 2026-10-15

- Q: How does a delivery address get its place on the map? → A: Customers keep saved addresses in
  their account and can add more. At checkout they pick a saved address; with none saved they are
  guided to add one. Adding an address starts on a map screen: a search box, a clear "use current
  location" button, the pin starting on the current location when permitted (else Honnavar town
  centre), and the address under the pin shown as text, then Continue. The next screen asks for
  house or door number or house name (required), street or area line (optional), landmark (text,
  required), an optional voice note for the landmark (recorded and stored with the address, never
  transcribed in the POC; declared stand-in) and a label: Home, Work or Other. Map search and the
  address under the pin use OpenStreetMap's free search service, with a stand-in for tests; no paid
  keys.
- Q: What happens when the partner does not accept or reject within the window? → A: The order is
  rejected automatically with the reason "Kitchen did not respond". The window is a per-deployment
  setting (demo: 10 minutes). The seeded Placed order is stamped with the reset time so it is fresh
  after every reset.
- Q: When can the admin assign an agent, and does pickup need "Ready"? → A: Assignment is allowed
  any time from acceptance until pickup, independent of the kitchen's progress; the agent can mark
  picked up only once the kitchen has marked the order Ready.
- Added by the product owner in the same session: an expected delivery time as a declared stand-in.
  Each kitchen has preparation minutes set by an admin (default 25), plus one flat delivery-minutes
  setting (default 15); the order page shows "Expected by" and the kitchen page shows a range.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Place an order from one kitchen (Priority: P1)

A customer browsing a kitchen taps "Add" on dishes, adjusts quantities, and opens the cart, which
shows the item total, a flat delivery fee and the grand total. They can browse as a guest; only
when they go to checkout are they asked to sign in, and they come straight back to checkout with
their cart intact. At checkout they choose a saved delivery address (or add one by placing a pin
on a map and then entering the house details and a landmark), choose UPI or cash on delivery, and
place the order. UPI shows a confirmation sheet, clearly labelled as a demo, that always succeeds
without charging anything. The customer then sees their order with its number, items, bill,
current status and expected delivery time.

**Why this priority**: Placing an order is the start of the demo milestone and of every other
story's real data.

**Independent Test**: From the demo state, as a guest on a 360px-wide screen, add two dishes from an
open kitchen, check out, sign in with the demo customer, pick a saved address, pay by UPI and see
the placed order.

**Acceptance Scenarios**:

1. **Given** an open kitchen's page, **When** the customer taps "Add" on a dish, **Then** the dish
   is in the cart with quantity 1 and a cart summary (item count and item total) stays visible on
   the page.
2. **Given** a cart, **When** the customer increases or decreases a dish's quantity, **Then** the
   item total and grand total update; decreasing to zero removes the dish.
3. **Given** a cart with dishes from kitchen A, **When** the customer adds a dish from kitchen B,
   **Then** they are asked whether to replace the cart; confirming empties the cart and adds the
   new dish, cancelling leaves the cart unchanged.
4. **Given** a cart, **When** the customer views it, **Then** they see each dish with price,
   quantity and line amount, the item total, the flat delivery fee and the grand total (item total
   plus delivery fee), all in rupees.
5. **Given** a guest with a cart, **When** they tap checkout, **Then** they are asked to sign in and,
   after signing in, return to checkout with the same cart.
6. **Given** a signed-in customer with no saved address, **When** they reach checkout, **Then**
   they are guided to add one before placing the order, and it is saved to their account.
7. **Given** the add-address map screen, **When** it opens, **Then** the pin starts at the phone's
   current location if the customer allows it, otherwise at Honnavar town centre, and the address
   under the pin is shown as text and updates when the pin moves.
8. **Given** the add-address map screen, **When** the customer searches for a place or taps "Use
   current location", **Then** the map and pin move there; if location is refused, a message
   explains and the pin stays where it was.
9. **Given** the customer taps Continue on the map screen, **When** the details screen opens,
   **Then** they enter house or door number or house name (required), street or area (optional),
   landmark (required), a note for the rider (optional), an optional voice note for the landmark
   (record, play back, re-record or delete) and a label (Home, Work or Other); saving without a
   required field is blocked with a message on that field.
10. **Given** a customer with several saved addresses, **When** they reach checkout, **Then** the
    address used last is preselected and they can pick another or add a new one.
11. **Given** checkout with cash on delivery chosen, **When** the customer taps "Place order",
    **Then** the order is placed with status "Placed" and the customer sees the order page with an
    "Expected by" time.
12. **Given** checkout with UPI chosen, **When** the customer taps "Place order", **Then** a
    confirmation sheet shows the amount and states that this is a demo and nothing will be charged;
    confirming places the order marked "Paid by UPI (demo)", and closing the sheet returns to
    checkout without placing anything.
13. **Given** a kitchen that is closed or temporarily closed, **When** the customer views its menu,
    **Then** "Add" buttons are unavailable and the page says when the kitchen opens.
14. **Given** an active kitchen's page, **When** the customer views it, **Then** it shows the
    expected delivery time as a range in minutes.
15. **Given** a cart, **When** at placing time the kitchen has closed, a dish has become
    unavailable or been removed, or a price has changed, **Then** the order is not placed and the
    customer sees what changed, with the cart updated to match, before they can try again.
16. **Given** an order was placed, **When** the customer returns to the app later, **Then** they
    can reach every ongoing order from a visible "Orders" entry, and the cart is empty.

---

### User Story 2 - Partner receives and prepares orders (Priority: P1)

A food partner keeps the partner app open during service. When a new order arrives, an alert sound
plays and a highlighted card appears. The partner sees the order number, the dishes and
quantities, the customer's display name and any rider note, and accepts the order or rejects it
with a reason. Accepted orders are marked "Preparing" and then "Ready". A day view shows today's
orders and totals.

**Why this priority**: Without the kitchen accepting, no order moves; the loud alert is the PRD's
key partner need.

**Independent Test**: From the demo state, sign in as the partner of the kitchen with the seeded
"Placed" order, hear the alert, accept, mark Preparing and Ready; place a second order as a customer
and reject it with a reason; check the day view.

**Acceptance Scenarios**:

1. **Given** the partner app is open on the orders screen, **When** a customer places an order at
   that kitchen, **Then** within 15 seconds, without refreshing, a highlighted new-order card
   appears and an alert sound plays, repeating until the partner opens, accepts or rejects that
   order.
2. **Given** the partner's phone or browser has not allowed sound yet, **When** the orders screen
   is open, **Then** a clear prompt asks the partner to tap once to turn on order sounds, and new
   orders remain visually highlighted whether or not sound is on.
3. **Given** a placed order, **When** the partner accepts it, **Then** its status becomes
   "Accepted" and the customer, admin and partner screens show it within 15 seconds.
4. **Given** a placed order, **When** the partner rejects it, **Then** they must choose a reason
   (kitchen too busy, item not available, kitchen closing, or other with a note), the status
   becomes "Rejected", and the customer sees the reason.
5. **Given** a placed order, **When** the acceptance window (demo: 10 minutes) passes without a
   response, **Then** the order is rejected automatically with the reason "Kitchen did not
   respond", the customer is told, and the partner sees it as rejected with that reason.
6. **Given** an accepted order, **When** the partner taps "Preparing" and later "Ready", **Then**
   the status changes each time and the change is visible to the other roles within 15 seconds.
7. **Given** the partner app, **When** the partner opens the day view, **Then** they see today's
   orders newest first with number, time, status and amount, plus totals: orders received,
   accepted, rejected or cancelled, delivered, and the food value (item totals) of delivered
   orders.
8. **Given** a partner of kitchen A, **When** they try to see or act on an order of kitchen B,
   **Then** they are refused.
9. **Given** an order that was cancelled by the customer or an admin, **When** the partner views
   it, **Then** it shows as cancelled with who cancelled it and no actions remain.

---

### User Story 3 - Admin dispatches orders to agents (Priority: P1)

An operations team member watches a simple dispatch board on a desktop browser. It groups all of
today's orders by where they are: waiting for the kitchen, needing an agent, assigned, out for
delivery, and finished. The admin assigns an active agent to an accepted order, can reassign it
before pickup, and can cancel any unfinished order with a reason. Each order shows its full
history: every status change with who made it and when.

**Why this priority**: Manual dispatch is how the pilot runs (PRD rollout); without it no agent
receives an order.

**Independent Test**: From the demo state, sign in as the demo admin, find the seeded accepted
order under "Needs agent", assign the demo agent, reassign to the other active agent, and cancel a
different order with a reason.

**Acceptance Scenarios**:

1. **Given** the dispatch board, **When** the admin opens it, **Then** today's orders appear in
   groups (waiting for kitchen, needs agent, assigned, out for delivery, finished), each card
   showing order number, kitchen, delivery landmark, amount, payment method, time since placing,
   and the assigned agent if any; the board updates within 15 seconds without refreshing.
2. **Given** an accepted, preparing or ready order with no agent, **When** the admin assigns an
   active agent, **Then** the order moves to "assigned" and appears on that agent's app within
   15 seconds.
3. **Given** the assign control, **When** the admin chooses an agent, **Then** only active agents
   are offered, each with the number of undelivered orders they already hold.
4. **Given** an assigned order not yet picked up, **When** the admin reassigns it to another active
   agent, **Then** it leaves the first agent's app and appears on the second's.
5. **Given** an order that has been picked up, **When** the admin views it, **Then** reassignment
   is not offered.
6. **Given** any order that is not delivered, rejected or cancelled, **When** the admin cancels it,
   **Then** they must choose a reason (customer request, kitchen issue, no agent available,
   delivery problem, or other with a note), the status becomes "Cancelled", and the customer,
   partner and agent (if any) see it with the reason.
7. **Given** an order, **When** the admin opens it, **Then** they see the customer's name and
   number, the kitchen, items, bill, payment method, delivery address, landmark and rider note, and
   the history of every change with who and when.
8. **Given** a placed order, **When** the admin tries to assign an agent, **Then** this is not
   offered until the kitchen accepts.
9. **Given** an agent who holds an undelivered order, **When** the admin tries to mark the agent
   inactive, **Then** this is refused with a message listing the orders to reassign or finish
   first.

---

### User Story 4 - Agent picks up and delivers (Priority: P1)

A delivery agent opens their app and sees the orders assigned to them. For each one they can open
the kitchen and the delivery location in their phone's map app, call the kitchen or the customer,
mark the order picked up once the kitchen has it ready, and mark it delivered. For cash on
delivery they confirm the cash collected. Their home shows today's delivery count and cash
collected.

**Why this priority**: Delivery completes the demo milestone.

**Independent Test**: From the demo state, sign in as the demo agent, open the seeded ready order,
open both locations in the map app, mark picked up and delivered, confirm the cash, and see today's
totals increase.

**Acceptance Scenarios**:

1. **Given** a signed-in agent with assigned orders, **When** they open their app, **Then** they
   see each undelivered assigned order with order number, kitchen name and landmark, delivery
   landmark, status, and the amount to collect for cash orders; with none, they see "No deliveries
   yet".
2. **Given** an assigned order, **When** the agent opens it, **Then** they see the kitchen's name,
   address, landmark and call button, the items to collect, the customer's name and call button,
   the delivery address (house, street or area, landmark, label), the rider note, a play button for
   the landmark voice note if there is one, and the payment method with the amount to collect.
3. **Given** an assigned order, **When** the agent taps "Open kitchen in maps" or "Open delivery
   location in maps", **Then** the phone's map app opens at that location.
4. **Given** an assigned order the kitchen has marked "Ready", **When** the agent taps "Picked up",
   **Then** the status becomes "Picked up" and the customer sees it within 15 seconds.
5. **Given** an assigned order the kitchen has not marked "Ready", **When** the agent views it,
   **Then** "Picked up" is not available and the screen says the kitchen is still preparing.
6. **Given** a picked-up cash-on-delivery order, **When** the agent taps "Delivered", **Then** they
   must confirm "Collected ₹<grand total> in cash" before the order is marked delivered.
7. **Given** a picked-up UPI order, **When** the agent taps "Delivered", **Then** the order is
   marked delivered without any cash step.
8. **Given** the agent delivered orders today, **When** they view their home, **Then** they see
   today's delivery count and today's cash collected (the sum of delivered cash orders).
9. **Given** an order reassigned away from the agent or cancelled, **When** the agent's app next
   updates, **Then** the order leaves their list and, if they had it open, the screen says it was
   reassigned or cancelled (with the reason) and offers no actions.

---

### User Story 5 - Follow my order on status and map (Priority: P2)

After placing an order, the customer sees a status timeline (Placed, Accepted, Preparing, Ready,
Agent assigned, Picked up, Delivered) with the time of each step, updating on its own while the
screen is open. A static map shows where the kitchen is and where the order is going. Once an
agent is assigned, the customer sees the agent's name and can call them. Before the kitchen accepts,
the customer can cancel.

**Why this priority**: Watching the status is the end of the demo story, but the order works
without it being visible to the customer.

**Independent Test**: Place an order, keep its page open while the partner, admin and agent move it
through every step, and confirm each step appears with its time and the map shows both locations.

**Acceptance Scenarios**:

1. **Given** the customer's order page is open, **When** another role changes the order's status,
   **Then** the timeline shows the new step and its time within 15 seconds without refreshing.
2. **Given** an order page, **When** it loads, **Then** a static map shows a kitchen marker and a
   delivery-location marker, labelled in the selected language; it does not move or track anyone.
3. **Given** an order with an assigned agent, **When** the customer views it, **Then** they see the
   agent's name and a call button.
4. **Given** an order that is not finished, **When** the customer views it, **Then** it shows
   "Expected by" with the time set when the order was placed.
5. **Given** a placed order not yet accepted, **When** the customer taps "Cancel order" and
   confirms, **Then** the order is cancelled and the partner sees it cancelled; for a UPI order the
   page notes that nothing was charged in this demo.
6. **Given** an order the kitchen has accepted, **When** the customer views it, **Then** no cancel
   option is shown, and a call-the-kitchen button is available.
7. **Given** a rejected or cancelled order, **When** the customer views it, **Then** they see the
   reason and, for UPI orders, that nothing was charged in this demo.

---

### User Story 6 - Message log instead of SMS and WhatsApp (Priority: P3)

Every status update that would reach a person by SMS or WhatsApp in the real product appears
instead in an in-app "Messages" list for that person, each entry labelled as a demo message that
was not sent.

**Why this priority**: It shows reviewers which updates people would receive, without any
messaging provider; the order flow works without it.

**Independent Test**: Run one order through its lifecycle and check the messages each of the
customer, partner and agent received.

**Acceptance Scenarios**:

1. **Given** an order moves through its lifecycle, **When** the customer opens "Messages", **Then**
   they see one entry for each of: placed, accepted or rejected (with reason), preparing, picked
   up, delivered, and cancelled (with reason), newest first, each with time and order number.
2. **Given** a new order or a cancellation at a kitchen, **When** any partner on that kitchen's
   sign-in list opens "Messages", **Then** they see entries for new orders, agent assigned, and
   cancellations of that kitchen's orders.
3. **Given** an agent is assigned, unassigned by reassignment, or their order is cancelled,
   **When** the agent opens "Messages", **Then** they see an entry for each.
4. **Given** any message entry, **When** it is shown, **Then** it is in the viewer's selected
   language and labelled "Demo: not sent by SMS or WhatsApp".

---

### User Story 7 - Demo reset includes orders (Priority: P3)

The one-step demo reset from feature 001 also restores a set of orders in different states, saved
addresses for the demo customer, and map locations for every kitchen, so each story above can be
shown from a cold reset.

**Why this priority**: Required for repeatable demos and tests; no end-user value on its own.

**Independent Test**: Move orders around, run the reset, and confirm the seeded orders are back in
their seeded states with times that fall within today.

**Acceptance Scenarios**:

1. **Given** any state, **When** the reset is run, **Then** the seeded orders, addresses and
   messages return to the same states on every run, with order times placed shortly before the
   reset so they appear as today's orders.
2. **Given** the demo state, **When** a presenter signs in as the demo partner, admin or agent,
   **Then** each finds an order waiting for their next action (a placed order, an accepted order
   needing an agent, and a ready order assigned to the demo agent).

---

### User Story 8 - Order history and reorder (Priority: P4, optional)

A bonus, not required for this feature: the customer sees past orders under "Orders" and can
reorder one, which fills the cart with the same dishes from the same kitchen at current prices.

**Why this priority**: Supports the PRD's repeat-customer goal, but the user marked it a bonus.

**Independent Test**: With a delivered order in history, tap "Reorder" and see the cart filled with
available dishes at current prices.

**Acceptance Scenarios**:

1. **Given** a customer with finished orders, **When** they open "Orders", **Then** past orders
   are listed newest first below ongoing ones, with kitchen, date, amount and final status.
2. **Given** a past order, **When** the customer taps "Reorder", **Then** the cart is filled with
   that order's dishes that are still available, at current prices, replacing any existing cart
   after confirmation, and the customer is told about any dish left out.

---

### Edge Cases

- Adding a dish from a second kitchen asks before replacing; the cart never holds two kitchens.
- A dish's quantity is limited to 1–20 per order; the "+" stops at 20 with a message.
- The cart is kept on the device for guests and signed-in customers until the order is placed or
  the cart is cleared; it is not shared across devices.
- A kitchen that is suspended while a dish of it is in someone's cart: at checkout the cart is
  cleared with a message that the kitchen is no longer available.
- A dish edited by the partner after an order is placed: the order keeps the name, price and veg
  mark it had when placed.
- A dish with no Kannada name in the cart or an order shows the English name with the fallback
  marker, as on the menu.
- The partner accepts at the same moment the customer cancels (or two people act on one order):
  the first action wins and the other person sees that the order has already moved on, with its
  current status.
- An admin reassigns while the agent taps "Picked up": the first action wins; if the pickup
  happened first, reassignment is refused.
- A kitchen closes by its hours or is temporarily closed while it has orders in progress: those
  orders continue normally; only new orders are blocked.
- A kitchen suspended by an admin while it has orders in progress: those orders continue unless the
  admin cancels them.
- An order placed at a kitchen with no map location set: the map shows only the delivery location
  and the agent's "Open kitchen in maps" uses the kitchen's address and landmark text.
- The customer edits or deletes a saved address used by a past or ongoing order: the order keeps
  the address as it was when placed.
- The phone refuses location permission: the pin starts at Honnavar town centre and "Use current
  location" explains that location is off; the customer places the pin by hand or by search.
- The map search or address lookup service is slow or unavailable: the customer can still move
  the pin by hand and continue; the text under the pin says the address could not be looked up.
- The phone refuses microphone permission or cannot record: the voice note option says so and
  everything else on the address screen still works.
- The partner accepts at the moment the acceptance window ends: whichever is recorded first
  wins; the other is refused with the current status.
- A customer cannot place a second order while the cart is empty; placing the same cart twice by
  double-tapping creates only one order.
- On a slow or dropped connection, the order page, boards and agent list keep showing the last
  known status with a "last updated" time and retry on their own; placing an order never creates a
  duplicate on retry.
- Today's totals for partners and agents use the India Standard Time calendar day.

## Requirements *(mandatory)*

### Functional Requirements

**Cart**

- **FR-001**: Customers, signed in or not, MUST be able to add available dishes from an open kitchen
  to a cart, change quantities (1–20 per dish) and remove dishes.
- **FR-002**: A cart MUST hold dishes from one kitchen only; adding a dish from another kitchen MUST
  ask the customer to confirm replacing the cart.
- **FR-003**: The cart MUST show each dish's price, quantity and line amount, the item total, a flat
  delivery fee and the grand total (item total plus delivery fee), in rupees.
- **FR-004**: The delivery fee MUST be one flat amount for every order, set per deployment without
  code changes.
- **FR-005**: The cart MUST be kept on the device until the order is placed or the customer clears
  it, including across sign-in.
- **FR-006**: "Add" MUST be unavailable for dishes that are not available and for kitchens that are
  closed or temporarily closed.

**Checkout and payment**

- **FR-007**: Checkout MUST require the customer to be signed in; a guest at checkout MUST be sent to
  sign-in and returned to checkout with the same cart.
- **FR-008**: Customers MUST be able to keep several saved delivery addresses in their account, add
  them at checkout or from their account, and edit and delete them. At checkout they pick a saved
  address; with none saved they are guided to add one (FR-053 to FR-056).
- **FR-009**: Checkout MUST preselect the address used for the customer's last order (or the only
  one) and allow choosing another or adding one.
- **FR-010**: Customers MUST choose UPI or cash on delivery for each order.
- **FR-011**: UPI is a declared stand-in: choosing it MUST show a confirmation sheet with the amount
  and a statement that this is a demo and nothing will be charged; confirming MUST always succeed
  and place the order marked as paid by UPI (demo); dismissing MUST return to checkout without
  placing an order.
- **FR-012**: At placing time the system MUST re-check that the kitchen is Active and open, every
  dish is still on the menu and available, and prices are unchanged; if anything changed, the order
  MUST NOT be placed and the customer MUST see what changed with the cart updated.
- **FR-013**: Placing an order MUST be safe to repeat: a double tap or a retry after a dropped
  connection creates at most one order.
- **FR-014**: Each order MUST keep, as they were at placing time, the dish names (both languages),
  veg marks, prices, quantities, item total, delivery fee, grand total, payment method, expected
  delivery time and the delivery address (house, street or area, landmark, label, rider note, map
  location and voice note).
- **FR-015**: Each order MUST have a short order number that people can read out over the phone,
  unique across all orders.

**Order lifecycle**

- **FR-016**: An order's status MUST be one of: Placed, Accepted, Rejected, Preparing, Ready, Picked
  up, Delivered, Cancelled. Agent assignment is recorded alongside the status, not as a status: an
  agent can be assigned at any time from acceptance until pickup, independent of the kitchen's
  progress, and pickup requires both an assigned agent and status Ready.
- **FR-017**: Allowed transitions MUST be: Placed → Accepted or Rejected (partner), Rejected
  (automatically, per FR-020) or Cancelled (customer or admin); Accepted → Preparing (partner); Preparing → Ready (partner); Ready → Picked
  up (the assigned agent); Picked up → Delivered (the assigned agent); any status except Delivered,
  Rejected and Cancelled → Cancelled (admin). Every other change MUST be refused.
- **FR-018**: Every status change, assignment and reassignment MUST record who made it (customer,
  partner sign-in number, agent, admin, or the system for automatic rejection) and when, and this history MUST be visible to admins.
  Customers see each step's time; partners and agents see the current status and its time.
- **FR-019**: Rejection MUST require a reason from a fixed list (kitchen too busy, item not
  available, kitchen closing, other); "other" requires a short note. Admin cancellation MUST require
  a reason from a fixed list (customer request, kitchen issue, no agent available, delivery problem,
  other); "other" requires a short note. The reason MUST be shown to the customer and the other
  roles involved.
- **FR-020**: A partner MUST respond to a placed order within an acceptance window (a deployment
  setting; 10 minutes for the demo) and the partner screen MUST show the time left. When the window
  passes without a response, the order MUST be rejected automatically with the reason "Kitchen did
  not respond", recorded as made by the system, and the customer told as for any rejection.
- **FR-021**: When two actions on the same order race, the first MUST win and the second MUST be
  refused with a message showing the order's current status.
- **FR-022**: Status changes MUST appear on every open screen that shows the order (customer order
  page, partner orders, dispatch board, agent list) within 15 seconds without the user refreshing.
  Instant push is not part of this feature.
- **FR-023**: For orders that are rejected or cancelled after a UPI demo payment, the order MUST
  state that nothing was charged in this demo; refunds are not part of this feature.

**Customer order view**

- **FR-024**: Customers MUST be able to reach their ongoing orders from a visible "Orders" entry on
  every customer screen.
- **FR-025**: The order page MUST show the order number, kitchen (with call button), items, bill,
  payment method, delivery address and landmark, a status timeline with the time of each completed
  step, and, once assigned, the agent's name and a call button.
- **FR-026**: The order page MUST show a static map with a marker for the kitchen and one for the
  delivery location. The map MUST NOT track or move anyone.
- **FR-027**: Customers MUST be able to cancel their own order while it is Placed, after confirming;
  once accepted, cancelling is not offered.

**Partner**

- **FR-028**: The partner app MUST list the kitchen's open orders (placed, accepted, preparing,
  ready, picked up) with new placed orders highlighted, each showing order number, time placed,
  dishes and quantities, item total, payment method, the customer's display name (or "Customer"),
  and the rider note.
- **FR-029**: While the partner app is open, a new order MUST trigger an alert sound that repeats
  until the partner opens, accepts or rejects that order; where the device requires permission
  before playing sound, the app MUST show a one-tap prompt to turn sounds on. New orders MUST also be
  shown visually, so the alert never relies on sound alone.
- **FR-030**: Partners MUST be able to accept or reject placed orders, and mark accepted orders
  Preparing and then Ready, for their own kitchen only.
- **FR-031**: The partner app MUST have a day view listing today's orders newest first and showing
  totals: orders received, accepted, rejected or cancelled, delivered, and the item-total value of
  delivered orders.
- **FR-032**: Partners MUST NOT see the customer's phone number or delivery address beyond the
  landmark.

**Admin**

- **FR-033**: Admins MUST have a dispatch board showing today's orders grouped as: waiting for
  kitchen (Placed), needs agent (Accepted, Preparing or Ready with no agent), assigned (agent
  assigned, not picked up), out for delivery (Picked up), finished (Delivered, Rejected,
  Cancelled). Admins MUST also be able to open any earlier order by its number.
- **FR-034**: Admins MUST be able to assign an active agent to an order that is Accepted, Preparing
  or Ready, and reassign it to another active agent until it is picked up. The assign control MUST
  show each active agent's number of undelivered orders.
- **FR-035**: Admins MUST be able to cancel any order that is not Delivered, Rejected or Cancelled,
  with a reason per FR-019.
- **FR-036**: An admin MUST NOT be able to mark an agent inactive while the agent holds an
  undelivered order; the refusal lists those orders.
- **FR-037**: Admins MUST be able to set and change each kitchen's map location and preparation
  minutes (default 25) on the kitchen form.
- **FR-038**: The admin order view MUST show the customer's name and number, kitchen, items, bill,
  payment method, delivery address (house, street or area, landmark, label), rider note, landmark
  voice note playback, and the full history per FR-018.

**Agent**

- **FR-039**: The agent app MUST list the agent's undelivered assigned orders, replacing the "No
  deliveries yet" screen from feature 001 when there are any.
- **FR-040**: For each assigned order the agent MUST see the kitchen's name, address, landmark and a
  call button, the items, the customer's name and a call button, the delivery address (house,
  street or area, landmark, label), the rider note, a way to play the landmark voice note if there
  is one, and the payment method with the amount to collect.
- **FR-041**: The agent MUST be able to open the kitchen and the delivery location in the phone's
  own map app.
- **FR-042**: The assigned agent MUST be able to mark an order Picked up and then Delivered, within
  the transitions of FR-017; agents MUST NOT see or act on orders not assigned to them.
- **FR-043**: Delivering a cash-on-delivery order MUST require the agent to confirm collecting the
  grand total in cash; the collected amount is recorded with the delivery.
- **FR-044**: The agent's home MUST show today's delivery count and today's cash collected.

**Messages (SMS and WhatsApp stand-in)**

- **FR-045**: Updates that the real product would send by SMS or WhatsApp MUST instead be recorded
  in an in-app message list for each recipient, and no message is sent outside the app. Each entry
  MUST be labelled as a demo message that was not sent.
- **FR-046**: Messages MUST be recorded for: the customer on placed, accepted, rejected, preparing,
  picked up, delivered and cancelled; every number on the kitchen's sign-in list on new order, agent
  assigned and cancelled; the agent on assigned, reassigned away and cancelled.
- **FR-047**: Customers, partners and agents MUST each be able to open their message list, newest
  first, with time and order number; entries appear in the viewer's selected language.

**Language and states**

- **FR-048**: Every new screen on all four surfaces MUST be available in Kannada and English with
  full parity and a visible language switch, per feature 001's FR-012 to FR-018.
- **FR-049**: Every new screen MUST handle loading, empty, error and not-found states; a customer,
  partner or agent opening an order that is not theirs MUST see a not-found screen.

**Demo data**

- **FR-050**: The single reset step from feature 001 MUST also restore: a map location for every
  seeded kitchen and preparation minutes (default 25); two saved addresses with map locations for
  the demo customer; and at least these orders, all timed shortly before the reset so they count as
  today's: one Placed (stamped with the reset time, so its acceptance window starts fresh after
  every reset), one Accepted without an agent, one
  Ready assigned to a demo agent, one Picked up, one cash-on-delivery order Delivered by a demo
  agent, one Rejected and one Cancelled, with their histories and messages.
- **FR-051**: The seeded "Placed", "needs agent" and "Ready" orders MUST be at kitchens whose demo
  partner and the demo agent are listed on the sign-in screens' demo panels, so each role finds its
  next action immediately.

**Optional (bonus)**

- **FR-052** *(optional)*: Customers MAY see past orders under "Orders" and reorder one, filling the
  cart with its dishes that are still available at current prices, after confirming replacement of
  any existing cart, and being told about any dish left out.

**Saved addresses and map location** (numbered after the rest; they belong with FR-008)

- **FR-053**: Adding an address MUST start on a map screen with a search box, a clearly labelled
  "Use current location" button, and a pin that starts at the phone's current location when the
  customer allows it, otherwise at Honnavar town centre. The address under the pin MUST be shown as
  text and update when the pin moves. Continue leads to the details screen.
- **FR-054**: The details screen MUST ask for house or door number or house name (required), street
  or area line (optional), landmark as text (required), a note for the rider (optional), an
  optional voice note for the landmark, and a label: Home, Work or Other.
- **FR-055**: The landmark voice note is a declared stand-in for voice-assisted addresses: it MUST
  be recorded on the phone (up to 30 seconds), stored with the address, and playable by the
  customer, the assigned agent and admins; it is never transcribed or interpreted.
- **FR-056**: Map search and the address under the pin MUST use a free public map service with no
  paid keys. When it is unavailable, the customer MUST still be able to place the pin by hand and
  continue.

**Expected delivery time** (declared stand-in)

- **FR-057**: Each kitchen MUST have preparation minutes set by an admin (default 25), and the
  deployment MUST have one flat delivery-minutes setting (default 15).
- **FR-058**: When an order is placed, its expected delivery time MUST be set to the placing time
  plus the kitchen's preparation minutes plus the delivery minutes, and MUST NOT change afterwards.
  The order page MUST show "Expected by <time>" until the order is finished.
- **FR-059**: The kitchen page MUST show the expected delivery time as a range: from the kitchen's
  preparation minutes plus delivery minutes, to 10 minutes more (for example "40–50 min").

### Text Categories

Per Constitution Principle II, every new kind of text in this feature belongs to one category.

| Text | Category | Behaviour |
|---|---|---|
| Cart, checkout, order, dispatch board, agent and day-view labels, buttons, headings, empty/error/loading messages, validation messages | Interface string | Translated via keys; both languages required |
| Order statuses, "Agent assigned", dispatch groups, payment method names ("Cash on delivery"), "Paid by UPI (demo)", demo payment sheet text, "nothing was charged" notice | Interface string | Fixed values shown through translation keys, never as stored text |
| Rejection and cancellation reasons from the fixed lists | Interface string | Stored as a fixed value; shown in the viewer's language |
| Message-log entries | Interface string with values filled in (order number, amounts, reasons, kitchen and agent names) | Built from translation keys at display time, so each viewer reads them in their selected language; the "not sent" label is an interface string |
| Sound prompt, map labels for the kitchen and delivery markers, "Open in maps" | Interface string | Translated via keys |
| Dish names in the cart and on orders | Partner-authored content | Kept as the language pair from placing time; fallback to the other language with a marker |
| Kitchen names on orders, boards and messages | Partner-authored content | Language pair; fallback with a marker |
| Address labels (Home, Work, Other), "Use current location", "Expected by", delivery-time range, "Kitchen did not respond", voice-note controls, location and microphone permission messages | Interface string | Translated via keys; the label is stored as a fixed value |
| House or door number or house name, street or area line, landmark, rider note | User-generated text | Shown as entered |
| Landmark voice note | User-generated audio | Played back as recorded; never transcribed or translated |
| Address text shown under the map pin and map search results | Third-party map content | Shown as the map service provides it; not translated by this product |
| "Other" notes on rejection and cancellation | User-generated text | Shown as entered |
| Customer display name, agent name | User-generated text | Shown as entered |
| Place names drawn on the map background | Third-party map content (proper nouns) | Shown as the map provides them; not translated by this product |
| UPI, SMS, WhatsApp | Proper noun / brand name | Not translated |
| Order numbers, prices, totals, cash amounts, times, dates, countdown | System formatting | `kn-IN` / `en-IN` locale, Latin digits, ₹ symbol |

### Integration Fidelity

Per Constitution Principle III and `docs/fidelity-matrix.md` (the rows owned by 002 stay as listed
there; this feature adds rows for map search and address lookup, the landmark voice note and the
expected delivery time):

| Capability | Status in this feature | Notes |
|---|---|---|
| Cart, saved addresses, checkout | Real | |
| UPI payment | **Stand-in** | Confirmation sheet labelled as a demo; always succeeds; nothing is charged; no payment provider is contacted. |
| Cash on delivery | Real | The agent records cash collected; no money moves through the platform. |
| Order lifecycle across the four roles | Real | Updates appear within 15 seconds by periodic refresh; no instant push. |
| Manual delivery assignment and reassignment by admin | Real | |
| SMS / WhatsApp status updates | **Stand-in** | In-app message list per person, labelled "not sent"; no messaging provider is contacted. |
| Order map | **Stand-in** for live tracking | Static map with kitchen and delivery markers; the map itself is real, but nothing moves and no GPS is used. |
| Kitchen map location | Real | Admin sets it; seeded for demo kitchens. |
| Delivery location pin | Real | The customer places it on the map; "Use current location" reads the phone's location once, on request; nothing is tracked. |
| Map search and address under the pin | Real | OpenStreetMap's free search service; no paid keys. Automated tests use a deterministic stand-in. |
| Landmark voice note | **Stand-in** for voice-assisted addresses | Recorded, stored and played back; never transcribed. |
| Expected delivery time | **Stand-in** | Kitchen preparation minutes plus a flat delivery time; not based on distance, traffic or kitchen load, and not updated after placing. |
| Open in the phone's map app | Real | Hands the location to the phone's own map app; no maps account or paid service. |
| New-order alert for partners | **Stand-in** for push | Repeating in-app sound and highlight while the app is open; nothing when it is closed. |
| Call kitchen, customer or agent | Real | Uses the phone's own dialler. |
| Live GPS tracking, push notifications, ratings, coupons, scheduled orders, real payments, refunds | Out of scope | |
| Delivery zones, distance-based or variable fees, taxes, packaging charges, minimum order | Out of scope | One flat delivery fee only. |
| Agent earnings and partner payouts | Out of scope | Feature 003 (payout summaries). |
| Automatic dispatch, agent accepting or declining assignments | Out of scope | Assignment is manual by admin. |

### Key Entities

- **Cart**: kept on the customer's device; one kitchen; dishes with quantities. Not stored on the
  platform.
- **Saved address**: belongs to a customer account; house or door number or house name, optional
  street or area line, landmark, optional rider note, optional landmark voice note, label (Home,
  Work or Other), map location, and the address text found under the pin when it was saved.
- **Order**: order number; customer; kitchen; delivery address snapshot (house, street or area,
  landmark, label, rider note, map location, voice note); expected delivery time; payment method (UPI demo or cash on delivery); item total, delivery fee, grand
  total; current status; assigned agent (optional); rejection or cancellation reason and note;
  cash collected (cash orders, on delivery); placed time.
- **Order item**: belongs to an order; the dish it came from; dish name pair, veg mark and price as
  at placing; quantity; line amount.
- **Order event**: belongs to an order; what happened (status change, assignment, reassignment),
  who (customer, partner sign-in number, agent or admin), when, and any reason.
- **Message**: recipient (customer account, kitchen, or agent); the order; the kind of update and
  its values; time; always marked as not sent.
- **Kitchen** (from 001): gains a map location and preparation minutes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A signed-in customer with a saved address places a cash-on-delivery order from the
  home screen in four taps (open kitchen, add dish, open cart/checkout, place order); UPI adds only
  the confirmation tap.
- **SC-002**: From a cold reset, a presenter runs the full milestone (customer places, partner
  accepts and marks ready, admin assigns, agent picks up and delivers, customer sees "Delivered")
  across four screens in under five minutes, with no data entry beyond the order itself.
- **SC-003**: Every status change made on one surface appears on every other open surface showing
  that order within 15 seconds, with no manual refresh.
- **SC-004**: A partner with the app open notices a new order (sound plus highlighted card) within
  15 seconds of it being placed.
- **SC-005**: In 100% of orders the grand total equals the sum of line amounts plus the delivery
  fee, and the same figures appear on the customer, partner, admin and agent screens.
- **SC-006**: Every disallowed action (for example accepting a cancelled order, picking up an order
  that is not ready, a customer cancelling after acceptance, acting on another kitchen's or agent's
  order) is refused in 100% of attempts with a clear message.
- **SC-007**: Every status change, assignment and reassignment shows who made it and when, for
  100% of orders.
- **SC-008**: A reviewer switching language on every new screen finds no interface text in the
  other language; every new customer, partner and agent screen works at 360px width with no
  horizontal scrolling.
- **SC-009**: The reset restores the same set of orders, addresses and messages on every run, and
  every acceptance scenario above can be demonstrated from it.
- **SC-010**: A first-time customer adds a delivery address (pin, house details, landmark, label)
  in under 90 seconds on a phone.

## Assumptions

- **One flat delivery fee** (deployment setting, ₹30 for the demo); no taxes, packaging charge or
  minimum order.
- **The rider note** from the feature description stays as an optional field on the address
  details screen, alongside the landmark voice note.
- **Expected delivery time** is fixed when the order is placed; it is not recalculated when the
  kitchen accepts late or the agent is assigned.
- **Payment happens at placing time** for UPI (demo) and at the door for cash; no part payments, no
  change-giving records, and the agent always collects exactly the grand total.
- **Orders are for now**: no scheduled orders; ordering is possible only while the kitchen is open.
- **Assignment is manual**: agents do not accept or decline; an agent may hold several orders at
  once.
- **Reassignment ends at pickup**: after pickup an admin can only cancel.
- **Customer cancellation** is allowed only before the kitchen accepts and needs no reason.
- **Privacy between roles**: partners see the customer's display name, landmark and rider note but
  not the phone number or full address; agents see what they need to deliver (name, number, address,
  landmark, note); admins see everything.
- **Message list replaces messaging** for customers, partners and agents; admins have no message
  list. The real channel choice (SMS or WhatsApp) per update is out of scope.
- **Orders are kept indefinitely** in the POC; there is no deletion of orders.
- **Today** means the India Standard Time calendar day for day views, boards and agent totals.
- **Dependencies**: feature 001 (accounts and sessions per surface, kitchens with hours and status,
  menus, agents, demo reset, language handling). This feature changes three 001 behaviours: the
  agent home lists deliveries instead of always showing "No deliveries yet" (001 FR-046); agents
  holding undelivered orders cannot be deactivated (adds to 001 FR-026); the admin kitchen form
  gains a map location and preparation minutes (adds to 001 FR-019); and the customer kitchen page
  shows the delivery-time range (adds to 001 FR-041).
