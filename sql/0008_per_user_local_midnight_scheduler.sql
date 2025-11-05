-- Migration: Per-user local-midnight sessionization scheduler (DST-safe)
-- Purpose: Run sessionization once per user when their local date flips to a new day
-- Frequency: Every 15 minutes via pg_cron (staggered at 05/20/35/50 past each hour)

-- ============================================
-- 1. Enable pg_cron extension
-- ============================================
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================
-- 2. Add timezone column to profiles if needed
-- ============================================
-- Assumption: stores IANA timezone strings (e.g., 'America/New_York', 'America/Los_Angeles')
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS timezone TEXT;

-- Create index for timezone lookups
CREATE INDEX IF NOT EXISTS idx_profiles_timezone 
  ON public.profiles(timezone) 
  WHERE timezone IS NOT NULL;

-- ============================================
-- 3. Create dedupe table
-- ============================================
-- Guarantees at most one sessionization run per user per local date
CREATE TABLE IF NOT EXISTS public.user_midnight_runs (
  user_id UUID NOT NULL,
  local_date DATE NOT NULL,
  ran_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, local_date)
);

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_user_midnight_runs_ran_at 
  ON public.user_midnight_runs(ran_at DESC);

-- Enable RLS
ALTER TABLE public.user_midnight_runs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: users can view their own runs
CREATE POLICY "Users can view their own midnight runs" 
  ON public.user_midnight_runs FOR SELECT 
  TO authenticated 
  USING (auth.uid() = user_id);

-- ============================================
-- 4. Create scheduler function
-- ============================================
-- Finds users whose local date changed within a window and runs sessionization
CREATE OR REPLACE FUNCTION public.run_sessionize_for_users_crossing_midnight(
  gap_threshold_minutes INTEGER DEFAULT 10,
  lookback_hours INTEGER DEFAULT 24,
  window_minutes INTEGER DEFAULT 30  -- look-back window to catch midnight crossing
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now_utc TIMESTAMPTZ := NOW();
  v_prev TIMESTAMPTZ := v_now_utc - MAKE_INTERVAL(mins => window_minutes);
  r RECORD;
  runs INTEGER := 0;
  new_local_date DATE;
  inserted INTEGER;
BEGIN
  -- Loop over users whose local date changed within the window
  FOR r IN
    SELECT p.id AS user_id, p.timezone
    FROM public.profiles p
    WHERE p.timezone IS NOT NULL
      AND ((v_now_utc AT TIME ZONE p.timezone)::DATE)
          <> ((v_prev AT TIME ZONE p.timezone)::DATE)
  LOOP
    -- Compute the "new" local date we just crossed into for dedupe
    new_local_date := (v_now_utc AT TIME ZONE r.timezone)::DATE;

    -- Insert into dedupe table; skip if already processed
    INSERT INTO public.user_midnight_runs(user_id, local_date)
    VALUES (r.user_id, new_local_date)
    ON CONFLICT (user_id, local_date) DO NOTHING;

    GET DIAGNOSTICS inserted = ROW_COUNT;

    IF inserted > 0 THEN
      -- Run sessionization for this user
      PERFORM public.sessionize_recent_visits(
        r.user_id, 
        gap_threshold_minutes, 
        lookback_hours
      );
      runs := runs + 1;
    END IF;
  END LOOP;

  RETURN runs;
END;
$$;

COMMENT ON FUNCTION public.run_sessionize_for_users_crossing_midnight IS 
  'DST-safe per-user sessionization triggered when local date changes';

-- ============================================
-- 5. Schedule cron job
-- ============================================
-- Unschedule if already exists (idempotent)
DO $$
BEGIN
  PERFORM cron.unschedule('spotmate-sessionize-local-midnight');
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_function THEN NULL;
END $$;

-- Schedule: every 15 minutes (UTC), staggered at 05/20/35/50 past each hour
-- Avoids top-of-hour load spikes
SELECT cron.schedule(
  'spotmate-sessionize-local-midnight',
  '5,20,35,50 * * * *',
  $$ SELECT public.run_sessionize_for_users_crossing_midnight(10, 24, 30); $$
);

-- ============================================
-- 6. Grant permissions
-- ============================================
GRANT EXECUTE ON FUNCTION public.run_sessionize_for_users_crossing_midnight TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✓ Per-user Local Midnight Sessionization Scheduler Deployed';
  RAISE NOTICE '  - Cron: every 15 minutes at 5/20/35/50 past each hour';
  RAISE NOTICE '  - Function: run_sessionize_for_users_crossing_midnight()';
  RAISE NOTICE '  - Dedupe table: user_midnight_runs';
  RAISE NOTICE '  - DST-safe: uses timezone-aware date comparison';
END $$;
