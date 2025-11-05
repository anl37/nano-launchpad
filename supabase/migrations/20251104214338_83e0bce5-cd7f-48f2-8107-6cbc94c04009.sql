-- Add timezone and UTC timestamp fields to location_visits
ALTER TABLE public.location_visits 
ADD COLUMN IF NOT EXISTS timestamp_utc TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS user_timezone_at_event TEXT;

-- Backfill timestamp_utc from visited_at (assuming visited_at was stored as UTC)
UPDATE public.location_visits 
SET timestamp_utc = visited_at 
WHERE timestamp_utc IS NULL;

-- Make timestamp_utc NOT NULL after backfill
ALTER TABLE public.location_visits 
ALTER COLUMN timestamp_utc SET NOT NULL;

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_location_visits_userid_ts 
ON public.location_visits(user_id, timestamp_utc);

CREATE INDEX IF NOT EXISTS idx_location_visits_place_type_timewindow 
ON public.location_visits(place_type, time_window);

-- Helper function: compute 2-hour bucket from local timestamp
CREATE OR REPLACE FUNCTION public.two_hour_bucket(local_ts TIMESTAMP)
RETURNS TEXT LANGUAGE SQL IMMUTABLE AS $$
  WITH h AS (SELECT EXTRACT(HOUR FROM local_ts)::INT AS hour)
  SELECT LPAD((hour/2*2)::TEXT, 2, '0') || ':00–' ||
         LPAD(((hour/2*2 + 2) % 24)::TEXT, 2, '0') || ':00'
  FROM h;
$$;

-- Helper function: compute time of day label from local timestamp
CREATE OR REPLACE FUNCTION public.time_of_day_label(local_ts TIMESTAMP)
RETURNS TEXT LANGUAGE SQL IMMUTABLE AS $$
  SELECT CASE
    WHEN EXTRACT(HOUR FROM local_ts) BETWEEN 5 AND 11 THEN 'Morning'
    WHEN EXTRACT(HOUR FROM local_ts) BETWEEN 12 AND 16 THEN 'Afternoon'
    WHEN EXTRACT(HOUR FROM local_ts) BETWEEN 17 AND 21 THEN 'Evening'
    ELSE 'Late Night'
  END;
$$;

-- Helper function: compute time_of_day category (for backward compatibility)
CREATE OR REPLACE FUNCTION public.time_of_day_category(local_ts TIMESTAMP)
RETURNS TEXT LANGUAGE SQL IMMUTABLE AS $$
  SELECT CASE
    WHEN EXTRACT(HOUR FROM local_ts) BETWEEN 5 AND 11 THEN 'morning'
    WHEN EXTRACT(HOUR FROM local_ts) BETWEEN 12 AND 16 THEN 'afternoon'
    WHEN EXTRACT(HOUR FROM local_ts) BETWEEN 17 AND 20 THEN 'evening'
    ELSE 'night'
  END;
$$;

-- Helper function: compute day type (weekday/weekend)
CREATE OR REPLACE FUNCTION public.day_type_category(local_ts TIMESTAMP)
RETURNS TEXT LANGUAGE SQL IMMUTABLE AS $$
  SELECT CASE
    WHEN EXTRACT(DOW FROM local_ts) IN (0, 6) THEN 'weekend'
    ELSE 'weekday'
  END;
$$;

-- Trigger function: auto-fill time fields based on timezone
CREATE OR REPLACE FUNCTION public.fill_location_time_fields()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE 
  local_ts TIMESTAMP;
  effective_tz TEXT;
BEGIN
  -- Use provided timezone or fallback to UTC
  effective_tz := COALESCE(NEW.user_timezone_at_event, 'UTC');
  
  -- Convert UTC timestamp to local timestamp in user's timezone
  local_ts := (NEW.timestamp_utc AT TIME ZONE effective_tz);
  
  -- Fill derived fields
  NEW.day_of_week := TRIM(TO_CHAR(local_ts, 'Day'));
  NEW.time_window := public.two_hour_bucket(local_ts);
  NEW.time_label := public.time_of_day_label(local_ts);
  NEW.time_of_day := public.time_of_day_category(local_ts);
  NEW.day_type := public.day_type_category(local_ts);
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-fill time fields on insert
DROP TRIGGER IF EXISTS trg_fill_location_time_fields ON public.location_visits;
CREATE TRIGGER trg_fill_location_time_fields
BEFORE INSERT ON public.location_visits
FOR EACH ROW 
EXECUTE FUNCTION public.fill_location_time_fields();

-- Backfill existing records with best-effort timezone (assume UTC for now)
-- This can be re-run with better timezone data later
UPDATE public.location_visits
SET user_timezone_at_event = 'UTC'
WHERE user_timezone_at_event IS NULL;

-- Re-trigger the time field calculation for existing records
UPDATE public.location_visits
SET timestamp_utc = timestamp_utc
WHERE user_timezone_at_event IS NOT NULL;