-- Create table for tracking user presence at locations
CREATE TABLE IF NOT EXISTS public.user_presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  location_id TEXT NOT NULL,
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,
  status TEXT NOT NULL DEFAULT 'live' CHECK (status IN ('live', 'paused')),
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, location_id)
);

-- Enable RLS
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

-- Policies: Users can manage their own presence
CREATE POLICY "Users can view all presence"
  ON public.user_presence
  FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own presence"
  ON public.user_presence
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own presence"
  ON public.user_presence
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own presence"
  ON public.user_presence
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;

-- Create index for faster queries
CREATE INDEX idx_user_presence_location ON public.user_presence(location_id, status);
CREATE INDEX idx_user_presence_updated ON public.user_presence(last_updated);