# Delivery phases

The POC is built as a small number of large Spec Kit features. Each feature is sized by what one
person can review and test in a sitting, not by what the model can generate in one go.

| Phase | Where it happens | Output |
|---|---|---|
| 0. Scope and architecture | Planning session (no Spec Kit) | Expanded PRD, fidelity matrix (Real / Mock / Not built), architecture decisions, constitution |
| 1. Platform core | Spec Kit feature 001 | All four portals log in (mock auth), admin onboards partners and agents, partners manage menus and hours, customers browse, search and filter. i18n plumbing with English complete and Kannada drafted. Minimal Honnavar seed data. |
| 2. Ordering | Spec Kit feature 002 | Cart, checkout, mock payment, order lifecycle visible across all four roles, notification log, mock tracker map. This is the first demo milestone. |
| 3. Content and language | Spec Kit feature 003 plus research | Realistic bilingual seed catalogue (kitchens, dishes, landmarks, photos), full Kannada review, voice prompts, rural UX pass (4 taps, pictures over words). |
| 4. Polish and demo | Spec Kit feature 004 | Visual design pass, PWA install, demo reset, hosting decision and deployment, demo script. |

## Working loop per feature

1. Planning session drafts the `/speckit-specify` prompt (see `docs/speckit-prompts/`).
2. Build session runs specify, then clarify.
3. Planning session reviews `spec.md`; fixes go back through clarify or direct edits.
4. Build session runs plan, checklist, tasks, analyze, implement, converge.
5. Human tests the feature against the spec's acceptance scenarios on a phone.
