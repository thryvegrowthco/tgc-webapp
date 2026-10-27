-- 0040_email_templates_no_emdash.sql
--
-- NOT APPLIED. Review the output on a copy first; Rachel may have edited these
-- templates in Admin -> Templates, so the stored copy may differ from the seeds
-- below. Nothing here runs automatically (migrations in this repo are file-only,
-- applied by hand via an apply-0040.sql in the Supabase SQL editor).
--
-- WHAT THIS DOES
-- Removes em dashes (U+2014) from the customer-facing email_templates rows so the
-- stored copy matches the de-em-dashed fallbacks in src/lib/email/defaults.ts.
-- It uses targeted replace() calls, which are inherently safe: a replace() that
-- finds no match leaves the row untouched. So any row Rachel has customized away
-- from the seed simply keeps its current body/subject and is surfaced by the
-- diagnostic SELECT at the bottom for a manual fix in Admin -> Templates.
--
-- WHY NOT A BLANKET RULE
-- A single `replace(body, ' <em dash> ', '. ')` is NOT safe: subjects like
-- "Welcome to Thryve Growth Co. <em dash> here's what comes next" would become
-- "Co.. here's" (double period), and some dashes read better as a colon. The
-- rules below mirror the exact, context-aware edits already made in defaults.ts.
--
-- Columns: public.email_templates(subject TEXT, body_html TEXT, ...).

-- 1) Subjects (context-aware: ": " or ". ").
UPDATE public.email_templates
SET subject =
  replace(
  replace(
  replace(
  replace(subject,
    'Welcome to Thryve Growth Co. — here''s what comes next',
    'Welcome to Thryve Growth Co.: here''s what comes next'),
    'One more nudge — your intake form for {{service_type}}',
    'One more nudge: your intake form for {{service_type}}'),
    'Got it — I''ll review before we meet',
    'Got it. I''ll review before we meet'),
    'Starting soon — your Thryve session at {{session_time}}',
    'Starting soon: your Thryve session at {{session_time}}'),
    updated_at = NOW()
WHERE subject LIKE '%—%';

-- 2) Body HTML.
--    First the sign-off, which is the same across every template: the stored copy
--    ends each email with either "<br/>— Rachel</p>" or ">— Rachel</p>". Both end
--    in ">— Rachel</p>", so one rule drops the "— " and leaves "Rachel" on its own
--    line. Then the handful of mid-sentence dashes, each matching defaults.ts.
UPDATE public.email_templates
SET body_html =
  replace(
  replace(
  replace(
  replace(
  replace(
  replace(body_html,
    '>— Rachel</p>',
    '>Rachel</p>'),
    'Just a friendly nudge — your intake form for our upcoming {{service_type}} is due in 48 hours.',
    'Just a friendly nudge. Your intake form for our upcoming {{service_type}} is due in 48 hours.'),
    'I''m as prepared as possible — the more I know going in, the more we can get done together.',
    'I''m as prepared as possible. The more I know going in, the more we can get done together.'),
    '<strong>Review what we covered</strong> — any notes or materials I shared are in your',
    '<strong>Review what we covered</strong>: any notes or materials I shared are in your'),
    'if it''s been helpful — it takes about 60 seconds and means a lot.',
    'if it''s been helpful. It takes about 60 seconds and means a lot.'),
    'Good news — <strong>{{match_count}}</strong>',
    'Good news: <strong>{{match_count}}</strong>'),
    updated_at = NOW()
WHERE body_html LIKE '%—%';

-- 3) DIAGNOSTIC (does not modify anything). After the updates above, run this to
--    list any rows that still contain an em dash. Each one is a customized row the
--    rules did not match; fix it by hand in Admin -> Templates.
--
-- SELECT key,
--        (subject LIKE '%—%')   AS subject_has_em_dash,
--        (body_html LIKE '%—%') AS body_has_em_dash,
--        subject
-- FROM public.email_templates
-- WHERE subject LIKE '%—%' OR body_html LIKE '%—%'
-- ORDER BY key;
