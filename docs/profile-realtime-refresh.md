# Profile Tab Real-Time Refresh

## Overview
The Profile tab's Activity and Trends cards automatically update when new data arrives, with no historical backfill or scheduled jobs. Changes reflect within ~1 minute of new events.

## Implementation

### Data Flow
Three hooks power the Profile cards:

1. **`useWeeklyPresence`** (Weekly Presence card - currently commented out)
   - Subscribes to: `location_visits` table (INSERT events)
   - Refreshes on: New location visits for the user
   - Data: Last 7 days of visits aggregated by day and time of day

2. **`useActivityStats`** (Top Activities card)
   - Subscribes to: `activity_patterns` table (INSERT/UPDATE/DELETE) + `profiles` table (UPDATE for interests)
   - Refreshes on: Pattern changes or interest updates
   - Data: Top 3 activities from user interests and patterns

3. **`useUserTrends`** (Typical Times & My Trends cards)
   - Subscribes to: `activity_patterns` table (all events) + `matches` table (all events where user is uid_a or uid_b)
   - Refreshes on: Pattern changes or new/updated matches
   - Data: Most common time of day, day type, connection stats

### Real-Time Strategy
- **Primary**: Supabase Realtime subscriptions to underlying tables
- **Forward-only**: No backfill; only new data triggers updates
- **Automatic cleanup**: Channels are removed when component unmounts

### Tables Monitored
- `public.location_visits` (for weekly presence)
- `public.activity_patterns` (for activities & trends)
- `public.profiles` (for interest changes)
- `public.matches` (for connection stats)

## Testing

### Manual Test
1. Open Profile tab
2. Record a new location visit (via Home tab location recording)
3. Wait ~10 seconds for sessionization
4. Observe Activity/Trends cards update automatically

### Verify Subscriptions
Check browser console for:
```
New location visit detected, refreshing weekly presence
Activity patterns updated, refreshing stats
Matches updated, refreshing trends
```

### Test Real-Time Updates
```sql
-- Simulate a pattern update (run in Supabase SQL Editor)
UPDATE public.activity_patterns 
SET visit_count = visit_count + 1 
WHERE user_id = 'your-user-id' 
LIMIT 1;
```

Profile cards should update within seconds.

## Configuration
No configuration needed. Real-time subscriptions are automatically:
- Created on component mount
- Filtered to current user
- Cleaned up on unmount

## Performance Notes
- Subscriptions use Postgres LISTEN/NOTIFY (minimal overhead)
- Each hook creates a single channel with multiple listeners
- No polling or manual refetching required
- Data fetches only run on actual changes

## Maintenance
- To disable real-time updates: Comment out the channel subscription in respective hooks
- To adjust refresh logic: Modify the callback in `.on('postgres_changes', ...)` handlers
- No database-side maintenance required (no views, RPCs, or cron jobs)
