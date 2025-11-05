-- Migration 0003: Derive Activity Patterns from Sessions
-- Creates function to update patterns from sessions instead of raw pings

-- ============================================================
-- Part 1: Function to update patterns from sessions
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_activity_patterns_from_sessions(
  target_user_id uuid DEFAULT NULL,
  lookback_days integer DEFAULT 90
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  patterns_updated INTEGER := 0;
  target_uid uuid;
BEGIN
  -- If no user specified, process all users with recent sessions
  IF target_user_id IS NULL THEN
    FOR target_uid IN
      SELECT DISTINCT user_id 
      FROM public.location_sessions
      WHERE start_ts >= CURRENT_DATE - (lookback_days || ' days')::INTERVAL
    LOOP
      PERFORM public.update_activity_patterns_from_sessions(target_uid, lookback_days);
      patterns_updated := patterns_updated + 1;
    END LOOP;
    RETURN patterns_updated;
  END IF;

  -- Delete old patterns for this user (will regenerate from sessions)
  DELETE FROM public.activity_patterns
  WHERE user_id = target_user_id;

  -- Insert patterns aggregated from sessions
  INSERT INTO public.activity_patterns (
    user_id,
    place_type,
    time_of_day,
    day_type,
    visit_count,
    last_visit_at,
    frequency_score
  )
  SELECT
    user_id,
    place_type,
    time_of_day,
    day_type,
    COUNT(*) as visit_count,
    MAX(start_ts) as last_visit_at,
    0.0 as frequency_score  -- Will be recalculated
  FROM public.location_sessions
  WHERE user_id = target_user_id
    AND start_ts >= CURRENT_DATE - (lookback_days || ' days')::INTERVAL
  GROUP BY user_id, place_type, time_of_day, day_type;

  -- Recalculate frequency scores
  PERFORM public.recalculate_frequency_scores(target_user_id);

  GET DIAGNOSTICS patterns_updated = ROW_COUNT;
  RETURN patterns_updated;
END;
$function$;

COMMENT ON FUNCTION public.update_activity_patterns_from_sessions IS 'Regenerate activity_patterns from location_sessions (true visit counts)';

-- ============================================================
-- Part 2: Modify trigger to only update on first ping per session window
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_activity_patterns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  recent_ping_count INTEGER;
BEGIN
  -- Only count this ping if it's the first in this session window
  -- Check if there's another ping in the same place within gap threshold
  SELECT COUNT(*) INTO recent_ping_count
  FROM public.location_visits
  WHERE user_id = NEW.user_id
    AND place_type = NEW.place_type
    AND visited_at BETWEEN (NEW.visited_at - INTERVAL '10 minutes') AND NEW.visited_at
    AND id != NEW.id;

  -- If there are recent pings, this is NOT the start of a new session - skip
  IF recent_ping_count > 0 THEN
    RETURN NEW;
  END IF;

  -- This is the first ping in a session window - update pattern
  INSERT INTO public.activity_patterns (
    user_id, 
    place_type, 
    time_of_day, 
    day_type, 
    visit_count, 
    last_visit_at
  )
  VALUES (
    NEW.user_id,
    NEW.place_type,
    NEW.time_of_day,
    NEW.day_type,
    1,
    NEW.visited_at
  )
  ON CONFLICT (user_id, place_type, time_of_day, day_type)
  DO UPDATE SET
    visit_count = activity_patterns.visit_count + 1,
    last_visit_at = NEW.visited_at,
    updated_at = now();
  
  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.update_activity_patterns IS 'Updated to only count first ping per session window (prevents overcounting)';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✓ C4 Migration Complete: Patterns from sessions';
  RAISE NOTICE '  - Created update_activity_patterns_from_sessions()';
  RAISE NOTICE '  - Modified trigger to gate on session boundaries';
  RAISE NOTICE '  - Run: SELECT update_activity_patterns_from_sessions() to backfill';
END $$;
