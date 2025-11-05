-- Migration 0004: Compatibility Weights Normalization
-- Ensures weights always sum to 1.0 with normalized view

-- ============================================================
-- Part 1: Create normalized view
-- ============================================================

CREATE OR REPLACE VIEW public.vw_compatibility_weights_normalized AS
SELECT 
  user_id,
  interest_weight,
  behavior_weight,
  feedback_weight,
  data_points_count,
  updated_at,
  -- Normalized weights (handle edge case where sum is 0)
  CASE 
    WHEN (interest_weight + behavior_weight + feedback_weight) > 0 THEN
      interest_weight / (interest_weight + behavior_weight + feedback_weight)
    ELSE 0.33
  END as interest_weight_normalized,
  CASE 
    WHEN (interest_weight + behavior_weight + feedback_weight) > 0 THEN
      behavior_weight / (interest_weight + behavior_weight + feedback_weight)
    ELSE 0.33
  END as behavior_weight_normalized,
  CASE 
    WHEN (interest_weight + behavior_weight + feedback_weight) > 0 THEN
      feedback_weight / (interest_weight + behavior_weight + feedback_weight)
    ELSE 0.34
  END as feedback_weight_normalized,
  -- Deviation from 1.0
  ABS((interest_weight + behavior_weight + feedback_weight) - 1.0) as weight_sum_deviation
FROM public.compatibility_weights;

COMMENT ON VIEW public.vw_compatibility_weights_normalized IS 'Compatibility weights with normalization and deviation tracking';

-- ============================================================
-- Part 2: Add CHECK constraint (with tolerance for floating point)
-- ============================================================

DO $$
BEGIN
  -- Check if constraint already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_weights_sum_to_one'
  ) THEN
    ALTER TABLE public.compatibility_weights
    ADD CONSTRAINT chk_weights_sum_to_one
    CHECK (ABS((interest_weight + behavior_weight + feedback_weight) - 1.0) < 0.001);
  END IF;
END $$;

-- ============================================================
-- Part 3: Normalize existing weights that are off
-- ============================================================

UPDATE public.compatibility_weights
SET 
  interest_weight = interest_weight / (interest_weight + behavior_weight + feedback_weight),
  behavior_weight = behavior_weight / (interest_weight + behavior_weight + feedback_weight),
  feedback_weight = feedback_weight / (interest_weight + behavior_weight + feedback_weight)
WHERE ABS((interest_weight + behavior_weight + feedback_weight) - 1.0) >= 0.001;

-- Success message
DO $$
DECLARE
  normalized_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO normalized_count
  FROM public.compatibility_weights
  WHERE ABS((interest_weight + behavior_weight + feedback_weight) - 1.0) >= 0.001;
  
  IF normalized_count = 0 THEN
    RAISE NOTICE '✓ C5 Migration Complete: Weights normalized';
    RAISE NOTICE '  - All weights sum to 1.0 (±0.001)';
    RAISE NOTICE '  - CHECK constraint added';
    RAISE NOTICE '  - Normalized view created';
  ELSE
    RAISE WARNING '⚠ Found % weights still not normalized', normalized_count;
  END IF;
END $$;
