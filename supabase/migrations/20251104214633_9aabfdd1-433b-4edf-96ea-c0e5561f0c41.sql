-- Make timestamp_utc nullable temporarily for smooth transition
ALTER TABLE public.location_visits 
ALTER COLUMN timestamp_utc DROP NOT NULL;

-- Add a default value to help with the transition
ALTER TABLE public.location_visits 
ALTER COLUMN timestamp_utc SET DEFAULT now();

-- Update the trigger to handle cases where timestamp_utc might be null
CREATE OR REPLACE FUNCTION public.fill_location_time_fields()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE 
  local_ts TIMESTAMP;
  effective_tz TEXT;
BEGIN
  -- If timestamp_utc is null, use visited_at or current time
  IF NEW.timestamp_utc IS NULL THEN
    NEW.timestamp_utc := COALESCE(NEW.visited_at, now());
  END IF;
  
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