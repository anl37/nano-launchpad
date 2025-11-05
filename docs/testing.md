# Testing Guide - Spotmate Location Matching

## Setup Requirements

### 1. Database Migration
Run the SQL in `docs/database-migration.sql` in your Supabase SQL Editor

### 2. Enable Location Services
- Test on HTTPS (required for geolocation API)
- Grant location permissions when prompted

## Two-Device Test Scenario

### Device Setup
1. **Device A**: Create account → select 3 interests (e.g., Coffee, Books, Running)
2. **Device B**: Create account → select 3 interests with ≥1 overlap (e.g., Coffee, Gym, Art)

### Test Flow
1. Both devices complete onboarding (interests + location)
2. Bring devices within 15m of each other
3. Both enable "Connect" toggle
4. **Expected**: Within 5-30 seconds, each device shows the other in "Nearby" list
5. Check Supabase `matches` table for auto-created match with `status: 'suggested'`

### Verification Points
- ✅ `presence` table updating every 60-180s (check `updated_at`)
- ✅ `profiles.geohash` populated
- ✅ `matches` table has entry with both user IDs
- ✅ Console shows `[Presence] Published:` logs (if debug enabled)
- ✅ `shared_interests` array contains overlap

## Background Location Testing

### Stationary Test (30+ min)
1. Leave device stationary with app open
2. Monitor `presence.updated_at` - should update every ~2-5 minutes
3. Check battery usage (target: <3-5%/hour)

### Walking Test (200-400m)
1. Walk with device, app in background
2. Presence should update every ~60-120 seconds when moving
3. Check battery usage (target: <6-8%/hour)

## Debug Tools

### Console Logs
Enable `FEATURE_FLAGS.debugPresenceLogging = true` in `src/config/featureFlags.ts`

Look for:
```
[Presence] Publishing due to displacement: ...
[Presence] Published: { lat, lng, geohash, accuracy }
[Nearby] Found users: ...
[Match] Created new match: ...
```

### Database Queries
```sql
-- Check recent presence updates
SELECT user_id, lat, lng, updated_at 
FROM presence 
ORDER BY updated_at DESC;

-- Check active matches
SELECT pair_id, shared_interests, status, last_seen_together_at
FROM matches
ORDER BY last_seen_together_at DESC;

-- Check user profiles
SELECT id, name, interests, geohash, onboarded, is_visible
FROM profiles;
```

## Known Limitations

### Browser Environment
- **No true background**: Tab must stay active for continuous updates
- **Battery**: Higher drain than native (target metrics apply to active usage)
- **Permissions**: Must re-grant after force-quit in some browsers

### Mock Location
- When running on HTTP (non-secure), uses Durham, NC center with small jitter
- Production deployment on HTTPS uses real geolocation

## Expected Behavior

### Matching Criteria
- Distance: ≤15m (configurable in `FEATURE_FLAGS.maxMatchDistanceMeters`)
- Interests: ≥1 shared interest required
- Visibility: Both users must have `is_visible: true`
- Onboarding: Both users must be `onboarded: true`

### Presence Publishing
- **Stationary** (speed <0.5 m/s): ~2-5 min intervals
- **Moving**: ~60-120 sec intervals OR 25m displacement
- **First update**: Always publishes immediately

### Match Creation
- Auto-created when criteria met
- Updates `last_seen_together_at` if already exists
- Status: `suggested` (can be updated to `connected` or `dismissed`)

## Troubleshooting

### "No one nearby" despite close proximity
1. Check both devices have location permissions granted
2. Verify Connect toggle is ON for both
3. Check console for `[Nearby] Found users: 0` - may show query details
4. Verify overlapping interests
5. Check `presence` table has recent entries for both users

### Location not updating
1. Verify HTTPS (or localhost)
2. Check browser DevTools → Location permissions
3. Look for `[Presence] Publishing` logs
4. Check network tab for Supabase requests

### Build errors with Supabase types
- Run after applying migration to regenerate types
- Use `as any` type assertions as temporary workaround

## Performance Targets

### Write Rates (per user)
- Stationary: 30-60 writes/hour
- Walking: 120-240 writes/hour

### Query Performance
- Geohash lookup: <100ms
- Distance filtering: <50ms  
- Match creation: <200ms
