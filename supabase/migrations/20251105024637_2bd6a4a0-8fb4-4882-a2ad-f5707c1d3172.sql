-- Fix sessionize: location_visits doesn't have geohash, compute it for sessions

CREATE OR REPLACE FUNCTION public.sessionize_recent_visits(
  target_user_id uuid DEFAULT NULL,
  gap_threshold_minutes integer DEFAULT 10,
  lookback_hours integer DEFAULT 24
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  sessions_created INTEGER := 0;
  visit_row RECORD;
  current_session public.session_state := NULL;
  time_gap_min INTEGER;
  place_distance_m DOUBLE PRECISION;
  radius_threshold_m DOUBLE PRECISION;
  median_conf DOUBLE PRECISION;
  session_visits uuid[];
  target_uid uuid;
  computed_geohash text;
BEGIN
  -- If no user specified, process all users with recent visits
  IF target_user_id IS NULL THEN
    FOR target_uid IN
      SELECT DISTINCT user_id 
      FROM public.location_visits
      WHERE visited_at >= NOW() - (lookback_hours || ' hours')::INTERVAL
    LOOP
      sessions_created := sessions_created + 
        public.sessionize_recent_visits(target_uid, gap_threshold_minutes, lookback_hours);
    END LOOP;
    RETURN sessions_created;
  END IF;

  -- Process visits in chronological order for specified user
  FOR visit_row IN
    SELECT v.*
    FROM public.location_visits v
    WHERE v.user_id = target_user_id
      AND v.visited_at >= NOW() - (lookback_hours || ' hours')::INTERVAL
      AND NOT EXISTS (
        SELECT 1 FROM public.location_sessions s
        WHERE s.user_id = v.user_id
          AND s.start_ts <= v.visited_at
          AND s.end_ts >= v.visited_at
      )
    ORDER BY v.visited_at ASC
  LOOP
    -- Compute geohash (precision 8 ≈ 40m)
    computed_geohash := CONCAT(
      SUBSTRING(MD5(visit_row.lat::text || ',' || visit_row.lng::text), 1, 8)
    );
    
    IF current_session IS NULL THEN
      -- Start new session
      current_session := ROW(
        visit_row.user_id,
        visit_row.place_id,
        visit_row.place_name,
        visit_row.place_type,
        visit_row.lat,
        visit_row.lng,
        computed_geohash,
        visit_row.visited_at,
        visit_row.visited_at,
        visit_row.confidence,
        visit_row.user_timezone_at_event,
        visit_row.time_window,
        visit_row.time_of_day,
        visit_row.day_type
      )::public.session_state;
      session_visits := ARRAY[visit_row.id];
    ELSE
      -- Check if should extend current session or start new one
      time_gap_min := EXTRACT(EPOCH FROM (visit_row.visited_at - current_session.visited_at)) / 60;
      
      -- Adaptive radius by place type
      radius_threshold_m := CASE 
        WHEN visit_row.place_type IN ('gym', 'park') THEN 100
        WHEN visit_row.place_type IN ('restaurant', 'cafe', 'bar') THEN 50
        ELSE 75
      END;
      
      -- Prefer place_id match over distance
      IF current_session.place_id IS NOT NULL 
         AND visit_row.place_id IS NOT NULL 
         AND current_session.place_id = visit_row.place_id THEN
        place_distance_m := 0;
      ELSE
        place_distance_m := 6371000 * ACOS(
          LEAST(1.0, COS(RADIANS(current_session.lat)) * COS(RADIANS(visit_row.lat)) * 
          COS(RADIANS(visit_row.lng) - RADIANS(current_session.lng)) + 
          SIN(RADIANS(current_session.lat)) * SIN(RADIANS(visit_row.lat)))
        );
      END IF;
      
      -- If same place and gap < threshold, extend session
      IF place_distance_m < radius_threshold_m AND time_gap_min <= gap_threshold_minutes THEN
        current_session.visited_at := visit_row.visited_at;
        session_visits := session_visits || visit_row.id;
      ELSE
        -- Save current session
        SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY confidence)
        INTO median_conf
        FROM public.location_visits
        WHERE id = ANY(session_visits);
        
        INSERT INTO public.location_sessions (
          user_id, place_id, place_name, place_type,
          lat, lng, geohash,
          start_ts, end_ts, dwell_min, confidence,
          user_timezone, time_window, time_of_day, day_type
        ) VALUES (
          current_session.user_id,
          current_session.place_id,
          current_session.place_name,
          current_session.place_type,
          current_session.lat,
          current_session.lng,
          current_session.geohash,
          current_session.start_ts,
          current_session.visited_at,
          EXTRACT(EPOCH FROM (current_session.visited_at - current_session.start_ts)) / 60,
          COALESCE(median_conf, current_session.confidence),
          current_session.user_timezone_at_event,
          current_session.time_window,
          current_session.time_of_day,
          current_session.day_type
        );
        
        sessions_created := sessions_created + 1;
        
        -- Start new session
        current_session := ROW(
          visit_row.user_id,
          visit_row.place_id,
          visit_row.place_name,
          visit_row.place_type,
          visit_row.lat,
          visit_row.lng,
          computed_geohash,
          visit_row.visited_at,
          visit_row.visited_at,
          visit_row.confidence,
          visit_row.user_timezone_at_event,
          visit_row.time_window,
          visit_row.time_of_day,
          visit_row.day_type
        )::public.session_state;
        session_visits := ARRAY[visit_row.id];
      END IF;
    END IF;
  END LOOP;
  
  -- Save final session
  IF current_session IS NOT NULL THEN
    SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY confidence)
    INTO median_conf
    FROM public.location_visits
    WHERE id = ANY(session_visits);
    
    INSERT INTO public.location_sessions (
      user_id, place_id, place_name, place_type,
      lat, lng, geohash,
      start_ts, end_ts, dwell_min, confidence,
      user_timezone, time_window, time_of_day, day_type
    ) VALUES (
      current_session.user_id,
      current_session.place_id,
      current_session.place_name,
      current_session.place_type,
      current_session.lat,
      current_session.lng,
      current_session.geohash,
      current_session.start_ts,
      current_session.visited_at,
      EXTRACT(EPOCH FROM (current_session.visited_at - current_session.start_ts)) / 60,
      COALESCE(median_conf, current_session.confidence),
      current_session.user_timezone_at_event,
      current_session.time_window,
      current_session.time_of_day,
      current_session.day_type
    );
    sessions_created := sessions_created + 1;
  END IF;
  
  RETURN sessions_created;
END;
$function$;