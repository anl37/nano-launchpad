-- ========================================
-- 1. PLACE CACHE TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.place_cache (
  place_id TEXT PRIMARY KEY,
  place_name TEXT,
  place_type TEXT NOT NULL DEFAULT 'general',
  types TEXT[] DEFAULT '{}',
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  use_count INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX idx_place_cache_last_used ON public.place_cache(last_used_at);

-- ========================================
-- 2. LOCATION SESSIONS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.location_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  place_id TEXT,
  place_name TEXT,
  place_type TEXT NOT NULL DEFAULT 'general',
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  geohash TEXT NOT NULL,
  start_ts TIMESTAMPTZ NOT NULL,
  end_ts TIMESTAMPTZ NOT NULL,
  dwell_min INTEGER NOT NULL DEFAULT 0,
  confidence DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  user_timezone TEXT NOT NULL DEFAULT 'UTC',
  day_of_week TEXT,
  time_window TEXT,
  time_label TEXT,
  time_of_day TEXT,
  day_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_location_sessions_user_start ON public.location_sessions(user_id, start_ts DESC);
CREATE INDEX idx_location_sessions_place_time ON public.location_sessions(place_type, time_window);
CREATE INDEX idx_location_sessions_user_place ON public.location_sessions(user_id, place_id);

-- Enable RLS
ALTER TABLE public.location_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sessions"
  ON public.location_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions"
  ON public.location_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Trigger to fill time fields for sessions
CREATE TRIGGER trg_fill_session_time_fields
BEFORE INSERT ON public.location_sessions
FOR EACH ROW EXECUTE FUNCTION public.fill_location_time_fields();

-- ========================================
-- 3. ACTIVITY SUMMARIES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.activity_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  summary_date DATE NOT NULL,
  place_type TEXT NOT NULL,
  time_window TEXT NOT NULL,
  time_of_day TEXT NOT NULL,
  day_type TEXT NOT NULL,
  visit_count INTEGER NOT NULL DEFAULT 0,
  total_dwell_min INTEGER NOT NULL DEFAULT 0,
  avg_dwell_min DOUBLE PRECISION NOT NULL DEFAULT 0,
  frequency_share DOUBLE PRECISION NOT NULL DEFAULT 0,
  recency_score DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  last_visit_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, summary_date, place_type, time_window)
);

CREATE INDEX idx_activity_summaries_user_date ON public.activity_summaries(user_id, summary_date DESC);
CREATE INDEX idx_activity_summaries_user_place_time ON public.activity_summaries(user_id, place_type, time_window);

-- Enable RLS
ALTER TABLE public.activity_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own summaries"
  ON public.activity_summaries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own summaries"
  ON public.activity_summaries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own summaries"
  ON public.activity_summaries FOR UPDATE
  USING (auth.uid() = user_id);

-- ========================================
-- 4. ADD CONFIDENCE TO LOCATION VISITS
-- ========================================
ALTER TABLE public.location_visits 
ADD COLUMN IF NOT EXISTS confidence DOUBLE PRECISION DEFAULT 1.0;

-- ========================================
-- 5. ADD MATCH EXPLANATION TO MATCHES
-- ========================================
ALTER TABLE public.matches
ADD COLUMN IF NOT EXISTS match_explanation TEXT;

-- ========================================
-- 6. FUNCTION: COMPUTE ACTIVITY SUMMARIES
-- ========================================
CREATE OR REPLACE FUNCTION public.compute_activity_summary(
  target_user_id UUID,
  target_date DATE DEFAULT CURRENT_DATE
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  total_visits INTEGER;
  decay_days INTEGER;
  recency DOUBLE PRECISION;
BEGIN
  -- Calculate total visits for frequency share
  SELECT COUNT(*) INTO total_visits
  FROM public.location_sessions
  WHERE user_id = target_user_id
    AND start_ts::DATE = target_date;

  -- Compute time decay (half-life 30 days)
  decay_days := EXTRACT(DAY FROM CURRENT_DATE - target_date)::INTEGER;
  recency := POWER(0.5, decay_days / 30.0);

  -- Upsert summaries
  INSERT INTO public.activity_summaries (
    user_id,
    summary_date,
    place_type,
    time_window,
    time_of_day,
    day_type,
    visit_count,
    total_dwell_min,
    avg_dwell_min,
    frequency_share,
    recency_score,
    last_visit_at
  )
  SELECT
    user_id,
    start_ts::DATE,
    place_type,
    time_window,
    time_of_day,
    day_type,
    COUNT(*),
    SUM(dwell_min),
    AVG(dwell_min),
    COUNT(*)::DOUBLE PRECISION / NULLIF(total_visits, 0),
    recency,
    MAX(start_ts)
  FROM public.location_sessions
  WHERE user_id = target_user_id
    AND start_ts::DATE = target_date
  GROUP BY user_id, start_ts::DATE, place_type, time_window, time_of_day, day_type
  ON CONFLICT (user_id, summary_date, place_type, time_window)
  DO UPDATE SET
    visit_count = EXCLUDED.visit_count,
    total_dwell_min = EXCLUDED.total_dwell_min,
    avg_dwell_min = EXCLUDED.avg_dwell_min,
    frequency_share = EXCLUDED.frequency_share,
    recency_score = EXCLUDED.recency_score,
    last_visit_at = EXCLUDED.last_visit_at,
    updated_at = now();
END;
$$;

-- ========================================
-- 7. FUNCTION: SESSIONIZE PINGS
-- ========================================
CREATE OR REPLACE FUNCTION public.sessionize_recent_visits(
  target_user_id UUID,
  gap_threshold_minutes INTEGER DEFAULT 10
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  sessions_created INTEGER := 0;
  visit_row RECORD;
  current_session RECORD := NULL;
  time_gap_min INTEGER;
  place_distance_m DOUBLE PRECISION;
BEGIN
  -- Process visits in chronological order
  FOR visit_row IN
    SELECT *
    FROM public.location_visits
    WHERE user_id = target_user_id
      AND visited_at >= NOW() - INTERVAL '24 hours'
      AND NOT EXISTS (
        SELECT 1 FROM public.location_sessions s
        WHERE s.user_id = target_user_id
          AND s.start_ts <= visit_row.visited_at
          AND s.end_ts >= visit_row.visited_at
      )
    ORDER BY visited_at ASC
  LOOP
    IF current_session IS NULL THEN
      -- Start new session
      current_session := visit_row;
    ELSE
      -- Check if should extend current session or start new one
      time_gap_min := EXTRACT(EPOCH FROM (visit_row.visited_at - current_session.visited_at)) / 60;
      
      -- Calculate distance using Haversine formula (simplified)
      place_distance_m := 6371000 * ACOS(
        LEAST(1.0, COS(RADIANS(current_session.lat)) * COS(RADIANS(visit_row.lat)) * 
        COS(RADIANS(visit_row.lng) - RADIANS(current_session.lng)) + 
        SIN(RADIANS(current_session.lat)) * SIN(RADIANS(visit_row.lat)))
      );
      
      -- If same place (within 50m) and gap < threshold, extend session
      IF place_distance_m < 50 AND time_gap_min <= gap_threshold_minutes THEN
        current_session.visited_at := visit_row.visited_at;
        current_session.confidence := LEAST(current_session.confidence, visit_row.confidence);
      ELSE
        -- Save current session and start new one
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
          EXTRACT(EPOCH FROM (current_session.visited_at - current_session.visited_at)) / 60,
          current_session.confidence,
          current_session.user_timezone_at_event,
          current_session.time_of_day,
          current_session.day_type
        );
        
        sessions_created := sessions_created + 1;
        current_session := visit_row;
      END IF;
    END IF;
  END LOOP;
  
  -- Save final session
  IF current_session IS NOT NULL THEN
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
      current_session.confidence,
      current_session.user_timezone_at_event,
      current_session.time_of_day,
      current_session.day_type
    );
    sessions_created := sessions_created + 1;
  END IF;
  
  RETURN sessions_created;
END;
$$;