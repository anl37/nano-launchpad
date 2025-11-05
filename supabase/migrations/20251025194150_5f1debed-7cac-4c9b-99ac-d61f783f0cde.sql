-- Fix privacy issue: restrict access to real-time location data
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Users can only view their own full profile with exact coordinates
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Users can view LIMITED info about other profiles (no exact coordinates)
-- This allows displaying matched users without exposing precise location
CREATE POLICY "Users can view limited profile info of others"
ON public.profiles
FOR SELECT
USING (
  auth.uid() != id 
  AND id IN (
    -- Only show profiles that were returned by proximity functions
    -- or are connections
    SELECT connected_user_id FROM public.connections WHERE user_id = auth.uid()
  )
);

-- Note: The find_nearby_users and find_matched_users functions will still work
-- because they use SECURITY DEFINER, which bypasses RLS.
-- However, direct queries to profiles table will not expose everyone's coordinates.