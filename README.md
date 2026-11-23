# Thryve Growth Co. website

Career coaching platform for Thryve Growth Co.: clients book sessions, pay through Stripe and use a personal dashboard; the coach runs it from an admin area. Live at https://thryvegrowth.co.

## Stack

Next.js 16.2 (App Router, `src/proxy.ts` instead of middleware), React 19, TypeScript, Tailwind CSS v4, Supabase (database and auth, migrations in `supabase/`), Stripe, Resend for email, Vercel Analytics. Vercel deploys `main`.

Read `CLAUDE.md` and `AGENTS.md` before changing code: Next.js 16 has breaking changes.

## Work on it locally

```bash
cp .env.local.example .env.local   # then fill in the values (see docs/environment-variables.md)
npm install
npm run dev     # also regenerates the help content
npm run build   # runs the OG-image, OG-URL and no-em-dash checks first
npm run lint
```

## Docs

`docs/` has the architecture (`developer-architecture.md`), database schema, integrations, environment variables, testing guide and the admin guides. Open work is tracked in `tasks/todo.md`.
