# Prompt: /speckit-constitution

Paste everything below the line into the build session after `/speckit-constitution `.

---

This is the Honnavar Food Delivery POC: a bilingual (Kannada and English) food delivery app for Honnavar town, Uttara Kannada, Karnataka, with four surfaces in one codebase: a customer app, a food partner (restaurant, home kitchen, cloud kitchen) app, a delivery agent app, and an admin web panel. It is a proof of concept for a potential client and a showcase of spec-driven development, so it must be genuinely usable in a demo, not throwaway. The source PRD is in docs/prd/. Write the constitution with these principles:

1. Kannada first, fully bilingual. Kannada is the default language, English is one tap away, and a visible language toggle exists on every screen. A screen is never mixed-language. Every user-facing string goes through a translation key; hard-coded UI text is a defect. Four kinds of text are handled differently and every spec must say which kind each new text is: (a) static UI strings live in translation files and both languages must exist before a screen is complete, with Kannada allowed to be marked as machine-drafted pending native review; (b) partner-authored content such as kitchen names, dish names and descriptions is stored as a language pair in the database, entered by the partner, and falls back to English with a visible marker when Kannada is missing; (c) system-generated text such as order statuses, dates, times and currency uses translation keys plus kn-IN locale formatting, keeping Latin digits and the rupee symbol; (d) user-generated text such as addresses and notes is shown exactly as entered and never translated.

2. Explicit POC fidelity tiers. Every feature spec must include a table that classifies each capability as Real (works end to end against the shared database), Mock (looks real to the user but no external system is touched), or Not built. Mocks must be deterministic and demo-friendly: fixed OTP, instant success, no random failures. Every mocked integration (authentication and OTP, payments, SMS and WhatsApp notifications, maps and location, file verification) sits behind a single service module with a stable interface so it can be replaced by a real integration without touching callers. Nothing may be silently faked; if it is a mock the spec and the code say so.

3. One codebase, four surfaces. The application is a single Next.js (App Router, TypeScript) project. Each surface has its own entry route and its own role-specific login screen; the user's role comes from which entry point they used. Customer, partner and agent surfaces are mobile-first and must be usable on a low-end Android phone in Chrome at 360px width; the admin panel is desktop-first. Domain model, translation files and UI primitives are shared.

4. Designed for first-time smartphone users. A customer can place an order in four taps or fewer from the home screen. Large touch targets, pictures over words, colour-coded primary actions, and one obvious next step per screen. Pages stay light: minimal client JavaScript, lazily loaded and resized images, no blocking third-party scripts.

5. Boring, portable stack. Next.js with TypeScript, Tailwind CSS, PostgreSQL accessed through Drizzle ORM, Leaflet with OpenStreetMap tiles for maps. No paid API keys and no provider-specific services beyond standard PostgreSQL, so the app can run on any free tier or a single VM. Cross-role updates use short-interval polling, not websockets, unless a spec justifies otherwise. No authentication providers, payment SDKs, queues or message brokers in the POC.

6. Testable and demoable. Domain logic (order state machine, cart totals, language fallback) has unit tests. API routes have integration tests against a test database. Each feature ships at least one Playwright end-to-end test for its primary happy path on a mobile viewport. Every feature ships with seed data and a single command that resets the database to a known demo state. The app must run from a clean clone with only documented environment variables.

7. Simplicity. Prefer the simplest design that satisfies the spec. No speculative abstractions, no features outside the current spec, no premature optimisation. Three similar lines are better than a premature helper.

Governance: this constitution supersedes other practices. Every spec must reference the fidelity table (principle 2) and the text-kind classification (principle 1). Amendments require a short written rationale in the constitution's history section. Version this as 1.0.0.
