-- Migration 0002: Improved Sessionization with Place ID Preference
-- Updates sessionize_recent_visits() to prefer place_id, adapt radius, use median confidence

-- ============================================================
-- Part 1: Drop and recreate sessionize_recent_visits with improvements
-- ============================================================

CREATE OR REPLACE FUNCTION public.sessionize_recent_visits(
  target_user_id uuid,
  gap_threshold_minutes integer DEFAULT 10,
  lookback_hours integer DEFAULT 24
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  sessions_created INTEGER := 0;
  visit_row RECORD;
  current_session RECORD := NULL;
  time_gap_min INTEGER;
  place_distance_m DOUBLE PRECISION;
  same_place BOOLEAN;
  radius_threshold_m DOUBLE PRECISION;
  confidence_values DOUBLE PRECISION[];
  median_confidence DOUBLE PRECISION;
BEGIN
  -- Process visits in chronological order
  FOR visit_row IN
    SELECT 
      lv.*,
      -- Get place type for radius adaptation
      CASE 
        WHEN lv.place_type IN ('gym', 'fitness_center', 'park', 'shopping_mall') THEN 100.0
        WHEN lv.place_type IN ('cafe', 'restaurant', 'bar') THEN 50.0
        ELSE 75.0
      END as adaptive_radius
    FROM public.location_visits lv
    WHERE lv.user_id = target_user_id
      AND lv.visited_at >= NOW() - (lookback_hours || ' hours')::INTERVAL
      -- Exclude visits already in sessions
      AND NOT EXISTS (
        SELECT 1 FROM public.location_sessions s
        WHERE s.user_id = target_user_id
          AND s.start_ts <= lv.visited_at
          AND s.end_ts >= lv.visited_at
      )
    ORDER BY lv.visited_at ASC
  LOOP
    IF current_session IS NULL THEN
      -- Start new session
      current_session := visit_row;
      confidence_values := ARRAY[visit_row.confidence];
    ELSE
      -- Check if should extend current session or start new one
      time_gap_min := EXTRACT(EPOCH FROM (visit_row.visited_at - current_session.visited_at)) / 60;
      
      -- Determine if same place (prefer place_id if available)
      IF current_session.place_id IS NOT NULL AND visit_row.place_id IS NOT NULL THEN
        -- Both have place_id - simple comparison
        same_place := (current_session.place_id = visit_row.place_id);
        radius_threshold_m := visit_row.adaptive_radius;
      ELSE
        -- Fallback to distance calculation using PostGIS ST_DWithin equivalent
        -- Haversine formula for distance
        place_distance_m := 6371000 * ACOS(
          LEAST(1.0, 
            COS(RADIANS(current_session.lat)) * COS(RADIANS(visit_row.lat)) * 
            COS(RADIANS(visit_row.lng) - RADIANS(current_session.lng)) + 
            SIN(RADIANS(current_session.lat)) * SIN(RADIANS(visit_row.lat))
          )
        );
        radius_threshold_m := visit_row.adaptive_radius;
        same_place := (place_distance_m < radius_threshold_m);
      END IF;
      
      -- If same place and gap < threshold, extend session
      IF same_place AND time_gap_min <= gap_threshold_minutes THEN
        -- Update session end time
        current_session.visited_at := visit_row.visited_at;
        -- Collect confidence values for median calculation
        confidence_values := confidence_values || visit_row.confidence;
        -- Update place info if current visit has better data
        IF visit_row.place_id IS NOT NULL AND current_session.place_id IS NULL THEN
          current_session.place_id := visit_row.place_id;
          current_session.place_name := visit_row.place_name;
          current_session.place_type := visit_row.place_type;
        END IF;
      ELSE
        -- Save current session and start new one
        
        -- Calculate median confidence (simple approximation: sort and take middle)
        SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY val) INTO median_confidence
        FROM UNNEST(confidence_values) AS val;
        
        INSERT INTO public.location_sessions (
          user_id, place_id, place_name, place_type,
          lat, lng, geohash,
          start_ts, end_ts, dwell_min, confidence,
          user_timezone, time_of_day, day_type
        ) VALUES (
          current_session.user_id,
          current_session.place_id,
          current_session.place_name,
          current_session.place_type,
          current_session.lat,
          current_session.lng,
          current_session.geohash,
          -- Use first visit timestamp as start
          (SELECT MIN(visited_at) FROM public.location_visits 
           WHERE user_id = current_session.user_id 
           AND visited_at >= current_session.visited_at - (gap_threshold_minutes || ' minutes')::INTERVAL
           AND visited_at <= current_session.visited_at
           LIMIT 1),
          current_session.visited_at,
          EXTRACT(EPOCH FROM (current_session.visited_at - 
            (SELECT MIN(visited_at) FROM public.location_visits 
             WHERE user_id = current_session.user_id 
             AND visited_at >= current_session.visited_at - (gap_threshold_minutes || ' minutes')::INTERVAL
             AND visited_at <= current_session.visited_at
             LIMIT 1)
          )) / 60,
          median_confidence,
          current_session.user_timezone_at_event,
          current_session.time_of_day,
          current_session.day_type
        );
        
        sessions_created := sessions_created + 1;
        current_session := visit_row;
        confidence_values := ARRAY[visit_row.confidence];
      END IF;
    END IF;
  END LOOP;
  
  -- Save final session if exists
  IF current_session IS NOT NULL THEN
    SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY val) INTO median_confidence
    FROM UNNEST(confidence_values) AS val;
    
    INSERT INTO public.location_sessions (
      user_id, place_id, place_name, place_type,
      lat, lng, geohash,
      start_ts, end_ts, dwell_min, confidence,
      user_timezone, time_of_day, day_type
    ) VALUES (
      current_session.user_id,
      current_session.place_id,
      current_session.place_name,
      current_session.place_type,
      current_session.lat,
      current_session.lng,
      current_session.geohash,
      current_session.visited_at,
      current_session.visited_at,
      0,
      median_confidence,
      current_session.user_timezone_at_event,
      current_session.time_of_day,
      current_session.day_type
    );
    sessions_created := sessions_created + 1;
  END IF;
  
  RETURN sessions_created;
END;
$function$;

COMMENT ON FUNCTION public.sessionize_recent_visits IS 'Improved sessionization: prefers place_id, adapts radius by venue type, uses median confidence';

-- ============================================================
-- Part 2: Update trigger to fill window_start_min/end_min for sessions
-- ============================================================

CREATE OR REPLACE FUNCTION public.fill_session_time_windows()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
DECLARE
  local_ts TIMESTAMP;
  hour_val INTEGER;
BEGIN
  -- Extract hour from start_ts in user's timezone
  local_ts := NEW.start_ts AT TIME ZONE COALESCE(NEW.user_timezone, 'UTC');
  hour_val := EXTRACT(HOUR FROM local_ts)::INTEGER;
  
  -- Calculate 2-hour window bounds
  NEW.window_start_min := (hour_val / 2) * 2 * 60;
  NEW.window_end_min := ((hour_val / 2) * 2 + 2) * 60;
  
  RETURN NEW;
END;
$function$;

-- Create trigger if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trg_fill_session_time_windows'
  ) THEN
    CREATE TRIGGER trg_fill_session_time_windows
      BEFORE INSERT OR UPDATE ON public.location_sessions
      FOR EACH ROW
      EXECUTE FUNCTION public.fill_session_time_windows();
  END IF;
END $$;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✓ C3 Migration Complete: Sessionizer improved';
  RAISE NOTICE '  - Place ID matching takes priority';
  RAISE NOTICE '  - Adaptive radius by venue type (gyms 100m, cafes 50m)';
  RAISE NOTICE '  - Median confidence instead of min';
  RAISE NOTICE '  - Numeric time windows auto-filled on insert';
END $$;
