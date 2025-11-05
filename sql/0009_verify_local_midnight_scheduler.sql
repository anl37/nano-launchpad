-- Verification & Testing Script: Per-user Local Midnight Sessionization
-- Use these queries to verify the scheduler is working correctly

-- ============================================
-- 1. Manual trigger (useful right after deploy)
-- ============================================
-- Manually run the function once to test
SELECT public.run_sessionize_for_users_crossing_midnight(10, 24, 30) AS runs_triggered;

-- ============================================
-- 2. View scheduled cron job
-- ============================================
-- Check that the cron job exists and is properly configured
SELECT 
  jobid, 
  jobname, 
  schedule, 
  command,
  active,
  database
FROM cron.job
WHERE jobname = 'spotmate-sessionize-local-midnight';

-- ============================================
-- 3. View recent cron run history
-- ============================================
-- Check recent execution status, timing, and results
SELECT 
  jobid,
  runid,
  status,
  start_time,
  end_time,
  return_message,
  EXTRACT(EPOCH FROM (end_time - start_time)) AS duration_seconds
FROM cron.job_run_details
WHERE jobid IN (
  SELECT jobid 
  FROM cron.job 
  WHERE jobname = 'spotmate-sessionize-local-midnight'
)
ORDER BY start_time DESC
LIMIT 20;

-- ============================================
-- 4. Inspect dedupe table
-- ============================================
-- See which users have been processed and when
SELECT 
  user_id,
  local_date,
  ran_at,
  EXTRACT(EPOCH FROM (NOW() - ran_at)) / 3600 AS hours_ago
FROM public.user_midnight_runs
ORDER BY ran_at DESC
LIMIT 50;

-- ============================================
-- 5. Check users with timezones set
-- ============================================
-- Verify users have timezones configured
SELECT 
  id,
  name,
  timezone,
  (NOW() AT TIME ZONE COALESCE(timezone, 'UTC'))::DATE AS current_local_date
FROM public.profiles
WHERE timezone IS NOT NULL
ORDER BY timezone, name
LIMIT 50;

-- ============================================
-- 6. Count runs per user (debugging)
-- ============================================
-- See how many times each user has been sessionized
SELECT 
  user_id,
  COUNT(*) AS total_runs,
  MIN(local_date) AS first_run_date,
  MAX(local_date) AS last_run_date,
  MAX(ran_at) AS last_run_timestamp
FROM public.user_midnight_runs
GROUP BY user_id
ORDER BY total_runs DESC, last_run_timestamp DESC
LIMIT 50;

-- ============================================
-- 7. Upcoming midnight crossings (preview)
-- ============================================
-- See which users might trigger in the next window
WITH user_times AS (
  SELECT 
    id AS user_id,
    timezone,
    (NOW() AT TIME ZONE timezone)::DATE AS current_local_date,
    (NOW() + INTERVAL '30 minutes' AT TIME ZONE timezone)::DATE AS future_local_date
  FROM public.profiles
  WHERE timezone IS NOT NULL
)
SELECT 
  user_id,
  timezone,
  current_local_date,
  future_local_date,
  CASE 
    WHEN current_local_date <> future_local_date 
    THEN 'WILL TRIGGER'
    ELSE 'No change'
  END AS trigger_status
FROM user_times
WHERE current_local_date <> future_local_date
ORDER BY timezone;

-- ============================================
-- 8. Cleanup old dedupe records (optional maintenance)
-- ============================================
-- Delete dedupe records older than 90 days (run manually as needed)
-- Uncomment to execute:
-- DELETE FROM public.user_midnight_runs
-- WHERE ran_at < NOW() - INTERVAL '90 days';
