-- NOT APPLIED. Proposed by Run K. Apply manually after review.
-- App code tolerates this migration being absent:
--   * The contact API (src/app/api/contact/route.ts) still emails the admin and
--     only logs a short error when contact_messages is missing.
--   * The form rate limiter (src/lib/security/rate-limit.ts) falls back to an
--     in-memory limiter when form_rate_limits is missing.

-- ─── contact_messages ────────────────────────────────────────────────────────
-- Durable store for public contact-form submissions so a Resend outage never
-- silently drops a message. The API inserts with the service role only.
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id          UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name  TEXT        NOT NULL,
  last_name   TEXT        NOT NULL,
  email       TEXT        NOT NULL,
  subject     TEXT        NOT NULL,
  message     TEXT        NOT NULL,
  status      TEXT        NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'archived')),
  email_sent  BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contact_messages_created_at_idx
  ON public.contact_messages (created_at DESC);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Admins may read and manage messages. There is deliberately no INSERT access
-- for anon/authenticated: the grant below withholds INSERT, so the only writer
-- is the service role (which bypasses RLS). is_admin() is defined in 0001.
CREATE POLICY "contact_messages_admin" ON public.contact_messages
  FOR ALL USING (public.is_admin());

REVOKE ALL ON public.contact_messages FROM anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.contact_messages TO authenticated;

-- ─── form_rate_limits ────────────────────────────────────────────────────────
-- One row per accepted public-form submission, used to count requests inside a
-- sliding window. Service role only: RLS is enabled with no policies, and all
-- privileges are revoked from anon/authenticated.
CREATE TABLE IF NOT EXISTS public.form_rate_limits (
  id         BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  bucket     TEXT        NOT NULL,
  key_hash   TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS form_rate_limits_lookup_idx
  ON public.form_rate_limits (bucket, key_hash, created_at DESC);

ALTER TABLE public.form_rate_limits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.form_rate_limits FROM anon, authenticated;

-- ─── Harden newsletter_subscribers inserts ───────────────────────────────────
-- The "newsletter_insert_anon" policy (0001) allowed any anon/authenticated
-- caller to INSERT a subscriber straight through PostgREST, skipping the
-- /api/newsletter route (which uses the service client). No browser or
-- anon-client insert path exists in the app, so this policy is safe to drop;
-- without it, bots can no longer self-insert subscribers.
DROP POLICY IF EXISTS "newsletter_insert_anon" ON public.newsletter_subscribers;
