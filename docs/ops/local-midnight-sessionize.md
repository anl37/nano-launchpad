# Per-User Local Midnight Sessionization

## Purpose

Automatically run sessionization once per user when their local date flips to a new day. This ensures daily activity patterns are processed consistently across all time zones, including proper handling of Daylight Saving Time (DST) transitions.

## How It Works

### Architecture

1. **Cron Schedule**: Runs every 15 minutes in UTC at `:05`, `:20`, `:35`, and `:50` past each hour
   - Staggered timing avoids top-of-hour load spikes
   - Covers all time zones with sufficient frequency

2. **Date Change Detection**: 
   - Compares `(NOW() AT TIME ZONE user_tz)::DATE` with `((NOW() - 30min) AT TIME ZONE user_tz)::DATE`
   - If dates differ, the user crossed midnight in their local time zone
   - **DST-safe**: Uses PostgreSQL's timezone conversion, which automatically handles DST shifts

3. **Deduplication**:
   - Table: `public.user_midnight_runs(user_id, local_date, ran_at)`
   - Primary key on `(user_id, local_date)` ensures at most one run per user per day
   - Prevents duplicate processing if cron runs overlap or retry

4. **Sessionization Call**:
   - Invokes existing `public.sessionize_recent_visits(user_id, gap_threshold, lookback_hours)`
   - Default: 10-minute gap threshold, 24-hour lookback

### Database Objects

| Object | Type | Description |
|--------|------|-------------|
| `user_midnight_runs` | Table | Dedupe log tracking when each user was sessionized |
| `run_sessionize_for_users_crossing_midnight()` | Function | Finds users who crossed midnight and runs sessionization |
| `spotmate-sessionize-local-midnight` | Cron Job | Scheduled task running every 15 minutes |

## Requirements

### Timezone Configuration

**Critical**: Each user must have their timezone set in `public.profiles(timezone)`.

- **Format**: IANA timezone string (e.g., `America/New_York`, `America/Los_Angeles`, `Europe/London`)
- **Source**: Typically detected during onboarding or from browser (`Intl.DateTimeFormat().resolvedOptions().timeZone`)
- **Fallback**: If `timezone` is `NULL`, the user is skipped

**Setting User Timezone** (example):
```sql
UPDATE public.profiles 
SET timezone = 'America/Los_Angeles' 
WHERE id = 'user-uuid-here';
```

Or via client code:
```typescript
const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
await supabase
  .from('profiles')
  .update({ timezone: userTimezone })
  .eq('id', userId);
```

## Verification

### Check Cron Job Status

```sql
-- View scheduled job
SELECT jobid, jobname, schedule, command, active
FROM cron.job
WHERE jobname = 'spotmate-sessionize-local-midnight';

-- View recent runs
SELECT status, start_time, end_time, return_message
FROM cron.job_run_details
WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname = 'spotmate-sessionize-local-midnight')
ORDER BY start_time DESC
LIMIT 10;
```

### Inspect Dedupe Table

```sql
-- Recent sessionization runs
SELECT user_id, local_date, ran_at
FROM public.user_midnight_runs
ORDER BY ran_at DESC
LIMIT 20;

-- Count runs per user
SELECT user_id, COUNT(*) AS total_runs, MAX(ran_at) AS last_run
FROM public.user_midnight_runs
GROUP BY user_id
ORDER BY total_runs DESC;
```

### Manual Trigger (Testing)

```sql
-- Run immediately (useful for testing)
SELECT public.run_sessionize_for_users_crossing_midnight(10, 24, 30) AS users_processed;
```

## Configuration

### Adjusting Window Size

The `window_minutes` parameter (default: 30) determines how far back to look for midnight crossings.

**Rule of thumb**: Set `window_minutes` slightly larger than your cron frequency.

| Cron Frequency | Recommended Window |
|----------------|-------------------|
| Every 15 min   | 30 minutes        |
| Every 30 min   | 45 minutes        |
| Every 60 min   | 75 minutes        |

**Example**: Change to 60-minute checks:
```sql
-- Update cron schedule
SELECT cron.unschedule('spotmate-sessionize-local-midnight');
SELECT cron.schedule(
  'spotmate-sessionize-local-midnight',
  '0 * * * *',  -- every hour
  $$ SELECT public.run_sessionize_for_users_crossing_midnight(10, 24, 75); $$
);
```

### Adjusting Sessionization Parameters

Modify the function call in the cron job to change defaults:

```sql
-- Example: 15-minute gap threshold, 48-hour lookback
SELECT cron.schedule(
  'spotmate-sessionize-local-midnight',
  '5,20,35,50 * * * *',
  $$ SELECT public.run_sessionize_for_users_crossing_midnight(15, 48, 30); $$
);
```

## Maintenance

### Disable Scheduler

```sql
-- Stop the cron job
SELECT cron.unschedule('spotmate-sessionize-local-midnight');
```

### Re-enable Scheduler

```sql
-- Restart with default settings
SELECT cron.schedule(
  'spotmate-sessionize-local-midnight',
  '5,20,35,50 * * * *',
  $$ SELECT public.run_sessionize_for_users_crossing_midnight(10, 24, 30); $$
);
```

### Cleanup Old Dedupe Records

The `user_midnight_runs` table grows indefinitely. Clean up old records periodically:

```sql
-- Delete records older than 90 days
DELETE FROM public.user_midnight_runs
WHERE ran_at < NOW() - INTERVAL '90 days';
```

**Recommended**: Set up a monthly cleanup cron job:
```sql
SELECT cron.schedule(
  'cleanup-midnight-runs',
  '0 3 1 * *',  -- 3 AM on the 1st of each month
  $$ DELETE FROM public.user_midnight_runs WHERE ran_at < NOW() - INTERVAL '90 days'; $$
);
```

## DST Handling

### How DST Is Handled

PostgreSQL's `AT TIME ZONE` operator automatically accounts for DST:

- **Spring Forward** (lose 1 hour): Date comparison still works correctly
- **Fall Back** (gain 1 hour): Date comparison still works correctly
- **Example**: User in `America/New_York` crosses midnight at `2024-03-10 05:00 UTC` (before DST) and `2024-03-11 04:00 UTC` (after DST)

### What Happens During DST Transitions?

- **No duplicate runs**: Dedupe table prevents re-processing the same `(user_id, local_date)` pair
- **No missed runs**: 30-minute window is wide enough to catch the midnight crossing even with 1-hour shifts

### Testing DST Scenarios

```sql
-- Simulate date check for a user in America/New_York during DST transition
SELECT 
  (NOW() AT TIME ZONE 'America/New_York')::DATE AS current_local_date,
  ((NOW() - INTERVAL '30 minutes') AT TIME ZONE 'America/New_York')::DATE AS prev_local_date,
  CASE 
    WHEN (NOW() AT TIME ZONE 'America/New_York')::DATE 
         <> ((NOW() - INTERVAL '30 minutes') AT TIME ZONE 'America/New_York')::DATE
    THEN 'CROSSED MIDNIGHT'
    ELSE 'Same day'
  END AS status;
```

## Troubleshooting

### Cron Not Running

**Check if pg_cron is enabled**:
```sql
SELECT extname, extversion FROM pg_extension WHERE extname = 'pg_cron';
```

If missing, enable it (requires superuser):
```sql
CREATE EXTENSION pg_cron;
```

### Users Not Being Processed

**Check timezone configuration**:
```sql
SELECT COUNT(*) AS users_with_timezone
FROM public.profiles
WHERE timezone IS NOT NULL;
```

**Check recent errors**:
```sql
SELECT status, return_message
FROM cron.job_run_details
WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname = 'spotmate-sessionize-local-midnight')
  AND status = 'failed'
ORDER BY start_time DESC;
```

### Manual Run for Specific User

```sql
-- Force sessionization for one user (bypasses dedupe)
SELECT public.sessionize_recent_visits('user-uuid-here', 10, 24);
```

## Performance Notes

- **Typical load**: 0-5 users processed per 15-minute interval (depends on time zone distribution)
- **Peak load**: Up to 20-30 users if many share the same time zone
- **Query cost**: Single sequential scan of `profiles` table filtered by `timezone IS NOT NULL`
- **Scaling**: Index on `profiles.timezone` keeps lookups fast even with 100K+ users

## Migration History

| File | Purpose |
|------|---------|
| `001_per_user_local_midnight_scheduler.sql` | Initial deployment |
| `002_verify_local_midnight_scheduler.sql` | Verification queries |

---

**Last Updated**: 2025-11-05  
**Dependencies**: `pg_cron`, `public.sessionize_recent_visits()`
