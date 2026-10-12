# Prompt: /speckit-constitution

Paste everything below the line into the build session after `/speckit-constitution `.
The constitution is the durable rulebook for the project. Scope, features and the current
list of mocked integrations do NOT belong here; they live in specs and in `docs/fidelity-matrix.md`.

---

Create the constitution for the Honnavar Food Delivery app: a bilingual (Kannada and English) food delivery platform for Honnavar town, Uttara Kannada, Karnataka, with four surfaces in one codebase: a customer app, a food partner app (restaurants, home kitchens, cloud kitchens), a delivery agent app, and an admin web panel. It is being built first as a proof of concept, but the principles below are written to hold for the real product too. The source PRD is in docs/prd/. Use these inputs for the template sections.

CORE PRINCIPLES

1. Kannada first, fully bilingual. Kannada is the default language, English is one tap away, and a visible language toggle exists on every screen. All interface text on a screen (labels, buttons, navigation, statuses, messages, dates, currency) is in the selected language; mixed-language interface text is a defect. Every interface string goes through a translation key; hard-coded user-facing text is a defect. Content follows separate rules: partner-authored content (kitchen names, dish names, descriptions) is stored as a language pair and shown in the selected language, falling back to the other language with a visible marker when a translation is missing; proper nouns and brand names (place names, UPI, WhatsApp) are not translated; user-generated text (addresses, notes) is shown exactly as entered. System formatting uses the kn-IN or en-IN locale with Latin digits and the rupee symbol. Each spec must state, for every new piece of text, which of these categories it belongs to. Kannada interface strings may be marked as machine-drafted pending native review, but a screen is not complete until both languages exist.

2. Honest integrations. Every external dependency (authentication and OTP delivery, payments, messaging, maps and location, document verification) is accessed through a single adapter module with a stable interface so the implementation can be swapped without touching callers. Stand-in implementations are permitted when a spec declares them, must be deterministic and never randomly fail, and must be visibly labelled as stand-ins in code and documentation. Nothing is silently faked. Each spec must reference docs/fidelity-matrix.md and state which of its capabilities are fully implemented, which use a declared stand-in, and which are out of scope.

3. One codebase, four surfaces. Each surface has its own entry route and its own role-specific login screen; the user's role is determined by the entry point. Customer, partner and agent surfaces are mobile-first and must be usable on a low-end Android phone in Chrome at 360px width; the admin panel is desktop-first. Domain model, translation files, and UI primitives are shared across surfaces.

4. Designed for first-time smartphone users. A customer can place an order in four taps or fewer from the home screen. Large touch targets, pictures over words, colour-coded primary actions, and one obvious next step per screen. Pages stay light: minimal client JavaScript, lazily loaded and resized images, no blocking third-party scripts, and graceful behaviour on slow or flaky networks.

5. Tested and demonstrable. Domain logic (order state machine, cart totals, language fallback) has unit tests. API routes have integration tests against a real test database. Each feature ships at least one end-to-end test of its primary happy path on a mobile viewport. Each feature ships seed data and contributes to a single command that resets the database to a known demo state. The app runs from a clean clone with only documented environment variables.

6. Simplicity. Prefer the simplest design that satisfies the spec. No speculative abstractions, no features outside the current spec, no premature optimisation, no new dependency without a stated reason in the plan.

ADDITIONAL CONSTRAINTS (technology)

Next.js App Router with TypeScript in strict mode; Tailwind CSS; PostgreSQL through Drizzle ORM with versioned migrations; Playwright for end-to-end tests and Vitest for unit and integration tests; Leaflet with OpenStreetMap tiles for maps. No paid API keys. No provider-specific services beyond standard PostgreSQL, so the app can be hosted on any free tier or a single VM. Cross-role updates use short-interval polling unless a spec justifies something else. No third-party authentication providers, payment SDKs, queues or message brokers unless a spec introduces them through principle 2.

DEVELOPMENT WORKFLOW

Every feature goes through specify, clarify, plan, checklist, tasks, analyze, implement and converge. A human reviews and approves spec.md before plan runs, and plan.md before tasks run. Work happens on the feature branch created by specify; main only receives merges of converged features whose tests pass. Commits are small and reference the task id. Prompts given to Spec Kit are saved under docs/speckit-prompts/ so the process is reproducible. When the agent is uncertain about a product decision it asks in clarify rather than guessing.

GOVERNANCE

This constitution supersedes other practices. Specs, plans and code reviews check compliance with it explicitly. Amendments require a short written rationale and a version bump following semantic versioning. Start at version 1.0.0.
