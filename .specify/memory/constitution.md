# Honnavar Food Delivery Constitution

Honnavar Food Delivery is a bilingual (Kannada and English) food delivery platform for Honnavar
town, Uttara Kannada, Karnataka. One Next.js codebase serves four surfaces: a customer app, a food
partner app (restaurants, home kitchens, cloud kitchens), a delivery agent app, and an admin web
panel. It is being built first as a proof of concept, but these principles are written to hold for
the real product. The PRD is in `docs/prd/`. The current list of real versus stand-in capabilities
is in `docs/fidelity-matrix.md`, not here.

**How to read this document.** It sets direction and guardrails, not a straitjacket. MUST marks the
few rules that are genuinely non-negotiable; they change only by amendment. SHOULD marks the
default. Where a SHOULD rule and good engineering judgment conflict, the agent does the sensible
thing and records the deviation and its reason in the plan.

## Core Principles

### I. Spec First

- Specs say what and why in user terms and contain no implementation detail. Plans say how and
  introduce no new requirements.
- If a plan needs a requirement the spec lacks, the spec MUST be updated first.
- Ambiguities that would materially change the solution MUST be raised as `[NEEDS CLARIFICATION]`
  and resolved with a human before implementation. Small routine choices are made by the agent and
  listed in the plan so they can be reviewed.
- Scope beyond the current spec, including adjacent refactors, SHOULD go into a new spec rather
  than being absorbed.

**Rationale**: Keeping what and how apart lets a human approve the product decision before effort
is spent on the build, and keeps each spec's scope reviewable.

### II. Both Languages, Equal

Kannada and English have full parity: nothing is available in one and not the other.

- A screen MUST NOT be considered done until both languages exist. Strings MAY be marked
  machine-drafted pending native review.
- All interface text on a screen (labels, buttons, navigation, statuses, dates, currency) MUST be
  in the selected language and go through a translation key. Hard-coded user-facing text is a
  defect.
- The default language is a configuration setting (English for the POC), changeable per
  deployment without code changes. The user's choice is remembered.
- A visible language toggle SHOULD exist on every screen.
- Content has separate rules:
  - **Partner-authored content** (such as kitchen and dish names) is stored as a language pair and
    shown in the selected language, falling back to the other language with a visible marker when
    missing.
  - **Proper nouns and brand names** are not translated.
  - **User-generated text** (such as addresses and notes) is shown as entered.
  - **Formatting** uses the `kn-IN` or `en-IN` locale with Latin digits and the rupee symbol.
- Each spec states which of these categories each new piece of text belongs to.

**Rationale**: The town's users read Kannada, English or both; neither group may be second-class.
Naming the content categories up front stops ad-hoc decisions about what gets translated.

### III. Honest Integrations

- Every external dependency (authentication and OTP delivery, payments, messaging, maps and
  location, document verification) MUST be accessed through one adapter module with a stable
  interface, so it can be swapped without touching callers.
- Nothing is silently faked. Stand-in implementations are allowed when a spec declares them; they
  MUST be deterministic, never fail randomly, and be labelled as stand-ins in code and docs.
- Each spec references `docs/fidelity-matrix.md` and states what it implements fully, what uses a
  stand-in, and what is out of scope.

**Rationale**: A POC that hides its fakes misleads the people evaluating it. Adapters keep the move
to real providers a local change.

### IV. Built for First-Time Smartphone Users

- Customer, partner and agent surfaces are mobile-first and MUST work on a low-end Android phone in
  Chrome at 360px width. The admin panel is desktop-first.
- A customer SHOULD be able to place an order in four taps or fewer from the home screen.
- Screens SHOULD use large touch targets, pictures over words, colour-coded primary actions, and
  one obvious next step per screen.
- Pages SHOULD stay light: server-rendered by default, minimal client JavaScript, resized and lazily
  loaded images, no blocking third-party scripts, graceful behaviour on slow networks.
- Accessibility: semantic HTML first, every input labelled, every meaningful image with alt text,
  and colour never the only indicator of state.

**Rationale**: Many target users are new to smartphones and use inexpensive devices on patchy
mobile data. Every extra tap, word or kilobyte is a reason to give up.

### V. Typed and Validated at the Edges

- TypeScript strict mode; no new JavaScript files. `any` only at a commented third-party adapter
  boundary.
- Data crossing a trust boundary (route handler bodies, server action arguments, search params,
  form input, environment variables) MUST be validated by a schema layer that fails closed. A type
  is a compile-time promise, not a runtime guarantee.
- Secrets MUST NOT reach the client. Server actions and route handlers MUST re-validate and
  authorise on the server regardless of what the client did.

**Rationale**: Four roles share one backend; a check that only runs in the browser is no check at
all.

### VI. Tested Where It Matters

- Test-first for domain logic (order state machine, cart totals, language fallback) and for
  services. Not required for framework scaffolding, config or thin wrappers.
- Three layers: unit tests for pure logic; integration tests for API routes and server actions
  against a real test database; one end-to-end happy path per feature on a mobile viewport.
- Test behaviour, not implementation.
- Every feature ships seed data and contributes to one command that resets the database to a known
  demo state.
- The app MUST run from a clean clone with only documented environment variables.

**Rationale**: The POC exists to be shown. Tests where the logic lives, and a reliable demo state,
make every demo repeatable and every change safe.

### VII. Explicit States, Honest Errors

- Every screen handles loading, empty, error and not-found states. A permanent spinner or blank
  screen is a defect.
- Users MUST NOT see stack traces or raw payloads.
- Errors are logged with enough context to debug.

**Rationale**: On a slow network the in-between states are what users see most. A clear message
keeps a first-time user going; a raw error loses them.

### VIII. Simplicity

- The simplest design that satisfies the spec. No speculative abstraction: shared code is promoted
  when a second feature needs it, not predicted.
- Smallest safe change. Do not touch unrelated files; follow existing naming and structure.
- Every new dependency has a one-line reason in the plan.
- No dead code, commented-out code or debug logging on main.

**Rationale**: Unneeded complexity slows delivery and hides the parts that matter.

## Technology and Architecture

**Stack**

- Next.js App Router with TypeScript strict; Tailwind CSS.
- PostgreSQL via Drizzle ORM with versioned migrations.
- Zod for boundary validation.
- Vitest for unit and integration tests; Playwright for end-to-end tests.
- Leaflet with OpenStreetMap tiles for maps.
- One i18n library, chosen in the first plan.

**Tooling and hosting rules**

- One sanctioned tool per concern, recorded in `README.md`. Adding a second tool for a covered
  concern means replacing the first.
- No paid API keys and nothing provider-specific beyond standard PostgreSQL, so the app can run on
  any free tier or one VM.
- Cross-role updates use short-interval polling unless a spec justifies otherwise.
- No third-party auth providers, payment SDKs, queues or brokers unless introduced through
  Principle III.

**Structure**

- Organise by feature domain under `src/features/<name>/`. Shared UI primitives, i18n, database
  and adapters live in shared folders.
- Server-only code is isolated so that importing it from a client component fails the build.
- `app/` holds routes, with one route group per surface, each with its own layout and login
  screen. The user's role is determined by the entry point.
- Server Components by default; `"use client"` only at the leaves that need interactivity.
- Server actions validate their input and return typed results rather than throwing across the
  boundary.
- Use `next/image` and `next/font`.
- Domain model, translations and UI primitives are shared across the four surfaces.

## Development Workflow

- Each feature goes through specify, clarify, plan, checklist, tasks, analyze, implement and
  converge.
- A human MUST approve `spec.md` before plan and `plan.md` before tasks.
- Work happens on the feature branch created by specify. Main MUST receive only converged features
  with lint, type-check, tests and build green.
- Commits are small and reference the task id.
- The agent MUST run lint, type-check, tests and build itself before claiming work is done, and
  says plainly when something is untested or incomplete.
- When uncertain about a product decision, the agent asks in clarify rather than guessing.

## Governance

- This constitution supersedes ad hoc practice.
- Every plan includes a constitution check against these principles. Code review checks
  compliance, and deviations are justified in writing.
- Amendments are made through `/speckit-constitution` with a short rationale and a semantic
  version bump:
  - MAJOR: removing or redefining a principle.
  - MINOR: adding a principle or materially expanding guidance.
  - PATCH: clarifications.

**Version**: 1.0.0 | **Ratified**: 2026-10-12 | **Last Amended**: 2026-10-12
