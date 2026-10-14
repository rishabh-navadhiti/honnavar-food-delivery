# Research: Platform Core (001)

Phase 0 output for [plan.md](./plan.md). Each entry records a decision, why it was chosen, and what
was rejected. Versions are the current stable releases checked on 2026-10-14.

## R1. Runtime and language versions

- **Decision**: Node.js 24 LTS, Next.js 16.4 (App Router), React 19.3, TypeScript 6.0 in strict
  mode.
- **Rationale**: Current stable releases. TypeScript 7.0 (the native compiler port) is out, but
  Next.js's build-time type check and typescript-eslint rely on the JavaScript compiler API that 6.0
  still provides; 6.0 is the safe choice until that tooling confirms 7.0 support.
- **Alternatives**: TypeScript 7.0 (rejected for now, tooling risk; revisit in a later feature);
  TypeScript 5.9 (no reason to stay behind 6.0).

## R2. Internationalisation library

- **Decision**: `next-intl` 4, used **without locale-prefixed URLs**. The active locale comes from
  a `locale` cookie, falling back to the `DEFAULT_LOCALE` environment variable (`en` for the POC).
  Messages live in `src/shared/i18n/messages/en.json` and `kn.json` with identical key sets.
- **Rationale**: First-class Server Component support (translations rendered on the server, no
  client bundle cost for most screens), ICU message syntax, and locale-aware formatters. Cookie
  storage satisfies FR-015 (remembered on the device only) and lets the server render the right
  language on first paint, with no flash of the other language.
- **Alternatives**: Hand-rolled dictionary (rejected: plurals, interpolation, formatting and RSC
  wiring would be rebuilt by hand); locale-prefixed routes such as `/kn/...` (rejected: the spec
  remembers the choice per device, not per URL, and four surface entry routes are simpler without a
  locale segment); `react-i18next` (weaker Server Component story).
- **Parity and review tooling** (no extra dependency):
  - A unit test asserts that `en.json` and `kn.json` have exactly the same keys and that no value
    is empty (Principle II: a screen is not done until both languages exist).
  - `src/shared/i18n/messages/machine-drafted.json` lists keys, per locale, whose text is
    machine-drafted pending native review. It is never shown to end users.
  - ESLint `react/jsx-no-literals` (already shipped inside `eslint-config-next`) flags hard-coded
    text in JSX.

## R3. Locale formatting (prices, dates, times)

- **Decision**: One shared formatting module wraps `Intl` for `en-IN` and `kn-IN`, always with
  `numberingSystem: 'latn'` and `timeZone: 'Asia/Kolkata'`.
  - Prices: currency `INR`, no decimals → `₹1,250` in both locales (Indian digit grouping).
  - Times: English `1:30 pm`. Kannada uses the CLDR *day period* words, period first:
    `ಮಧ್ಯಾಹ್ನ 1:30`, `ಬೆಳಿಗ್ಗೆ 7:00`, `ರಾತ್ರಿ 9:30`.
  - Day names come from `Intl` (`ಬುಧವಾರ`, `Wednesday`).
- **Rationale**: Checked on Node 24 (ICU 78, CLDR 48): `kn-IN` with the default `timeStyle` prints
  `01:30 PM`, which would put Latin text on a Kannada screen (a defect under Principle II). With
  `dayPeriod: 'short'` it prints `1:30 ಮಧ್ಯಾಹ್ನ`. The module uses `formatToParts` to put the period
  first, as written Kannada does. `kn-IN` already defaults to Latin digits; setting it explicitly
  guards against browser differences.
- **Alternatives**: 24-hour times (rejected: unfamiliar to many target users); translating
  `AM`/`PM` through message keys (rejected: CLDR already has natural Kannada day periods).
- **Tests**: Unit tests pin the exact output for representative times in both locales.

## R4. Sign-in, sessions and per-surface roles

- **Decision**: Our own small session layer; no auth library.
  - Phone numbers are normalised to 10 digits (strip spaces, `+91`, leading `0`; must start with
    6–9).
  - The one-time code goes through the **OTP adapter** (R6). The stand-in accepts only the fixed
    code from `DEMO_OTP_CODE`.
  - On success the server creates a row in `sessions` holding a SHA-256 hash of a 32-byte random
    token (Node `crypto`), the surface, the phone and the subject id. The raw token is stored in an
    `HttpOnly`, `Secure` (in production), `SameSite=Lax` cookie. There is **one cookie per surface**
    (`hfd_session_customer`, `hfd_session_partner`, `hfd_session_agent`, `hfd_session_admin`), so
    being signed in on one surface never signs you in on another (FR-002).
  - Every request on a protected surface loads the session **and re-checks the registration
    behind it**: an agent who is still active, a phone that is still on that kitchen's sign-in
    list, an admin who still exists. If the check fails, the session is deleted. This is how
    deactivating an agent or removing a helper's number ends their sessions "on the next request"
    (FR-007, FR-053).
  - Session lifetime: 30 days, extended when used.
- **Rationale**: The constitution rules out third-party auth providers. The needs here (phone plus
  code, four surfaces, immediate revocation) are small and fit about 150 lines that we can test.
  Sessions stored in the database make revocation trivial; stateless JWTs cannot be revoked without
  the same lookup.
- **Alternatives**: Auth.js (provider-centric and heavier than needed; would still need a custom
  credentials flow); Lucia (deprecated as a library); signed stateless cookies (no revocation).
- **Code-entry rate limiting**: out of scope, as the spec declares; the adapter interface leaves
  room for it.

## R5. Database access and migrations

- **Decision**: PostgreSQL 17, Drizzle ORM 0.45 with the `postgres` (postgres.js) driver,
  `drizzle-kit` for versioned SQL migrations committed under `drizzle/`. Local development uses a
  `docker-compose.yml` Postgres service; any standard PostgreSQL works via `DATABASE_URL`.
- **Rationale**: Mandated by the constitution (Drizzle, standard PostgreSQL). postgres.js is a
  single small dependency with good TypeScript types.
- **Alternatives**: `pg` driver (also fine; postgres.js chosen for its simpler API); Prisma
  (excluded by the constitution).

## R6. Integration adapters (Principle III)

- **Decision**: `src/shared/adapters/` holds one module per external dependency touched in this
  feature, each with a TypeScript interface and a selected implementation:
  - `otp`: `OtpProvider` with `requestCode(phone)` and `verifyCode(phone, code)`. The only
    implementation is `StandInOtpProvider` (fixed code, never sends, deterministic), labelled
    `STAND-IN` in its file header and in `docs/fidelity-matrix.md`.
  - `verification`: `VerificationProvider` with `check({ kind, reference })`. The only
    implementation is `StandInVerificationProvider`: it records and always returns `recorded`,
    with no registry lookup, and is labelled `STAND-IN`.
  - Each adapter's `index.ts` exports the implementation in use. Swapping to a real provider
    later is a change to that one file. There is no provider-selection setting yet, because only
    one implementation exists (Principle VIII).
- **Rationale**: Callers depend only on the interface, so real providers can be added later
  without touching feature code.
- **Not adapters**: tap-to-call is a plain `tel:` link (the phone's own dialler), not a service
  integration; maps are out of scope.

## R7. Image storage and resizing

- **Decision**: Uploaded kitchen and dish photos are resized on the server with `sharp` into two
  WebP variants (320 px and 800 px wide, quality ~70) and stored as `bytea` in an `images` table.
  They are served by a route handler `GET /media/[id]/[variant]` with long-lived immutable cache
  headers, the id being content-addressed. Upload limit: 5 MB; JPEG, PNG or WebP only.
  `next/image` is used with a small custom loader that picks the variant, so lazy loading and
  `sizes` work while the optimiser is not needed.
- **Rationale**: Principle IV requires resized, lazily loaded images. The constitution allows
  nothing provider-specific beyond PostgreSQL, so there is no object store. Database storage
  survives redeploys on free tiers with ephemeral disks, and the demo reset clears images with
  everything else. Volume is tiny (tens of images at pilot scale).
- **Alternatives**: Local filesystem (lost on redeploy on most free hosts); S3-compatible storage
  (provider-specific); the Next.js image optimiser on originals (keeps large originals around and
  needs a writable cache).

## R8. Seed photos

- **Decision**: Seed kitchens and dishes **have photos**.
  - The catalogue (R15) names an image file for each kitchen and dish. The files live in
    `seed/images/`.
  - The seed loads each file through **the same resize-and-store function as uploads** (R7), so
    seed photos and uploaded photos behave identically.
  - The SVG placeholders (one per kitchen type, one each for veg and non-veg dishes, under
    `src/shared/ui/placeholders/`) are only a fallback. They appear when a catalogue file is missing
    or a partner hasn't uploaded a photo.
  - A missing file is logged as a warning during reset, not treated as an error, so a partial
    catalogue still loads.
- **Rationale**: "Pictures over words" (Principle IV) needs real food photos in the demo. Sharing
  the upload path means no second image pipeline.
- **Alternatives**: Placeholders only (weak demo); pre-resized files committed to the repo
  (duplicates the resize logic and lets the two paths drift apart).

## R9. Search

- **Decision**: A case-insensitive substring match (`ILIKE '%term%'`) across `name_en` and `name_kn`
  of kitchens and dishes, Active kitchens only, with the term NFC-normalised and trimmed, and a
  minimum of 2 characters. No search index.
- **Rationale**: Pilot scale (around ten kitchens, a few hundred dishes) makes an index
  unnecessary (Principle VIII). Matching both columns satisfies "either language regardless of
  interface language". Kannada has no letter case, so `ILIKE` behaves as exact substring matching
  there, which is what we want.
- **Alternatives**: `pg_trgm` or full-text search (more than the pilot needs); transliteration
  (out of scope per the spec's assumptions).

## R10. Opening hours, open state and temporary closure

- **Decision**: Pure domain functions in `src/features/kitchens/domain/`, tested first:
  - Hours: per weekday, 0–2 ranges in minutes since midnight (`opens < closes ≤ 1440`, no
    overlap).
  - `kitchenState(kitchen, now)` returns `open`, `closed { nextOpening }`,
    `temporarilyClosed { reopensAt }`, or `closed { hoursNotSet }`.
  - `closureEnd(hours, closedAt)` returns the start of the next period after the cancelled one,
    where the cancelled period is the one running at `closedAt` or, if none is running, the next
    upcoming one (FR-031). It returns `null` when there is no future period.
  - Editing hours during a closure recalculates `reopensAt` from the stored `closedAt`.
  - All times are in IST, computed with a fixed +05:30 offset. India has no daylight saving time,
    so no time-zone library is needed.
- **Rationale**: This is the logic most likely to be wrong at boundaries (midnight, period edges,
  week wrap-around), so it is isolated and unit-tested as the constitution asks. Storing the
  computed `reopensAt` keeps list queries simple.
- **Alternatives**: date-fns-tz or Temporal polyfill (an unneeded dependency for a fixed offset).

## R11. Dish filter, kitchen filters and language state

- **Decision**:
  - Kitchen filters (type, pure veg, open now) are URL search params, so results can be shared and
    the back button works.
  - The dish filter (`all` / `veg` / `nonveg`) and the language live in cookies, set by small
    server actions behind plain `<form>`s, so they work without client JavaScript and the server
    renders the right state on the first request (FR-043, FR-015).
  - Dish-filter cookie: `hfd_dish_filter`; language cookie: `locale`. Both last one year and are
    not tied to any session.
- **Rationale**: Server-rendered by default with minimal client JS (Principle IV); both states
  must persist across pages and visits on the device.
- **Alternatives**: localStorage (needs client JS, and the server can't render the right state);
  storing on the account (rejected by the spec: device only).

## R12. Server actions, validation and errors

- **Decision**:
  - Every mutation is a server action in its feature folder. Each one parses its input with a Zod
    schema, authorises against the session on the server, and returns
    `Result<T> = { ok: true, data: T } | { ok: false, error: { code, fieldErrors? } }`, where error
    codes map to translation keys.
  - Route handlers exist only for media (`/media/...`).
  - Unexpected errors are logged with context (action name, surface, subject id, error) through a
    small JSON logger to stdout. Users see the translated generic error state (FR-047).
  - Environment variables are parsed with Zod at startup in `src/shared/env.ts`, which fails
    closed.
- **Rationale**: Principle V and the architecture rules in the constitution. A structured logger
  on stdout needs no dependency and works on any host.
- **Alternatives**: REST route handlers for every mutation (more surface area, no benefit with
  forms); a logging library (unneeded at this scale).

## R13. Concurrency between partner and admin edits

- **Decision**: Last write wins. No version columns. Each dish, category, hours set and closure
  records `updated_by_role`, `updated_by_phone` and `updated_at` (FR-055).
- **Rationale**: The spec says the later save wins with no error; nothing else is needed.

## R14. Testing setup

- **Decision**:
  - **Unit tests** (Vitest 5): domain functions (hours, state, closure end, phone normalisation,
    language fallback, dish filter, formatting, message-key parity), colocated as `*.test.ts`.
  - **Integration tests** (Vitest, `*.int.test.ts`): server actions and the media route against a
    real Postgres database named by `TEST_DATABASE_URL`. A global setup applies migrations once,
    and each test file truncates the tables it touches.
  - **End-to-end tests** (Playwright 1.64): one happy path per user story on a 360×780 Chromium
    viewport with touch enabled, plus a 1280×800 desktop project for the admin story only. They
    run against a production build seeded by the demo reset.
- **Rationale**: Mirrors constitution Principle VI exactly.
- **Alternatives**: Testcontainers (an extra dependency; docker-compose plus a documented URL is
  enough).

## R15. Demo reset and seed

- **Decision**: Seed **content** and seed **logic** are separate.
  - **Content** lives in `seed/catalogue.json` plus `seed/images/`. It covers kitchens, people
    (admins, agents, customers, sign-in lists), menus, hours, statuses and image file names. It
    also holds the demo-state flags FR-051 needs (`status`, `suspensionReason`,
    `temporarilyClosedAtReset`, unavailable dishes, a missing Kannada name).
  - **Logic** lives in `src/features/demo/`. It validates the catalogue against a Zod schema (and
    fails closed with a readable error), then writes it through the same domain functions and image
    path the app uses.
  - Replacing the catalogue with the researched one means swapping files only, with no code change.
  - The current outline ([data-model.md](./data-model.md#seed-outline-demo-state-fr-049-to-fr-052))
    is the stand-in catalogue until the researched one is supplied.
- **Reset**: `npm run demo:reset` drops and recreates the schema, runs migrations and loads the
  catalogue.
  - Ids are deterministic: a UUID derived from each catalogue entry's stable key (SHA-1 name-based,
    via Node `crypto`, no dependency). Reloading the same catalogue therefore gives identical ids.
  - The one time-dependent item, a kitchen flagged `temporarilyClosedAtReset`, sets
    `closedAt = now` and computes `reopensAt` with the same domain function (FR-051).
- **Coverage check**: an integration test loads the catalogue and asserts that every FR-050,
  FR-051 and FR-052 condition holds (kitchen counts per type, the special states, the demo
  accounts). A replacement catalogue that drops a scenario fails the test, not the demo.
- **Provenance**: each catalogue kitchen records `menuSource` (`researched` or `fabricated`) and a
  short source note. The note is not shown to users but documents what was invented (spec FR-050).
- **Demo accounts**: sign-in numbers for demo accounts use the `90000xxxxx` block and are listed in
  the demo-only sign-in panel when `DEMO_MODE=true` (FR-011).
- **Rationale**: One step, identical on every run apart from the intentional closure timestamp
  (Principle VI, SC-008). The catalogue can be swapped as the spec's assumptions require.

## R16. Fonts and styling

- **Decision**:
  - Tailwind CSS 4 for styling.
  - `next/font/google` self-hosts Noto Sans Kannada and Noto Sans at build time, so no request
    goes to Google at runtime.
  - Large touch targets (at least 48 px) and colour-coded primary actions are set as shared UI
    primitives in `src/shared/ui/`.
  - Veg and non-veg marks use the standard Indian square-and-dot symbol plus a text label, so
    colour is never the only signal.
- **Rationale**: Constitution technology list and Principle IV accessibility rules.

## Dependencies added (one line each, per Principle VIII)

| Dependency | Reason |
|---|---|
| next, react, react-dom | Mandated framework |
| typescript (6.0) | Mandated, strict mode |
| tailwindcss, @tailwindcss/postcss | Mandated styling |
| drizzle-orm, drizzle-kit | Mandated ORM and versioned migrations |
| postgres | PostgreSQL driver for Drizzle |
| zod | Mandated boundary validation |
| next-intl | The one i18n library (chosen here, recorded in README) |
| sharp | Server-side image resizing (Principle IV: resized images) |
| server-only | Makes the build fail if server code is imported from a client component |
| vitest | Mandated unit and integration tests |
| @playwright/test | Mandated end-to-end tests |
| eslint, eslint-config-next, prettier | Lint and formatting (one tool each, recorded in README) |
