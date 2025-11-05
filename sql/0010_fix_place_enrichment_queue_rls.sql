-- Fix RLS policies for place_enrichment_queue to allow trigger-based inserts
-- The trigger function runs as SECURITY DEFINER but still needs proper RLS policies

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own enrichment queue" ON public.place_enrichment_queue;
DROP POLICY IF EXISTS "Service can manage enrichment queue" ON public.place_enrichment_queue;

-- Allow authenticated users to insert their own enrichment queue entries
-- This is needed because the trigger function inserts when a location_visit is created
CREATE POLICY "Users can insert their own enrichment queue entries"
  ON public.place_enrichment_queue
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Allow authenticated users to view their own enrichment queue entries
CREATE POLICY "Users can view their own enrichment queue entries"
  ON public.place_enrichment_queue
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Allow service role to manage all enrichment queue entries
CREATE POLICY "Service can manage all enrichment queue entries"
  ON public.place_enrichment_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grant necessary permissions
GRANT INSERT, SELECT ON public.place_enrichment_queue TO authenticated;
GRANT ALL ON public.place_enrichment_queue TO service_role;
