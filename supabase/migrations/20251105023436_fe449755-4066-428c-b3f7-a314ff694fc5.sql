-- Migration 0005: Recency & Frequency Clarifications (Fixed v2)
-- Store explicit numerators/denominators, compute recency at read time

-- ============================================================
-- Part 1: Add explicit frequency columns
-- ============================================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'activity_summaries' 
    AND column_name = 'frequency_numerator'
  ) THEN
    ALTER TABLE public.activity_summaries 
    ADD COLUMN frequency_numerator INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'activity_summaries' 
    AND column_name = 'frequency_denominator'
  ) THEN
    ALTER TABLE public.activity_summaries 
    ADD COLUMN frequency_denominator INTEGER DEFAULT 1;
  END IF;
END $$;

COMMENT ON COLUMN public.activity_summaries.frequency_numerator IS 'Number of visits to this place_type/time_window';
COMMENT ON COLUMN public.activity_summaries.frequency_denominator IS 'Total visits by user on this date';

-- ============================================================
-- Part 2: Backfill frequency numerator/denominator
-- ============================================================

UPDATE public.activity_summaries
SET 
  frequency_numerator = visit_count,
  frequency_denominator = (
    SELECT SUM(visit_count)
    FROM public.activity_summaries AS inner_sum
    WHERE inner_sum.user_id = activity_summaries.user_id
      AND inner_sum.summary_date = activity_summaries.summary_date
  )
WHERE frequency_numerator = 0 OR frequency_denominator = 1;

-- ============================================================
-- Part 3: Create materialized view with computed recency
-- ============================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_activity_summaries_with_recency AS
SELECT 
  *,
  -- Compute recency score with 30-day half-life (using date subtraction)
  POWER(0.5::DOUBLE PRECISION, (CURRENT_DATE - summary_date)::DOUBLE PRECISION / 30.0) as computed_recency_score,
  -- Days since this activity
  (CURRENT_DATE - summary_date)::integer as days_ago
FROM public.activity_summaries;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_activity_summaries_recency_id 
  ON public.mv_activity_summaries_with_recency(id);

CREATE INDEX IF NOT EXISTS idx_mv_activity_summaries_recency_user 
  ON public.mv_activity_summaries_with_recency(user_id, summary_date DESC);

COMMENT ON MATERIALIZED VIEW public.mv_activity_summaries_with_recency IS 'Activity summaries with fresh recency scores (refresh nightly)';

-- ============================================================
-- Part 4: Function to refresh materialized view
-- ============================================================

CREATE OR REPLACE FUNCTION public.refresh_activity_recency()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_activity_summaries_with_recency;
  RAISE NOTICE 'Refreshed activity recency view at %', now();
END;
$function$;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✓ C6 Migration Complete: Recency & frequency clarified';
  RAISE NOTICE '  - Added frequency_numerator, frequency_denominator';
  RAISE NOTICE '  - Created materialized view with computed recency';
  RAISE NOTICE '  - Schedule: pg_cron to run refresh_activity_recency() nightly';
END $$;