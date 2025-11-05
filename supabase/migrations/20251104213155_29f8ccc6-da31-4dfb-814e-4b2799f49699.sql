-- Add new columns to location_visits table for Google Places API (New) data
ALTER TABLE public.location_visits
ADD COLUMN IF NOT EXISTS place_id text,
ADD COLUMN IF NOT EXISTS types text[],
ADD COLUMN IF NOT EXISTS day_of_week text,
ADD COLUMN IF NOT EXISTS time_window text,
ADD COLUMN IF NOT EXISTS time_label text;

-- Create index on place_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_location_visits_place_id ON public.location_visits(place_id);

-- Create index on place_type for pattern analysis
CREATE INDEX IF NOT EXISTS idx_location_visits_place_type ON public.location_visits(place_type);

-- Create index on user_id and day_of_week for behavioral patterns
CREATE INDEX IF NOT EXISTS idx_location_visits_user_day ON public.location_visits(user_id, day_of_week);

-- Create index on user_id and time_label for time pattern analysis
CREATE INDEX IF NOT EXISTS idx_location_visits_user_time ON public.location_visits(user_id, time_label);