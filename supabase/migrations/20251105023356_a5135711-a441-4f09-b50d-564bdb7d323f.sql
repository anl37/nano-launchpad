-- Migration 0007: Suggested Matches Table
-- Separate suggestions from accepted connections for analytics

-- ============================================================
-- Part 1: Create suggested_matches table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.suggested_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  suggested_user_id uuid NOT NULL,
  compatibility_score double precision NOT NULL DEFAULT 0,
  match_reason text,
  shared_interests text[] DEFAULT '{}',
  behavioral_overlap jsonb,
  created_at timestamp with time zone DEFAULT now(),
  shown_at timestamp with time zone,
  action text CHECK (action IN ('shown', 'requested', 'dismissed', 'expired')),
  action_at timestamp with time zone,
  UNIQUE(user_id, suggested_user_id)
);

CREATE INDEX IF NOT EXISTS idx_suggested_matches_user 
  ON public.suggested_matches(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_suggested_matches_action 
  ON public.suggested_matches(user_id, action, created_at DESC);

COMMENT ON TABLE public.suggested_matches IS 'Match suggestions with tracking for analytics and A/B testing';

-- ============================================================
-- Part 2: Optional analytics tables
-- ============================================================

CREATE TABLE IF NOT EXISTS public.suggestion_impressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id uuid REFERENCES public.suggested_matches(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  viewed_at timestamp with time zone DEFAULT now(),
  view_duration_seconds integer,
  scroll_depth_percent integer
);

CREATE INDEX IF NOT EXISTS idx_suggestion_impressions_suggestion 
  ON public.suggestion_impressions(suggestion_id);

COMMENT ON TABLE public.suggestion_impressions IS 'Track how users interact with match suggestions';

CREATE TABLE IF NOT EXISTS public.suggestion_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id uuid REFERENCES public.suggested_matches(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('view', 'dismiss', 'request', 'block')),
  action_at timestamp with time zone DEFAULT now(),
  context jsonb
);

CREATE INDEX IF NOT EXISTS idx_suggestion_actions_suggestion 
  ON public.suggestion_actions(suggestion_id, action);

COMMENT ON TABLE public.suggestion_actions IS 'Detailed action log for suggestion funnel analysis';

-- ============================================================
-- Part 3: RLS policies
-- ============================================================

ALTER TABLE public.suggested_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suggestion_impressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suggestion_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own suggestions"
  ON public.suggested_matches
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own suggestion actions"
  ON public.suggested_matches
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service can insert suggestions"
  ON public.suggested_matches
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view their own impressions"
  ON public.suggestion_impressions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own impressions"
  ON public.suggestion_impressions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own actions"
  ON public.suggestion_actions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own actions"
  ON public.suggestion_actions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Part 4: Trigger to mark suggestion as requested
-- ============================================================

CREATE OR REPLACE FUNCTION public.mark_suggestion_requested()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
  -- When a connection request is created, mark the suggestion as requested
  UPDATE public.suggested_matches
  SET 
    action = 'requested',
    action_at = now()
  WHERE (
    (user_id = NEW.sender_id AND suggested_user_id = NEW.receiver_id)
    OR (user_id = NEW.receiver_id AND suggested_user_id = NEW.sender_id)
  )
  AND action IS NULL OR action = 'shown';
  
  RETURN NEW;
END;
$function$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trg_mark_suggestion_requested'
  ) THEN
    CREATE TRIGGER trg_mark_suggestion_requested
      AFTER INSERT ON public.connection_requests
      FOR EACH ROW
      EXECUTE FUNCTION public.mark_suggestion_requested();
  END IF;
END $$;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✓ C8 Migration Complete: Suggested matches';
  RAISE NOTICE '  - Created suggested_matches table';
  RAISE NOTICE '  - Created suggestion_impressions, suggestion_actions for analytics';
  RAISE NOTICE '  - Auto-marks suggestions as requested when connection sent';
END $$;