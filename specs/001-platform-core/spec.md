# Feature Specification: Platform Core

**Feature Branch**: `001-platform-core`

**Created**: 2026-10-12

**Status**: Approved

**Input**: User description: "Platform core: every role can sign in to their own surface, an admin can
onboard food partners and delivery agents, a partner can manage their kitchen's menu and opening
hours, and a customer can browse, search and filter kitchens and read menus in Kannada or English.
Ordering is the next feature and is out of scope, so no cart." (full description in the
`/speckit-specify` request for 001)

**Sources**: PRD in `docs/prd/`; capability status in `docs/fidelity-matrix.md`.

## Clarifications

### Session 2026-10-12

- Q: Does "Veg only" show only pure-veg kitchens, or also kitchens that serve non-veg while hiding
  their non-veg dishes? → A: Two separate concepts. (1) A dish-level filter with three states (All /
  Veg only / Non-veg only) applies to dishes everywhere: on the home list a kitchen appears only if
  it has at least one available dish matching the state; on a kitchen page only matching dishes are
  shown; the state carries from the home list into the kitchen page and is remembered until
  changed. (2) "Pure veg" is a kitchen attribute declared by the admin at onboarding (not derived
  from the menu), shown as a badge and offered as a separate kitchen filter alongside kitchen type
  and "Open now"; a pure-veg kitchen cannot have non-veg dishes.
- Q: Can admins edit a kitchen's menu and hours for the partner? → A: Yes. Admins can edit any
  kitchen's menu, hours and open/closed status with the same editor partners use; each change
  records which admin made it.
- Q: How many people can sign in to the partner app for one kitchen? → A: Several. The admin
  maintains an explicit list of sign-in numbers per kitchen (owner plus helpers), all with the same
  access. The customer-facing kitchen phone number does not grant sign-in by itself.
- Q: When does a kitchen marked "Temporarily closed" open again? → A: Automatically at the start of the
  kitchen's next scheduled opening period; the partner can reopen earlier. If the partner closes
  while no opening period is running (e.g. before today's has started), the upcoming period is the
  one cancelled.
- Q: What can a partner do while their kitchen is Suspended? → A: Sign in and edit menu and hours,
  with a notice showing the suspension reason (same as Pending).

### Session 2026-10-14

- Q: Is the demo data fictional or based on real Honnavar businesses? → A: Based on real Honnavar
  businesses with researched menus and indicative prices; dishes are fabricated only where a menu
  could not be obtained. The researched catalogue is supplied separately later; until then the
  current outline stands in.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse kitchens and read a menu in my language (Priority: P1)

A customer in Honnavar opens the customer app without signing in. They see a list of kitchens
that are live on the platform, each with a photo, its name, its type (restaurant, home kitchen or
cloud kitchen), whether it is pure veg, and whether it is open right now. They tap a kitchen and see
its photo, opening hours, a button to call it, and its menu grouped by category, with a photo,
price and veg/non-veg mark for each dish. At any point they can switch between Kannada and English,
and everything on the screen changes language.

**Why this priority**: Discovering local food is the first thing the platform offers and the
foundation the ordering feature builds on. It is demonstrable with seed data alone.

**Independent Test**: Reset to the demo state, open the customer entry point on a 360px-wide mobile
screen, open a kitchen and read its menu in both languages without signing in.

**Acceptance Scenarios**:

1. **Given** the demo state, **When** a guest opens the customer home screen, **Then** they see
   every active kitchen and no pending or suspended kitchen.
2. **Given** a kitchen inside its opening hours and not temporarily closed, **When** it appears on
   the home list, **Then** it is marked "Open"; **given** it is outside its hours, **then** it is
   marked "Closed" with the next opening time; **given** it is temporarily closed, **then** it is
   marked "Temporarily closed" with the time it opens again.
3. **Given** a guest on a kitchen page, **When** they view the menu, **Then** dishes are grouped
   under the kitchen's categories in the kitchen's order, and each dish shows name, description,
   photo (or a placeholder), price in rupees and a veg/non-veg mark.
4. **Given** a dish marked unavailable, **When** it appears on the menu, **Then** it is shown
   dimmed with a "Not available" label rather than hidden.
5. **Given** a guest on a kitchen page, **When** they tap the call button, **Then** their phone's
   dialler opens with the kitchen's primary contact number.
6. **Given** English is selected, **When** the guest switches to Kannada on any screen, **Then**
   all interface text on that screen, including dates, times and prices, appears in Kannada, and
   kitchen and dish names appear in Kannada where a Kannada version exists.
7. **Given** a dish with no Kannada name and Kannada selected, **When** the menu is shown,
   **Then** the English name is shown with a visible marker that it is in English.
8. **Given** a guest has chosen Kannada, **When** they close and reopen the app on the same
   device, **Then** it opens in Kannada.

---

### User Story 2 - Sign in to my own surface (Priority: P1)

Each role has its own entry point and its own sign-in screen: customer, food partner, delivery
agent and admin. A person enters their 10-digit mobile number, receives a one-time code, enters it
and lands on their surface. Customers can sign up this way with any valid number; partners and
agents can sign in only if an admin has registered their number, and admins come from the demo
data. In this proof of concept the
code is not actually sent: it is a fixed demo code, and the sign-in screen says so.

A signed-in delivery agent sees their profile (name, mobile number, vehicle) and an empty
"No deliveries yet" screen, since ordering arrives in the next feature.

**Why this priority**: Every other surface depends on knowing who the user is and which role they
are acting in.

**Independent Test**: Using the demo accounts, sign in at each of the four entry points and land on
the right surface; try a partner number at the agent entry and be refused.

**Acceptance Scenarios**:

1. **Given** a customer entry point, **When** a new 10-digit mobile number and the demo code are
   entered, **Then** a customer account is created and the person is signed in.
2. **Given** the partner entry point, **When** a number on a kitchen's sign-in list and the demo code
   are entered, **Then** the partner lands on that kitchen's dashboard.
3. **Given** the partner, agent or admin entry point, **When** a number not registered for that
   role is entered, **Then** sign-in is refused with a message that the number is not registered
   for this app and whom to contact; no account is created.
4. **Given** any entry point, **When** a wrong code is entered, **Then** sign-in is refused with a
   clear message and the person can try again.
5. **Given** a signed-in agent, **When** they open their app, **Then** they see their profile and a
   "No deliveries yet" screen.
6. **Given** a registered agent marked inactive, **When** they try to sign in, **Then** sign-in is
   refused with a message to contact the operations team.
7. **Given** a person signed in on one surface, **When** they open a different surface's entry
   point, **Then** they are not signed in there and see that surface's sign-in screen (customer
   surface: browsable as a guest).
8. **Given** a signed-in user on any surface, **When** they sign out, **Then** they return to that
   surface's sign-in screen (customer surface: home as a guest).

---

### User Story 3 - Partner keeps menu, hours and open status up to date (Priority: P2)

A food partner signs in and sees only their own kitchen. They can mark the kitchen temporarily
closed (for example when the cook is unwell) and open again, edit their weekly opening hours, and
manage their menu: add, edit, reorder and remove categories and dishes, each with a name and
description in Kannada and English, a price, a veg/non-veg mark, a photo and an "available"
switch. Customers see changes the next time they load or refresh the kitchen.

**Why this priority**: Accurate menus and hours are what make browsing trustworthy, and partners
must be able to maintain them without calling the operations team.

**Independent Test**: Sign in as a demo partner, mark a dish unavailable, add a dish and mark the
kitchen temporarily closed; confirm each change on the customer surface.

**Acceptance Scenarios**:

1. **Given** a signed-in partner, **When** they open their app, **Then** they see only their own
   kitchen and cannot view or change any other kitchen.
2. **Given** a kitchen during its lunch period, **When** the partner marks it temporarily closed,
   **Then** customers see "Temporarily closed" with the time it opens again, it is excluded from
   "Open now", and it opens again automatically at the start of the dinner period (or the next
   scheduled period).
3. **Given** a kitchen at 8:00 am whose first period starts at 11:00 am, **When** the partner marks
   it temporarily closed, **Then** the 11:00 am period is cancelled and the kitchen opens again
   automatically at the start of the following period.
4. **Given** a temporarily closed kitchen, **When** the partner taps "Reopen" before the
   automatic reopening, **Then** the closure ends immediately and normal hours apply.
5. **Given** the hours editor, **When** the partner sets a day as closed or sets up to two time
   ranges for a day and saves, **Then** the customer-facing hours and open/closed state follow the
   new schedule.
6. **Given** the hours editor, **When** a range ends before it starts or two ranges overlap,
   **Then** saving is blocked with a message explaining which day is wrong.
7. **Given** the menu editor, **When** the partner adds a dish with a name in at least one language,
   a price and a category, **Then** it appears on the customer menu under that category.
8. **Given** the menu editor, **When** a dish is saved with a name in only one language, **Then** it
   is saved and the partner sees a reminder that the other language is missing.
9. **Given** a dish, **When** the partner switches "available" off, **Then** customers see it as
   "Not available" and the dish keeps all its details for when it is switched back on.
10. **Given** a pure-veg kitchen, **When** the partner tries to mark a dish non-veg, **Then** this is
    not allowed and the partner is told why.
11. **Given** a category that still contains dishes, **When** the partner tries to delete it,
    **Then** they are asked to move or delete its dishes first.
12. **Given** a partner whose kitchen is pending verification or suspended, **When** they sign in,
    **Then** they can edit menu and hours and see a clear notice that customers cannot see the
    kitchen, with the reason (awaiting verification, or the admin's suspension reason).
13. **Given** a kitchen with two numbers on its sign-in list (owner and helper), **When** either
    signs in, **Then** both see and manage the same kitchen with the same access.

---

### User Story 4 - Admin onboards and manages partners and agents (Priority: P2)

An operations team member uses the admin panel on a desktop browser. They register a new food
partner with the kitchen's name and description in Kannada and English, its type, whether it is
pure veg, customer-facing contact numbers (one primary, used for tap-to-call), the list of
numbers allowed to sign in to the partner app (owner plus helpers), address with landmark, weekly
hours and a photo. They can also edit any kitchen's menu, hours and open/closed status with the
same editor partners use, for partners who need help. They record verification (an FSSAI licence for restaurants and cloud
kitchens, a basic hygiene check for home kitchens) and move the kitchen through pending, active and
suspended. They also register delivery agents with name, mobile number and vehicle, and switch them
active or inactive.

**Why this priority**: Partners and agents exist on the platform only because an admin put them
there; it is the supply side of the demo.

**Independent Test**: Sign in as the demo admin, create a home kitchen, record its hygiene check,
activate it and see it on the customer home list; create an agent and sign in as that agent.

**Acceptance Scenarios**:

1. **Given** the admin panel, **When** the admin creates a partner with all required fields,
   **Then** the partner is saved with status "Pending" and is not visible to customers.
2. **Given** a pending partner without recorded verification, **When** the admin tries to activate
   it, **Then** activation is blocked with a message that verification must be recorded first.
3. **Given** a pending partner, **When** the admin records verification (licence or hygiene-check
   reference, the verifying admin and date) and activates it,
   **Then** the kitchen appears on the customer home list.
4. **Given** an active partner, **When** the admin suspends it with a reason, **Then** it
   disappears from the customer surface and any direct link to it shows a "not found" screen.
5. **Given** the partner list, **When** the admin filters by status or type or searches by name or
   number, **Then** the list narrows accordingly.
6. **Given** the agent form, **When** the admin registers an agent with name, mobile number and
   vehicle, **Then** that agent can sign in at the agent entry point.
7. **Given** a mobile number already on another kitchen's sign-in list (or registered to another
   agent), **When** the admin tries to add it again, **Then** it is refused with a message naming
   the existing kitchen or agent.
8. **Given** an active agent, **When** the admin marks them inactive, **Then** they can no longer
   sign in and any existing session on the agent surface ends on its next request.
9. **Given** any kitchen, **When** the admin adds dishes or changes its hours from the admin panel,
   **Then** customers see the change as if the partner had made it, and each changed dish,
   category or hours record shows that admin as its last change, with the time.
10. **Given** a kitchen's sign-in list, **When** the admin removes a helper's number, **Then** that
    number can no longer sign in to the partner app and its existing partner sessions end on their
    next request.
11. **Given** a kitchen whose customer-facing contact number is not on its sign-in list, **When**
    someone signs in at the partner entry point with that number, **Then** sign-in is refused.

---

### User Story 5 - Find food quickly with search and filters (Priority: P3)

A customer looking for something specific searches for a kitchen or dish by typing in Kannada or
English, narrows the home list by kitchen type, "Pure veg" or "Open now", or sets the dish filter
to show only veg or only non-veg dishes.

**Why this priority**: Valuable once there are many kitchens, but browsing alone works for the
eight-kitchen pilot.

**Independent Test**: On the demo data, search for a dish in Kannada and in English and get the
same kitchen; apply each filter and check the list against the seed data.

**Acceptance Scenarios**:

1. **Given** the demo state, **When** a customer types part of a dish name in either language,
   **Then** results list matching dishes with their kitchens, and matching kitchens, regardless of
   which interface language is selected.
2. **Given** the home list, **When** the customer selects a kitchen type, **Then** only kitchens of
   that type are shown.
3. **Given** the home list, **When** the customer turns on "Open now", **Then** only kitchens open
   at that moment are shown (temporarily closed kitchens excluded).
4. **Given** the home list, **When** the customer turns on the "Pure veg" kitchen filter, **Then**
   only kitchens the admin has declared pure veg are shown.
5. **Given** the dish filter set to "Veg only" (or "Non-veg only"), **When** the home list is shown,
   **Then** only kitchens with at least one available dish of that kind appear.
6. **Given** the dish filter set to "Veg only" on the home list, **When** the customer opens a
   kitchen, **Then** the menu shows only veg dishes, categories with no matching dishes are hidden,
   and the filter state is visible and changeable on that page.
7. **Given** the customer set the dish filter to "Non-veg only", **When** they leave and return to
   the app on the same device, **Then** the filter is still "Non-veg only".
8. **Given** filters that match nothing, **When** the list is empty, **Then** the customer sees a
   friendly empty message and a one-tap way to clear filters.

---

### User Story 6 - Reset the demo to a known state (Priority: P3)

A person preparing a demo runs one step that restores realistic Honnavar data: at least eight
kitchens across all three types with local dishes and landmarks, and demo accounts for every role.

**Why this priority**: Every demo and every end-to-end test starts from this state; it is required
by the constitution but delivers no end-user value on its own.

**Independent Test**: Make changes as admin and partner, run the reset, confirm the changes are
gone and the seeded accounts work.

**Acceptance Scenarios**:

1. **Given** any state, **When** the reset is run, **Then** all data returns to the same known demo
   state, identical on every run.
2. **Given** the demo state, **When** a presenter looks at the sign-in screen of any role, **Then**
   a panel labelled as demo-only lists that role's demo accounts and the fixed code.

---

### Edge Cases

- A kitchen with no hours set for today is shown as "Closed" with its next opening day and time;
  a kitchen with no hours at all is shown as "Closed" with "Hours not set".
- A time range that ends at midnight is allowed; ranges crossing midnight are not supported in this
  feature.
- A kitchen with no categories or no dishes shows a friendly "Menu coming soon" message.
- A dish with no photo shows a placeholder picture matching its veg/non-veg mark.
- Dish filter "Non-veg only" combined with the "Pure veg" kitchen filter always matches nothing;
  the empty state explains this and offers to clear filters.
- A kitchen whose menu has no dishes of the selected kind, reached by direct link, shows its page
  with a message that it has no veg (or non-veg) dishes and a one-tap way to show all dishes.
- An admin trying to declare a kitchen pure veg while it has non-veg dishes is told how many
  non-veg dishes must be changed or removed first.
- A kitchen with no Kannada (or English) name shows the other language with the fallback marker on
  the home list, kitchen page and search results.
- Search with no results shows a friendly message and suggestions to clear the search or filters.
- A direct link to a pending, suspended or nonexistent kitchen shows a "not found" screen, not an
  error.
- A mobile number with fewer or more than 10 digits, or not starting with 6–9, is rejected before
  a code is requested; a leading +91 or 0 is accepted and stripped.
- The same mobile number may be a customer and also a registered partner or agent; the entry point
  decides which role is used.
- A number added to a kitchen's sign-in list can sign in immediately; a removed number's partner
  sessions end on their next request.
- A temporarily closed kitchen with no future opening period in its hours stays closed until the
  partner or an admin reopens it.
- If hours are edited while the kitchen is temporarily closed, the reopening time is recalculated
  from the new hours using the same rule, from the moment the kitchen was closed.
- A partner and an admin editing the same dish at the same time: the later save wins; neither
  sees an error.
- On a slow or dropped connection, screens show loading states, keep entered form data, and offer
  a retry rather than a blank screen or endless spinner.

## Requirements *(mandatory)*

### Functional Requirements

**Surfaces and sign-in**

- **FR-001**: The system MUST provide four separate entry points, one each for customers, food
  partners, delivery agents and admins, each with its own sign-in screen.
- **FR-002**: The role a person acts in MUST be determined by the entry point they use; being
  signed in on one surface MUST NOT sign them in on another.
- **FR-003**: Sign-in MUST use a 10-digit Indian mobile number and a one-time code; there are no
  passwords.
- **FR-004**: Code delivery is a declared stand-in in this feature: no message is sent, the
  accepted code is a fixed demo code, and the sign-in screen states this. Replacing it with real
  delivery later MUST NOT change the sign-in experience beyond the code arriving by SMS.
- **FR-005**: Any valid mobile number MUST be able to sign in at the customer entry point; a
  customer account is created on first sign-in.
- **FR-006**: Only numbers registered for the matching role MUST be able to sign in at the
  partner, agent and admin entry points (partners and agents registered by an admin; admins from
  the demo data only in this feature); other numbers are refused without creating an account.
- **FR-007**: Inactive agents MUST NOT be able to sign in; deactivating an agent MUST end their
  existing sessions.
- **FR-008**: Customers MUST be able to browse, search and filter without signing in.
- **FR-009**: Signed-in users MUST be able to sign out from every surface.
- **FR-010**: A signed-in customer MUST be able to see their mobile number, optionally set a display
  name, and sign out.
- **FR-011**: Every surface's sign-in screen MUST show, in demo deployments only, a panel clearly
  labelled as demo-only listing that role's demo accounts and the fixed code.

**Language**

- **FR-012**: Every screen on all four surfaces MUST be available in Kannada and English with full
  parity, and MUST show a visible language switch.
- **FR-013**: All interface text on a screen MUST appear in the selected language; mixed-language
  interface text is a defect.
- **FR-014**: The default language MUST be a deployment setting (English for this POC) changeable
  without code changes.
- **FR-015**: The user's language choice MUST be remembered on the device, so it applies on their
  next visit.
- **FR-016**: Kitchen names, kitchen descriptions, category names, dish names and dish descriptions
  MUST be stored as a Kannada/English pair; at least one language is required.
- **FR-017**: When the selected language's version of partner-authored content is missing, the
  other language MUST be shown with a visible marker identifying its language.
- **FR-018**: Prices MUST be shown in rupees with the ₹ symbol, and dates and times formatted for
  the selected language, using Latin digits in both languages.

**Admin: partners**

- **FR-019**: Admins MUST be able to create and edit a food partner with: kitchen name and
  description (bilingual), type (restaurant, home kitchen, cloud kitchen), pure veg or serves
  non-veg, one or more customer-facing contact numbers with one marked as primary (used for
  tap-to-call), address, landmark, weekly opening hours, and a kitchen photo.
- **FR-020**: New partners MUST start in status "Pending"; status MAY then move between Pending,
  Active and Suspended, with a reason recorded for each suspension.
- **FR-021**: Admins MUST be able to record verification for a partner: for restaurants and cloud
  kitchens an FSSAI licence number, for home kitchens a basic hygiene-check reference. The system
  records which admin verified and when. Verification is a
  declared stand-in: nothing is checked against any external registry.
- **FR-022**: A partner MUST NOT be activated until verification is recorded.
- **FR-023**: Only Active partners MUST be visible anywhere on the customer surface.
- **FR-024**: Admins MUST be able to list partners, filter by status and type, and search by name
  (either language) or contact number.
- **FR-025**: A mobile number MUST NOT be on the sign-in list of more than one kitchen.
- **FR-053**: Admins MUST maintain, per kitchen, an explicit list of mobile numbers allowed to sign
  in to the partner app (owner plus helpers), each with a person's name; a kitchen needs at least
  one. All numbers on the list have the same access. Customer-facing contact numbers do not grant
  sign-in unless they are also on this list. Removing a number ends its partner sessions.
- **FR-054**: Admins MUST be able to edit any kitchen's menu, weekly hours and temporary closure
  using the same capabilities partners have (FR-031 to FR-036), in any kitchen status.
- **FR-055**: Every dish, category, weekly hours and temporary closure MUST record who last
  changed it (an admin, or a partner sign-in number) and when. There is no change history, no
  record of what changed, and no history view.

**Admin: agents**

- **FR-026**: Admins MUST be able to create and edit delivery agents with name, mobile number,
  vehicle type (bicycle, two-wheeler, other) and optional vehicle registration number, and switch
  them active or inactive.
- **FR-027**: A mobile number MUST NOT be registered to more than one agent.

**Partner**

- **FR-030**: A partner MUST see and manage only their own kitchen; attempts to reach another
  kitchen's data MUST be refused.
- **FR-031**: A partner MUST be able to mark their kitchen temporarily closed and reopen it early.
  A temporary closure cancels exactly one opening period: the one running at the moment of
  closing, or, if none is running, the next upcoming one. The kitchen opens again automatically at
  the start of the following scheduled period.
- **FR-032**: A partner MUST be able to edit weekly hours: for each day of the week, closed or up to
  two non-overlapping time ranges within that day.
- **FR-033**: A partner MUST be able to create, rename, reorder and delete menu categories
  (bilingual names); a category containing dishes cannot be deleted.
- **FR-034**: A partner MUST be able to create, edit, move between categories, reorder and delete
  dishes, each with bilingual name and description, price in whole rupees greater than zero,
  veg/non-veg mark, optional photo, and an available switch.
- **FR-035**: "Pure veg" is a kitchen attribute declared by the admin, not derived from the menu.
  Dishes in a pure-veg kitchen MUST be veg; an admin cannot declare a kitchen pure veg while it has
  non-veg dishes.
- **FR-036**: The partner app MUST show which dishes and categories are missing a language
  version.
- **FR-037**: When the kitchen is Pending or Suspended, the partner app MUST show a notice that
  customers cannot see the kitchen and why (awaiting verification, or the admin's suspension
  reason). Pending and Suspended partners can still edit menu and hours.
- **FR-038**: Partners MUST NOT be able to change their kitchen's name, description, type, veg
  status, contact numbers, sign-in list, address, photo or verification; these are
  admin-managed.

**Customer: browse, search and filter**

- **FR-039**: The customer home screen MUST list Active kitchens with photo, name, type, a "Pure
  veg" badge when declared, and current state: Open, Closed (with next opening time), or
  Temporarily closed (with the time it opens again). Open kitchens are listed before closed ones.
- **FR-040**: A kitchen is "Open" only when the current local time (India Standard Time) is within
  one of today's ranges and it is not temporarily closed.
- **FR-041**: The kitchen page MUST show photo, name, description, type, "Pure veg" badge when
  declared, state, landmark
  and address, the full weekly hours, a tap-to-call button for the primary contact number, and the
  menu grouped by category in the partner's order.
- **FR-042**: Customers MUST be able to filter the home list by kitchen type, "Pure veg" (kitchens
  the admin has declared pure veg) and "Open now", and combine these filters with each other and
  with the dish filter.
- **FR-043**: Customers MUST have one dish filter with three states: All, Veg only, Non-veg only.
  It applies wherever dishes are shown: with Veg only or Non-veg only, the home list and kitchen
  search results include only kitchens with at least one available dish of that kind; kitchen
  menus and dish search results show only dishes of that kind (unavailable matching dishes still
  appear, marked per FR-045); categories with no matching dishes are hidden. With All, no
  dish-based filtering applies. The state carries from the home list into kitchen pages, is
  visible and changeable there, and is remembered on the device until the customer changes it.
- **FR-044**: Customers MUST be able to search kitchens and dishes by partial name in either
  language, regardless of the selected interface language; results show matching kitchens and
  matching dishes with their kitchen, and include only Active kitchens.
- **FR-045**: Unavailable dishes MUST appear dimmed and labelled "Not available" on menus and in
  search results.

**Agent**

- **FR-046**: A signed-in agent MUST see their profile (name, mobile number, vehicle) and a
  "No deliveries yet" screen.

**States and errors**

- **FR-047**: Every screen MUST handle loading, empty, error and not-found states; users never see
  technical error details.
- **FR-048**: Forms MUST reject invalid input with field-level messages in the selected
  language, and keep entered data when saving fails.

**Demo data**

- **FR-049**: A single step MUST reset all data to the same known demo state.
- **FR-050**: The demo state MUST contain at least eight kitchens based on real Honnavar
  businesses, with researched menus and indicative prices (dishes fabricated only where a menu could
  not be obtained), covering all three types (at least three restaurants, three home kitchens and
  two cloud kitchens), a mix of pure-veg and non-veg, with local dishes (for example neer dosa,
  kane fry, fish curry meals,
  goli baje, patrode, kotte kadubu, holige) and local landmarks (for example the bus stand, the
  Sharavathi bridge, Kasarkod and the market road).
- **FR-051**: The demo state MUST include at least: one kitchen with a dish missing its Kannada
  name, one kitchen temporarily closed at the moment of reset, one kitchen pending verification, one suspended kitchen,
  one unavailable dish, and one kitchen that is closed by its hours at typical demo times.
- **FR-052**: The demo state MUST include demo accounts for every role: at least one admin, at least
  one sign-in number for each kitchen and one kitchen with two (owner plus helper), at least two active agents and one inactive agent, and at
  least one customer.

### Text Categories

Per Constitution Principle II, every kind of text in this feature belongs to one category.

| Text | Category | Behaviour |
|---|---|---|
| Labels, buttons, navigation, headings, empty/error/loading messages, form validation messages | Interface string | Translated via keys; both languages required |
| Kitchen type, veg/non-veg, "Pure veg" badge, dish filter states, status (Pending/Active/Suspended), Open/Closed/Temporarily closed, "Not available", vehicle type, day names | Interface string | Fixed values shown through translation keys, never as stored text |
| Demo-only sign-in panel text, fixed-code notice | Interface string | Translated via keys |
| Kitchen name, kitchen description | Partner-authored content (entered by admin on the partner's behalf) | Stored as a language pair; fallback to the other language with a marker |
| Category name, dish name, dish description | Partner-authored content | Stored as a language pair; fallback with a marker |
| Suspension reason | User-generated text (admin-entered) | Shown as entered; visible only in admin and partner apps |
| Kitchen address, landmark | User-generated text | Shown as entered |
| Person names (agent, admin, customer display name, sign-in list names) | User-generated text | Shown as entered |
| Vehicle registration, FSSAI licence number, hygiene-check reference | User-generated text | Shown as entered |
| FSSAI, UPI, WhatsApp, Honnavar Food brand name | Proper noun / brand name | Not translated |
| Prices, times, dates, opening hours, phone numbers | System formatting | `kn-IN` / `en-IN` locale, Latin digits, ₹ symbol |

Interface strings in either language may be flagged as machine-drafted pending native review; the
flag is for reviewers and is not shown to end users.

### Integration Fidelity

Per Constitution Principle III and `docs/fidelity-matrix.md`:

| Capability | Status in this feature | Notes |
|---|---|---|
| Mobile number + one-time code sign-in | **Stand-in** for code delivery; sign-in itself is real | No message sent; fixed demo code; labelled on screen. Customer numbers self-register; partner/agent/admin numbers must be pre-registered. Demo-only account panel per role. |
| Partner verification (FSSAI / hygiene) | **Stand-in** | Admin records the licence or hygiene-check reference and marks verified; the verifying admin and date are kept; no registry lookup. |
| Admin onboarding of partners and agents | Real | |
| Partner menu, prices, availability, hours, open/closed | Real | |
| Browse, search and filter kitchens and dishes | Real | |
| Bilingual interface and content | Real | Strings may be flagged machine-drafted for review. |
| Tap-to-call kitchen | Real | Uses the phone's own dialler; no telephony service. |
| Maps / map pin for kitchen location | Out of scope | Landmark text only in this feature. |
| Cart, ordering, payments, order status, notifications, delivery assignment | Out of scope | Feature 002. |
| Ratings, voice prompts, payouts, delivery zones and fees, refunds, complaints | Out of scope | Later features or out of POC scope. |
| Code-entry rate limiting and lockout | Out of scope | Needed with a real code provider. |

### Key Entities

- **Account**: a person identified by mobile number, with optional display name. One account can
  hold several roles.
- **Role registration**: links an account to a role (customer, partner, agent, admin); for
  partners, the kitchen whose sign-in list includes the number. Agents carry active/inactive.
- **Kitchen (food partner)**: bilingual name and description, type, pure-veg flag (declared by
  admin), customer-facing contact numbers (one primary), sign-in list (numbers with person names),
  address, landmark, photo, status (Pending/Active/Suspended) with suspension reason, temporary
  closure (when it started and when it ends), weekly hours.
- **Last change**: each dish, menu category, weekly hours and temporary closure carries who last
  changed it (admin or partner sign-in number) and when; no history is kept.
- **Weekly hours**: per day of week, closed or up to two time ranges.
- **Verification record**: kitchen, kind (FSSAI licence or hygiene check), reference, verifying
  admin, date.
- **Menu category**: belongs to a kitchen; bilingual name; display order.
- **Dish**: belongs to a category; bilingual name and description; price; veg/non-veg; optional
  photo; available flag; display order.
- **Delivery agent profile**: name, mobile number, vehicle type, optional registration number,
  active flag.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From the customer home screen, a guest reaches any active kitchen's full menu in one
  tap, and finds a named dish through search in three taps or fewer.
- **SC-002**: A reviewer switching language on every screen of all four surfaces finds no
  interface text in the other language; the only other-language text is fallback partner content
  carrying its marker, proper nouns and user-entered text.
- **SC-003**: Every customer, partner and agent screen is fully usable at 360px width on a low-end
  Android phone, with no horizontal scrolling and every action reachable by touch.
- **SC-004**: An admin onboards a new partner (all required fields, verification recorded,
  activated) in under five minutes, and the kitchen is then visible to customers.
- **SC-005**: A partner adds a dish with names in both languages, a price and a photo in under two
  minutes on a phone.
- **SC-006**: A change by a partner (dish availability, temporary closure, hours) is visible to a
  customer the next time they load or refresh the page.
- **SC-007**: Each of the four roles signs in with a demo account on the first attempt, and a
  number not registered for a staff role is refused in 100% of attempts.
- **SC-008**: A single reset step restores the identical demo state on every run, and every
  scenario in this spec can be demonstrated from it without manual data entry.

## Assumptions

- **Single city, single time zone**: all kitchens are in Honnavar; opening hours use India
  Standard Time.
- **One kitchen per sign-in number**: a number can be on only one kitchen's sign-in list;
  multi-kitchen owners are out of scope.
- **Admin-managed kitchen profile**: name, description, type, veg status, contacts, sign-in list,
  address, photo and verification are edited by admins only. Menu, hours and open status are
  managed by partners, and admins can also edit them on a partner's behalf.
- **Pending and suspended partners can sign in** and edit menu and hours, but are invisible to
  customers (confirmed in clarification).
- **Temporary closure** cancels one opening period and reopens automatically (confirmed in
  clarification); longer breaks are handled by setting days to closed in the weekly hours.
- **Hours** allow up to two ranges per day (typical lunch/dinner split) and no ranges crossing
  midnight.
- **Prices** are whole rupees; taxes, packaging and delivery fees arrive with ordering.
- **Search** matches partial names in either script but does not transliterate (typing Kannada
  words in Latin letters will not match Kannada-only names).
- **Sessions** last until sign-out or expiry on that device; sessions are per surface.
- **Refusing unregistered staff numbers** with a clear message is acceptable; revealing that a
  number is not registered as a partner/agent/admin is a low risk for this POC.
- **Seed content is based on real Honnavar businesses**: menus are researched, prices are
  indicative, and dishes are fabricated only where a menu could not be obtained. The researched
  catalogue will be supplied separately later; until then the current outline catalogue stands in,
  and replacing it must not require changes to the product.
- **Dependencies**: none on earlier features; this is the first feature. Feature 002 (ordering)
  builds on the accounts, kitchens and menus defined here.
