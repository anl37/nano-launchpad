# Migration Plan: Data Pipeline Audit & Fix

## Overview
Systematic audit and improvement of the location data pipeline to address 14 identified gotchas.

## Ordered Checkpoints

### C1. Baseline Diagnostics ✓
**Goal**: Establish current state of data
**Queries**:
- Count location_visits, location_sessions, activity_summaries, activity_patterns
- Place enrichment coverage (null place_id %)
- Confidence score distribution
- DST boundary cases
**Artifacts**: PROGRESS.md with baseline metrics

### C2. Time Canonicalization
**Goal**: Add numeric time windows, standardize time_of_day
**Changes**:
- Add `window_start_min`, `window_end_min` columns to activity_summaries
- Enforce canonical `time_of_day` ∈ {morning, afternoon, evening, night}
- Create view `vw_activity_summaries_pretty` with human-readable labels
**Migration**: `sql/0001_time_windows.sql`
**Rationale**: String parsing is fragile; numeric windows enable proper sorting/filtering

### C3. Sessionizer Improvements
**Goal**: Smarter session detection with place_id preference
**Changes**:
- Update `sessionize_recent_visits()` to prefer `place_id` matching
- Adapt radius for large venues (gyms, parks: 100m; cafes: 50m)
- Use median confidence instead of min
- Fallback to ST_DWithin for distance calculation
**Migration**: `sql/0002_sessionize_functions.sql`
**Rationale**: Current implementation overcounts sessions due to GPS jitter

### C4. Patterns from Sessions
**Goal**: Derive activity_patterns from sessions, not raw pings
**Changes**:
- Create `update_activity_patterns_from_sessions()` function
- Gate raw-ping trigger to fire only on first ping per session
- Add scheduled job to backfill from sessions
**Migration**: `sql/0003_patterns_from_sessions.sql`
**Rationale**: Raw pings inflate visit_count; sessions are the true unit

### C5. Weights Normalization
**Goal**: Ensure compatibility weights always sum to 1.0
**Changes**:
- Add CHECK constraint: `interest_weight + behavior_weight + feedback_weight = 1.0` (±1e-6)
- Create `vw_compatibility_weights_normalized` view that normalizes on read
**Migration**: `sql/0004_weights_normalization.sql`
**Rationale**: Weight drift breaks scoring assumptions

### C6. Recency & Frequency Clarifications
**Goal**: Store explicit numerators/denominators for frequency
**Changes**:
- Add `frequency_numerator`, `frequency_denominator` to activity_summaries
- Move `recency_score` to computed view (time-decay from current date)
- Create materialized view `mv_activity_summaries_with_recency`
- Add cron job for nightly refresh
**Migration**: `sql/0005_recency_frequency.sql`
**Rationale**: Baked recency scores become stale; explicit fractions prevent confusion

### C7. Place Enrichment Resilience
**Goal**: Allow sessionization even when place_id is unknown
**Changes**:
- Modify sessionization to work with just lat/lng when place_id is null
- Create `place_enrichment_queue` table for async retry
- Add edge function job to process queue
**Migration**: `sql/0006_place_enrichment_retry.sql`
**Rationale**: Google API failures shouldn't block session creation

### C8. Suggested Matches Table
**Goal**: Separate suggestions from accepted connections
**Changes**:
- Create `suggested_matches` table (user_id, suggested_user_id, score, reason, created_at, shown_at, action)
- Optional: `suggestion_impressions`, `suggestion_actions` for analytics
- Trigger: mark suggestion as `requested` when connection_request created
**Migration**: `sql/0007_suggested_matches.sql`
**Rationale**: Analytics on suggestions vs. acceptance rates; A/B testing

### C9. DST & Boundary Tests
**Goal**: Verify timezone conversions work correctly
**Changes**:
- Add test fixtures for DST transitions (spring forward, fall back)
- Test midnight boundaries (23:59 → 00:01 same session?)
- Document expected behaviors
**Artifacts**: `functions/tests/test_dst_boundaries.sql`
**Rationale**: Time bugs are subtle and costly

### C10. Verification & Backfill
**Goal**: Apply changes to historical data
**Steps**:
1. Backfill sessions for last 14 days
2. Recompute activity_patterns from sessions
3. Refresh materialized views
4. Re-run C1 diagnostics
5. Compare before/after metrics
**Artifacts**: Updated PROGRESS.md with before/after comparison

## Rollback Strategy
All migrations include:
- Conditional creation (`IF NOT EXISTS`)
- Separate down migration in comments
- No data deletion (only additions/views)

## Success Metrics
- Sessions cover >95% of raw visits
- Place enrichment coverage >90%
- Zero activity_patterns with visit_count = 1 (raw ping artifacts)
- All weights sum to 1.0 ±1e-6
- DST tests pass
