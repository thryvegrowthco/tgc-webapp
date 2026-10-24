-- Seed: Christine S. testimonial (Resume & Career Materials)
--
-- Run manually by an admin (Supabase SQL Editor or `psql`) when you want this
-- testimonial live without using /admin/testimonials/new. It is NOT applied by
-- `supabase db push` and is NOT part of the migrations folder.
--
-- Idempotent: the WHERE NOT EXISTS guard means re-running it is a no-op once the
-- row is present. The $q$...$q$ dollar-quoting preserves the blank lines between
-- paragraphs; each paragraph must begin at column 0 so no stray indentation
-- leaks into the quote. The whitespace-pre-line rendering on the public pages
-- turns those blank lines into real paragraph breaks.

INSERT INTO testimonials (quote, author_name, author_title, service_type, rating, status, approved_at, submitted_at)
SELECT $q$Rachel did an amazing job helping me update my resume. She really listened to what I was looking for, took the time to understand my experience, and made great recommendations that helped create a much cleaner and more professional resume.

The updated resume gave me a huge confidence boost. I started applying for jobs on a Friday, and by that weekend I was already getting responses from employers. Within a short time, I had multiple offers and ultimately landed a position that I've now been happily working in for about 8 months.

The final resume was polished, easy to read, and highlighted my skills and experience without feeling cluttered or overly wordy. If you're considering resume services, I would absolutely recommend working with Rachel. Her expertise and attention to detail made a real difference in my job search.$q$,
  'Christine S.', NULL, 'Resume & Career Materials', 5, 'approved', now(), now()
WHERE NOT EXISTS (SELECT 1 FROM testimonials WHERE author_name = 'Christine S.' AND quote LIKE 'Rachel did an amazing job helping me update my resume.%');
