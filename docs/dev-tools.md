# Developer Tools

## Debug Screen

Access the developer debug screen at `/dev` to monitor:

- **User Info**: Current user ID, email, interests, onboarding status
- **Location Status**: Real-time GPS coordinates, accuracy, speed
- **Presence Data**: Last database update timestamp, geohash
- **Nearby Matches**: Live count of users within 15m, with shared interests
- **Feature Flags**: Current configuration values

### Quick Access

Navigate to: `https://your-app-url.com/dev`

### Features

1. **Force Update Location** - Manually push current coordinates to database
2. **Real-time Monitoring** - Auto-refreshes presence data every 5 seconds
3. **Match Details** - Shows distance and shared interests for each nearby user
4. **Configuration Display** - View all throttle settings and feature flags

## Testing Two-Device Match

1. Open app on Device A, sign in, complete onboarding
2. Open app on Device B (or different browser), sign in with different account
3. Ensure both accounts have at least 1 shared interest
4. Navigate to `/dev` on both devices
5. Verify location is updating (check "Presence Table" section)
6. Move within 15m of each other
7. Watch "Nearby Matches" count increase
8. Check main `/space` page to see each other appear

## Troubleshooting

### Location not updating?
- Check browser console for geolocation errors
- Verify HTTPS (or localhost) - HTTP blocks geolocation
- Check "Location Status" section in `/dev` for errors

### No nearby matches?
- Verify both users have `onboarded: true` and `is_visible: true`
- Confirm shared interests exist (check profiles table)
- Check distance is actually ≤15m using `/dev` coordinates
- Look for geohash in presence table - if missing, location hasn't published

### Mock location showing?
- Expected on non-HTTPS sites (uses Durham, NC center)
- For real GPS, deploy to production HTTPS domain

## Console Logging

When `FEATURE_FLAGS.debugPresenceLogging = true`, check browser console for:
- `[Presence] Publishing due to displacement: {...}`
- `[Presence] Published: {...}`
- `[Nearby] Found users: {...}`
- `[Match] Created new match: {...}`

## Environment Variables

Current setup uses:
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Public anon key

Verify these are set correctly in your deployment environment.
