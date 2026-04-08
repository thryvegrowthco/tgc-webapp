@AGENTS.md

# Documentation Maintenance

This project has living documentation in `/docs/`. Update the relevant file(s) when
modifying code — as part of the changeset, not as an afterthought.

## Which File to Update for What Change

| Change type | Update this file |
|---|---|
| New/modified admin UI, screen, or workflow | `docs/rachel-admin-guide.md` |
| New route, component, server action, or API route | `docs/developer-architecture.md` |
| New/modified DB table, column, index, or RLS policy | `docs/database-schema.md` |
| Changes to a third-party integration or its config | `docs/integrations.md` |
| Env var added, removed, or renamed | `docs/environment-variables.md` |
| Key data flow change (booking, watchlist, blog, documents, auth, cron) | `docs/workflows.md` |

## Rules

1. Do not add fictional information — only document what the code actually does.
2. `docs/rachel-admin-guide.md` is for a non-technical admin — no code blocks, no TypeScript, plain language only.
3. All other docs are for developers — include file paths and function names.
4. If you add a Stripe price ID: update `docs/environment-variables.md` AND `src/lib/stripe/products.ts` — they must stay in sync.
5. If you rename or move a file referenced in docs, update the reference.
6. Subscription cancellation is NOT yet handled in the Stripe webhook (`customer.subscription.deleted`). If you add it, update `docs/workflows.md` and `docs/rachel-admin-guide.md`.
