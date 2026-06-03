-- Thryve Growth Co. — Schedule-first availability management
--
-- Flips the booking-availability model from "transactional bulk-insert of
-- discrete slot rows" to "persistent recurring patterns + auto-extended
-- rolling window." A daily cron materializes the next 8 weeks of slots from
-- active patterns into the existing `availability_slots` table so the public
-- booking calendar code keeps working unchanged.
--
-- Existing slots without `pattern_id` (those created by the legacy
-- `BulkSlotForm`) are untouched and continue to be bookable/deletable as
-- before.
--
-- Tables added:
--   availability_patterns   — one row per weekly time block; many compose Rachel's schedule
--   availability_blackouts  — vacation / holiday date ranges to suppress materialization
--
-- Column added:
--   availability_slots.pattern_id  — back-reference for "rebuild forward" edits

-- ─── availability_patterns ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS availability_patterns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),  -- 0 = Sunday, 6 = Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_duration_minutes INT,  -- NULL = the whole block is one slot
  service_type TEXT,           -- NULL = available for any service
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_until DATE,        -- NULL = recurring forever
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT availability_patterns_end_after_start CHECK (end_time > start_time),
  CONSTRAINT availability_patterns_until_after_from CHECK (effective_until IS NULL OR effective_until >= effective_from),
  CONSTRAINT availability_patterns_duration_positive CHECK (slot_duration_minutes IS NULL OR slot_duration_minutes > 0)
);

CREATE INDEX IF NOT EXISTS availability_patterns_active_dow_idx
  ON availability_patterns(is_active, day_of_week);
CREATE INDEX IF NOT EXISTS availability_patterns_effective_idx
  ON availability_patterns(effective_from, effective_until);

ALTER TABLE availability_patterns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "availability_patterns_admin" ON availability_patterns
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ─── availability_blackouts ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS availability_blackouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT availability_blackouts_end_on_or_after_start CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS availability_blackouts_range_idx
  ON availability_blackouts(start_date, end_date);

ALTER TABLE availability_blackouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "availability_blackouts_admin" ON availability_blackouts
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ─── availability_slots: pattern back-reference ──────────────────────────────
-- Existing rows get pattern_id = NULL (one-off slots from the legacy bulk
-- form). ON DELETE SET NULL means deleting a pattern never cascades into
-- removing booked slots; the rebuild-forward routine handles unbooked cleanup
-- explicitly.
ALTER TABLE availability_slots
  ADD COLUMN IF NOT EXISTS pattern_id UUID REFERENCES availability_patterns(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS availability_slots_pattern_id_idx
  ON availability_slots(pattern_id) WHERE pattern_id IS NOT NULL;
