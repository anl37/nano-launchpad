-- Migration 0001: Time Window Canonicalization
-- Adds numeric time windows and ensures canonical time_of_day values

-- ============================================================
-- Part 1: Add numeric time window columns to activity_summaries
-- ============================================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'activity_summaries' 
    AND column_name = 'window_start_min'
  ) THEN
    ALTER TABLE public.activity_summaries 
    ADD COLUMN window_start_min INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'activity_summaries' 
    AND column_name = 'window_end_min'
  ) THEN
    ALTER TABLE public.activity_summaries 
    ADD COLUMN window_end_min INTEGER;
  END IF;
END $$;

COMMENT ON COLUMN public.activity_summaries.window_start_min IS 'Start of time window in minutes since midnight (0-1439)';
COMMENT ON COLUMN public.activity_summaries.window_end_min IS 'End of time window in minutes since midnight (0-1439)';

-- ============================================================
-- Part 2: Helper function to parse time_window string to numeric
-- ============================================================

CREATE OR REPLACE FUNCTION public.parse_time_window(window_str TEXT)
RETURNS TABLE(start_min INTEGER, end_min INTEGER)
LANGUAGE plpgsql
IMMUTABLE
AS $function$
DECLARE
  parts TEXT[];
  start_parts TEXT[];
  end_parts TEXT[];
  start_hour INTEGER;
  end_hour INTEGER;
BEGIN
  -- Parse "08:00–10:00" format
  parts := string_to_array(window_str, '–');
  IF array_length(parts, 1) != 2 THEN
    -- Invalid format, return NULL
    RETURN;
  END IF;
  
  start_parts := string_to_array(parts[1], ':');
  end_parts := string_to_array(parts[2], ':');
  
  start_hour := start_parts[1]::INTEGER;
  end_hour := end_parts[1]::INTEGER;
  
  start_min := start_hour * 60;
  end_min := end_hour * 60;
  
  RETURN NEXT;
END;
$function$;

-- ============================================================
-- Part 3: Add same columns to location_sessions
-- ============================================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'location_sessions' 
    AND column_name = 'window_start_min'
  ) THEN
    ALTER TABLE public.location_sessions 
    ADD COLUMN window_start_min INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'location_sessions' 
    AND column_name = 'window_end_min'
  ) THEN
    ALTER TABLE public.location_sessions 
    ADD COLUMN window_end_min INTEGER;
  END IF;
END $$;

-- ============================================================
-- Part 4: Create pretty view for display
-- ============================================================

CREATE OR REPLACE VIEW public.vw_activity_summaries_pretty AS
SELECT 
  id,
  user_id,
  summary_date,
  place_type,
  time_window as time_window_label,
  window_start_min,
  window_end_min,
  time_of_day,
  day_type,
  visit_count,
  total_dwell_min,
  avg_dwell_min,
  frequency_share,
  recency_score,
  last_visit_at,
  created_at,
  updated_at,
  -- Human-readable time
  LPAD((window_start_min / 60)::TEXT, 2, '0') || ':' || 
    LPAD((window_start_min % 60)::TEXT, 2, '0') as start_time,
  LPAD((window_end_min / 60)::TEXT, 2, '0') || ':' || 
    LPAD((window_end_min % 60)::TEXT, 2, '0') as end_time
FROM public.activity_summaries
WHERE window_start_min IS NOT NULL;