-- DST & Boundary Tests for Time Functions
-- Tests timezone conversions, DST transitions, and midnight boundaries

-- ============================================================
-- Test 1: Midnight Boundary (23:59 → 00:01)
-- ============================================================

DO $$
DECLARE
  test_ts1 TIMESTAMP WITH TIME ZONE := '2025-03-09 04:59:00+00'::timestamptz; -- 23:59 EST
  test_ts2 TIMESTAMP WITH TIME ZONE := '2025-03-09 05:01:00+00'::timestamptz; -- 00:01 EST next day
  day1 TEXT;
  day2 TEXT;
  window1 TEXT;
  window2 TEXT;
BEGIN
  -- Test fill_location_time_fields behavior
  CREATE TEMP TABLE test_visits (
    id uuid DEFAULT gen_random_uuid(),
    user_id uuid DEFAULT gen_random_uuid(),
    lat double precision DEFAULT 35.9940,
    lng double precision DEFAULT -78.8986,
    timestamp_utc timestamp with time zone,
    user_timezone_at_event text DEFAULT 'America/New_York',
    day_of_week text,
    time_window text,
    time_of_day text,
    day_type text,
    place_type text DEFAULT 'cafe'
  );
  
  INSERT INTO test_visits (timestamp_utc) VALUES (test_ts1), (test_ts2);
  
  -- Simulate trigger behavior
  UPDATE test_visits
  SET 
    day_of_week = TRIM(TO_CHAR(timestamp_utc AT TIME ZONE user_timezone_at_event, 'Day')),
    time_window = public.two_hour_bucket(timestamp_utc AT TIME ZONE user_timezone_at_event),
    time_of_day = public.time_of_day_category(timestamp_utc AT TIME ZONE user_timezone_at_event);
  
  SELECT day_of_week, time_window INTO day1, window1 
  FROM test_visits WHERE timestamp_utc = test_ts1;
  
  SELECT day_of_week, time_window INTO day2, window2 
  FROM test_visits WHERE timestamp_utc = test_ts2;
  
  -- Assertions
  ASSERT day1 = 'Sunday', 'Expected Sunday for 23:59, got ' || day1;
  ASSERT day2 = 'Monday', 'Expected Monday for 00:01, got ' || day2;
  ASSERT window1 = '22:00–00:00', 'Expected 22:00–00:00 window for 23:59, got ' || window1;
  ASSERT window2 = '00:00–02:00', 'Expected 00:00–02:00 window for 00:01, got ' || window2;
  
  RAISE NOTICE '✓ Test 1 PASSED: Midnight boundary handled correctly';
  
  DROP TABLE test_visits;
END $$;

-- ============================================================
-- Test 2: DST Spring Forward (2025-03-09 02:00 → 03:00)
-- ============================================================

DO $$
DECLARE
  test_before TIMESTAMP WITH TIME ZONE := '2025-03-09 06:59:00+00'::timestamptz; -- 01:59 EST
  test_after TIMESTAMP WITH TIME ZONE := '2025-03-09 07:01:00+00'::timestamptz;  -- 03:01 EDT (skips 02:00)
  window_before TEXT;
  window_after TEXT;
BEGIN
  CREATE TEMP TABLE test_dst_spring (
    timestamp_utc timestamp with time zone,
    user_timezone_at_event text DEFAULT 'America/New_York',
    time_window text,
    local_hour integer
  );
  
  INSERT INTO test_dst_spring (timestamp_utc) VALUES (test_before), (test_after);
  
  UPDATE test_dst_spring
  SET 
    time_window = public.two_hour_bucket(timestamp_utc AT TIME ZONE user_timezone_at_event),
    local_hour = EXTRACT(HOUR FROM timestamp_utc AT TIME ZONE user_timezone_at_event)::INTEGER;
  
  SELECT time_window INTO window_before FROM test_dst_spring WHERE timestamp_utc = test_before;
  SELECT time_window INTO window_after FROM test_dst_spring WHERE timestamp_utc = test_after;
  
  ASSERT window_before = '00:00–02:00', 'Expected 00:00–02:00 for 01:59, got ' || window_before;
  ASSERT window_after = '02:00–04:00', 'Expected 02:00–04:00 for 03:01, got ' || window_after;
  
  RAISE NOTICE '✓ Test 2 PASSED: DST spring forward handled';
  
  DROP TABLE test_dst_spring;
END $$;

-- ============================================================
-- Test 3: DST Fall Back (2025-11-02 01:00 → 01:00 again)
-- ============================================================

DO $$
DECLARE
  test_first TIMESTAMP WITH TIME ZONE := '2025-11-02 05:30:00+00'::timestamptz;  -- 01:30 EDT (first time)
  test_second TIMESTAMP WITH TIME ZONE := '2025-11-02 06:30:00+00'::timestamptz; -- 01:30 EST (second time)
  window_first TEXT;
  window_second TEXT;
BEGIN
  CREATE TEMP TABLE test_dst_fall (
    timestamp_utc timestamp with time zone,
    user_timezone_at_event text DEFAULT 'America/New_York',
    time_window text
  );
  
  INSERT INTO test_dst_fall (timestamp_utc) VALUES (test_first), (test_second);
  
  UPDATE test_dst_fall
  SET time_window = public.two_hour_bucket(timestamp_utc AT TIME ZONE user_timezone_at_event);
  
  SELECT time_window INTO window_first FROM test_dst_fall WHERE timestamp_utc = test_first;
  SELECT time_window INTO window_second FROM test_dst_fall WHERE timestamp_utc = test_second;
  
  -- Both should map to same window (PostgreSQL handles DST correctly)
  ASSERT window_first = '00:00–02:00', 'Expected 00:00–02:00 for first 01:30, got ' || window_first;
  ASSERT window_second = '00:00–02:00', 'Expected 00:00–02:00 for second 01:30, got ' || window_second;
  
  RAISE NOTICE '✓ Test 3 PASSED: DST fall back handled (both 01:30 map to same window)';
  
  DROP TABLE test_dst_fall;
END $$;

-- ============================================================
-- Test 4: Canonical time_of_day values
-- ============================================================

DO $$
DECLARE
  morning_hour INTEGER := 8;
  afternoon_hour INTEGER := 14;
  evening_hour INTEGER := 19;
  night_hour INTEGER := 2;
  result TEXT;
BEGIN
  -- Test time_of_day_category function
  SELECT public.time_of_day_category('2025-01-01 08:00:00'::timestamp) INTO result;
  ASSERT result = 'morning', 'Expected morning for 08:00, got ' || result;
  
  SELECT public.time_of_day_category('2025-01-01 14:00:00'::timestamp) INTO result;
  ASSERT result = 'afternoon', 'Expected afternoon for 14:00, got ' || result;
  
  SELECT public.time_of_day_category('2025-01-01 19:00:00'::timestamp) INTO result;
  ASSERT result = 'evening', 'Expected evening for 19:00, got ' || result;
  
  SELECT public.time_of_day_category('2025-01-01 02:00:00'::timestamp) INTO result;
  ASSERT result = 'night', 'Expected night for 02:00, got ' || result;
  
  RAISE NOTICE '✓ Test 4 PASSED: Canonical time_of_day values correct';
END $$;

-- Success summary
DO $$
BEGIN
  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE '✓ ALL DST & BOUNDARY TESTS PASSED';
  RAISE NOTICE '  - Midnight boundaries work correctly';
  RAISE NOTICE '  - DST spring forward handled';
  RAISE NOTICE '  - DST fall back handled';
  RAISE NOTICE '  - Canonical time_of_day verified';
  RAISE NOTICE '═══════════════════════════════════════';
END $$;
