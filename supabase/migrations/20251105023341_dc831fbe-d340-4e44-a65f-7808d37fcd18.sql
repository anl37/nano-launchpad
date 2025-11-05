-- Migration 0006: Place Enrichment Resilience
-- Allow sessionization even when place_id is unknown

-- ============================================================
-- Part 1: Create place enrichment retry queue
-- ============================================================

CREATE TABLE IF NOT EXISTS public.place_enrichment_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  user_id uuid,
  visit_id uuid REFERENCES public.location_visits(id) ON DELETE SET NULL,
  session_id uuid REFERENCES public.location_sessions(id) ON DELETE SET NULL,
  retry_count integer DEFAULT 0,
  last_attempt_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_place_enrichment_queue_status 
  ON public.place_enrichment_queue(status, created_at);

COMMENT ON TABLE public.place_enrichment_queue IS 'Queue for retrying failed place enrichment lookups';

-- ============================================================
-- Part 2: RLS policies for queue
-- ============================================================

ALTER TABLE public.place_enrichment_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own enrichment queue"
  ON public.place_enrichment_queue
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service can manage enrichment queue"
  ON public.place_enrichment_queue
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- Part 3: Trigger to auto-queue failed enrichments
-- ============================================================

CREATE OR REPLACE FUNCTION public.queue_place_enrichment()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
  -- If visit has no place_id, queue for enrichment
  IF NEW.place_id IS NULL THEN
    INSERT INTO public.place_enrichment_queue (
      lat, lng, user_id, visit_id, status
    ) VALUES (
      NEW.lat, NEW.lng, NEW.user_id, NEW.id, 'pending'
    );
  END IF;
  RETURN NEW;
END;
$function$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trg_queue_place_enrichment'
  ) THEN
    CREATE TRIGGER trg_queue_place_enrichment
      AFTER INSERT ON public.location_visits
      FOR EACH ROW
      WHEN (NEW.place_id IS NULL)
      EXECUTE FUNCTION public.queue_place_enrichment();
  END IF;
END $$;

-- ============================================================
-- Part 4: Function to process enrichment queue
-- ============================================================

CREATE OR REPLACE FUNCTION public.process_place_enrichment_queue(
  batch_size integer DEFAULT 10,
  max_retries integer DEFAULT 3
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  processed_count INTEGER := 0;
  queue_item RECORD;
BEGIN
  -- Get pending items (excluding those that hit max retries)
  FOR queue_item IN
    SELECT * FROM public.place_enrichment_queue
    WHERE status = 'pending'
      AND retry_count < max_retries
    ORDER BY created_at ASC
    LIMIT batch_size
    FOR UPDATE SKIP LOCKED
  LOOP
    -- Mark as processing
    UPDATE public.place_enrichment_queue
    SET 
      status = 'processing',
      last_attempt_at = now(),
      retry_count = retry_count + 1
    WHERE id = queue_item.id;
    
    -- Note: Actual API call would happen in edge function
    -- This function just manages the queue state
    
    processed_count := processed_count + 1;
  END LOOP;
  
  RETURN processed_count;
END;
$function$;

COMMENT ON FUNCTION public.process_place_enrichment_queue IS 'Marks items for processing (actual enrichment happens in edge function)';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✓ C7 Migration Complete: Place enrichment resilience';
  RAISE NOTICE '  - Created place_enrichment_queue table';
  RAISE NOTICE '  - Auto-queues visits with null place_id';
  RAISE NOTICE '  - Edge function needed to call Places API from queue';
END $$;