-- Create profiles table with location and interests
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  emoji_signature TEXT,
  interests TEXT[] DEFAULT '{}',
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  location_accuracy DOUBLE PRECISION,
  location_updated_at TIMESTAMP WITH TIME ZONE,
  availability_status TEXT DEFAULT 'offline' CHECK (availability_status IN ('online', 'busy', 'offline')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Create connections table to track meetings
CREATE TABLE public.connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  connected_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  last_met_at TIMESTAMP WITH TIME ZONE NOT NULL,
  meet_count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, connected_user_id)
);

ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own connections"
  ON public.connections FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own connections"
  ON public.connections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own connections"
  ON public.connections FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create meet_plans table
CREATE TABLE public.meet_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  match_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  venue_name TEXT NOT NULL,
  venue_address TEXT NOT NULL,
  venue_lat DOUBLE PRECISION NOT NULL,
  venue_lng DOUBLE PRECISION NOT NULL,
  start_at TIMESTAMP WITH TIME ZONE NOT NULL,
  meet_code TEXT NOT NULL,
  distance_m INTEGER NOT NULL,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'completed', 'cancelled')),
  shared_emoji_code TEXT,
  landmark TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.meet_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own plans"
  ON public.meet_plans FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own plans"
  ON public.meet_plans FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own plans"
  ON public.meet_plans FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to calculate distance between two points (Haversine formula)
CREATE OR REPLACE FUNCTION public.calculate_distance(
  lat1 DOUBLE PRECISION,
  lon1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION,
  lon2 DOUBLE PRECISION
)
RETURNS DOUBLE PRECISION
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  r DOUBLE PRECISION := 6371000; -- Earth's radius in meters
  phi1 DOUBLE PRECISION;
  phi2 DOUBLE PRECISION;
  delta_phi DOUBLE PRECISION;
  delta_lambda DOUBLE PRECISION;
  a DOUBLE PRECISION;
  c DOUBLE PRECISION;
BEGIN
  phi1 := radians(lat1);
  phi2 := radians(lat2);
  delta_phi := radians(lat2 - lat1);
  delta_lambda := radians(lon2 - lon1);
  
  a := sin(delta_phi / 2) * sin(delta_phi / 2) +
       cos(phi1) * cos(phi2) *
       sin(delta_lambda / 2) * sin(delta_lambda / 2);
  c := 2 * atan2(sqrt(a), sqrt(1 - a));
  
  RETURN r * c;
END;
$$;

-- Function to find nearby users within a radius
CREATE OR REPLACE FUNCTION public.find_nearby_users(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  radius_meters INTEGER DEFAULT 50,
  max_results INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  interests TEXT[],
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  distance_m DOUBLE PRECISION,
  emoji_signature TEXT,
  availability_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.interests,
    p.lat,
    p.lng,
    calculate_distance(user_lat, user_lng, p.lat, p.lng) as distance_m,
    p.emoji_signature,
    p.availability_status
  FROM public.profiles p
  WHERE 
    p.id != auth.uid()
    AND p.lat IS NOT NULL
    AND p.lng IS NOT NULL
    AND p.availability_status = 'online'
    AND calculate_distance(user_lat, user_lng, p.lat, p.lng) <= radius_meters
  ORDER BY distance_m ASC
  LIMIT max_results;
END;
$$;

-- Function to match users by interests
CREATE OR REPLACE FUNCTION public.calculate_interest_match_score(
  user_interests TEXT[],
  other_interests TEXT[]
)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  common_count INTEGER;
  total_count INTEGER;
BEGIN
  -- Count common interests
  SELECT COUNT(*) INTO common_count
  FROM unnest(user_interests) AS ui
  WHERE ui = ANY(other_interests);
  
  -- Total unique interests
  SELECT COUNT(DISTINCT interest) INTO total_count
  FROM (
    SELECT unnest(user_interests) AS interest
    UNION
    SELECT unnest(other_interests) AS interest
  ) AS combined;
  
  -- Return percentage score (0-100)
  IF total_count = 0 THEN
    RETURN 0;
  END IF;
  
  RETURN (common_count * 100 / total_count)::INTEGER;
END;
$$;

-- Function to find matched users (location + interests)
CREATE OR REPLACE FUNCTION public.find_matched_users(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  user_interests TEXT[],
  radius_meters INTEGER DEFAULT 50,
  min_interest_score INTEGER DEFAULT 20,
  max_results INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  interests TEXT[],
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  distance_m DOUBLE PRECISION,
  interest_score INTEGER,
  emoji_signature TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.interests,
    p.lat,
    p.lng,
    calculate_distance(user_lat, user_lng, p.lat, p.lng) as distance_m,
    calculate_interest_match_score(user_interests, p.interests) as interest_score,
    p.emoji_signature
  FROM public.profiles p
  WHERE 
    p.id != auth.uid()
    AND p.lat IS NOT NULL
    AND p.lng IS NOT NULL
    AND p.availability_status = 'online'
    AND calculate_distance(user_lat, user_lng, p.lat, p.lng) <= radius_meters
    AND calculate_interest_match_score(user_interests, p.interests) >= min_interest_score
  ORDER BY interest_score DESC, distance_m ASC
  LIMIT max_results;
END;
$$;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable realtime for location updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;