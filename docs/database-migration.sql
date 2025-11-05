-- Migration: Add proximity matching infrastructure
-- Date: 2025-10-26
-- Purpose: Support geohash-based location matching with 10-15m radius
-- INSTRUCTIONS: Run this in your Supabase SQL Editor

-- ============================================
-- 1. Update profiles table for matching
-- ============================================

-- Add geohash for spatial indexing
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS geohash TEXT;

-- Add visibility flag (discovery control, NOT collection control)
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT TRUE;

-- Add onboarded flag
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS onboarded BOOLEAN DEFAULT FALSE;

-- Create spatial index
CREATE INDEX IF NOT EXISTS idx_profiles_geohash 
  ON public.profiles(geohash) 
  WHERE is_visible = TRUE AND onboarded = TRUE;

-- Index for recent location updates
CREATE INDEX IF NOT EXISTS idx_profiles_location_updated 
  ON public.profiles(location_updated_at DESC NULLS LAST);

-- Ensure interests is indexed
CREATE INDEX IF NOT EXISTS idx_profiles_interests 
  ON public.profiles USING GIN(interests);

-- ============================================
-- 2. Create simplified presence table
-- ============================================

-- Single row per user, fast updates
CREATE TABLE IF NOT EXISTS public.presence (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  geohash TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.presence ENABLE ROW LEVEL SECURITY;

-- RLS Policies: read all, write self only
CREATE POLICY "presence_select_all" 
  ON public.presence FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "presence_insert_self" 
  ON public.presence FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "presence_update_self" 
  ON public.presence FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = user_id);

CREATE POLICY "presence_delete_self" 
  ON public.presence FOR DELETE 
  TO authenticated 
  USING (auth.uid() = user_id);

-- Spatial index on geohash
CREATE INDEX IF NOT EXISTS idx_presence_geohash 
  ON public.presence(geohash);

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_presence_updated_at 
  ON public.presence(updated_at);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.presence;

-- ============================================
-- 3. Create matches table
-- ============================================

CREATE TABLE IF NOT EXISTS public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pair_id TEXT UNIQUE NOT NULL,
  uid_a UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  uid_b UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_interests TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_together_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'suggested' CHECK (status IN ('suggested', 'connected', 'dismissed')),
  -- Ensure no duplicate pairs
  CONSTRAINT unique_pair CHECK (uid_a < uid_b)
);

-- Enable RLS
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- RLS Policies: users can read/write their own matches
CREATE POLICY "matches_select_member" 
  ON public.matches FOR SELECT 
  TO authenticated 
  USING (auth.uid() = uid_a OR auth.uid() = uid_b);

CREATE POLICY "matches_insert_member" 
  ON public.matches FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = uid_a OR auth.uid() = uid_b);

CREATE POLICY "matches_update_member" 
  ON public.matches FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = uid_a OR auth.uid() = uid_b);

CREATE POLICY "matches_delete_member" 
  ON public.matches FOR DELETE 
  TO authenticated 
  USING (auth.uid() = uid_a OR auth.uid() = uid_b);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_matches_uid_a ON public.matches(uid_a);
CREATE INDEX IF NOT EXISTS idx_matches_uid_b ON public.matches(uid_b);
CREATE INDEX IF NOT EXISTS idx_matches_status ON public.matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_last_seen ON public.matches(last_seen_together_at DESC);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;

-- ============================================
-- 4. Helper function: generate pair_id
-- ============================================

CREATE OR REPLACE FUNCTION public.generate_pair_id(user_a UUID, user_b UUID)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Sort UUIDs to ensure consistent pair_id regardless of order
  IF user_a < user_b THEN
    RETURN user_a::TEXT || '_' || user_b::TEXT;
  ELSE
    RETURN user_b::TEXT || '_' || user_a::TEXT;
  END IF;
END;
$$;

-- ============================================
-- 5. Cleanup stale presence (optional cron)
-- ============================================

-- Function to delete presence older than 1 hour
CREATE OR REPLACE FUNCTION public.cleanup_stale_presence()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.presence
  WHERE updated_at < NOW() - INTERVAL '1 hour';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- ============================================
-- 6. Grant permissions
-- ============================================

GRANT EXECUTE ON FUNCTION public.generate_pair_id TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_stale_presence TO authenticated;
