# Location Features Documentation

## Overview

This app implements foreground-only geolocation using the Web Geolocation API. This approach works in browser/preview environments but has limitations compared to native mobile apps.

## Implementation

### Components

- **`useGeolocation` Hook** (`src/hooks/useGeolocation.ts`)
  - Manages foreground location tracking
  - Throttles updates to max 1 per 5 seconds
  - Supports high-accuracy mode during active meetings
  - Auto-detects limited environments and provides Durham, NC mock location

- **`LocationIndicator` Component** (`src/components/LocationIndicator.tsx`)
  - Shows real-time location status: Live, Paused, No permission, Error, Not supported
  - Displays "Mock: Durham, NC" badge when using fallback location
  - Toggle button to start/stop tracking

- **Durham Config** (`src/config/city.ts`)
  - Default city center: `{ lat: 35.9940, lng: -78.8986 }`
  - 6 recommended Durham locations (Central Park, ATC, Duke Gardens, etc.)
  - City bounding box for filtering

### Features

#### Mock Location (Preview/Limited Env)

When running in preview or non-HTTPS environments, the app automatically:
- Uses Durham, NC coordinates as the default location
- Adds small random jitter to simulate movement
- Displays a "Mock: Durham, NC" badge on the LocationIndicator
- Shows "Limited Location Mode" message

#### Real Location (Production/HTTPS)

When running on HTTPS or native builds:
- Requests user permission for geolocation
- Tracks foreground position with configurable accuracy
- Throttles updates to preserve battery
- Supports high-accuracy mode during active meetings

#### Permission Handling

The app handles all permission states:
- **Live**: Location tracking is active
- **Paused**: User manually paused tracking
- **Denied**: User denied permission (shows friendly message)
- **Error**: Geolocation error occurred
- **Unsupported**: Browser doesn't support geolocation

### Spaces Map

The Spaces tab includes an interactive Leaflet map showing:
- Durham city center
- 6 pinned recommended locations
- User's current location (when tracking)
- OpenStreetMap tile layer

**Technology**: Uses vanilla Leaflet (not react-leaflet) for better compatibility and control.

## Limitations (Web vs Native)

| Feature | Web (Current) | Native (React Native) |
|---------|---------------|----------------------|
| Foreground tracking | ✅ Yes | ✅ Yes |
| Background tracking | ❌ No | ✅ Yes (with permissions) |
| High accuracy | ⚠️ Limited | ✅ Yes (GPS + Fused) |
| Battery optimization | ⚠️ Basic throttling | ✅ Advanced (distance filters, adaptive) |
| Offline support | ❌ No | ✅ Yes |
| Precise location (iOS 14+) | ❌ No | ✅ Yes |

## Usage

### Starting Location Tracking

Location tracking starts automatically when `enabled: true` is passed to the hook:

```tsx
const { location, status, toggleTracking, isMockLocation } = useGeolocation({
  enabled: true,
  highAccuracy: false,
});
```

### High Accuracy Mode (Active Meetings)

When a meeting is active, switch to high-accuracy mode:

```tsx
const { location } = useGeolocation({
  enabled: true,
  highAccuracy: !!currentMeeting, // Enable during meetings
});
```

## Meeting Integration

### Unified Meeting Flow

Both "Surprise Me" and Direct connection flows now:
1. Show icebreaker questions
2. Wait for user to tap "We're good"
3. Call `startMeeting()` which sets status to 'active'
4. **Immediately** show ActiveMeetingWindow at top of screen
5. Enable high-accuracy location tracking
6. Show SOS and End Meeting controls

### Meeting Types

- **SURPRISE**: Random match via "Surprise Me" button
- **DIRECT**: Named connection via direct ping

Both types trigger the same:
- ActiveMeetingWindow (SOS + End controls)
- High-accuracy location mode
- Feedback modal on meeting end

### Auto-End Detection

Meeting can end via:
- **Manual**: User taps "End Meeting"
- **Auto**: Geofence/distance threshold (placeholder for future)
- **Timeout**: Time-based rules (placeholder for future)

All end paths trigger the FeedbackModal with 5 Likert questions.

## Configuration

### Environment Variables

```env
# Future: Feature flag for location
LOCATION_ENABLED=true
```

### Throttle Settings

Edit in `src/hooks/useGeolocation.ts`:

```typescript
// Throttle to max 1 update per 5 seconds
if (now - lastUpdateRef.current < 5000) {
  return;
}
```

## Testing

### Preview/Development

1. Open app in browser
2. LocationIndicator should show "Live" with "Mock: Durham, NC"
3. Toggle location on/off
4. Start a meeting → ActiveMeetingWindow appears
5. End meeting → FeedbackModal appears

### Production (HTTPS)

1. Deploy to HTTPS domain
2. Browser will prompt for location permission
3. Grant permission → LocationIndicator shows "Live"
4. Map shows real user location
5. High accuracy enables during meetings

## Future Enhancements

### For Native Build (React Native + Capacitor)

- Background location tracking with foreground service
- Precise location on iOS 14+ (requestTemporaryFullAccuracyAuthorization)
- Battery-aware adaptive sampling
- Geofence-based auto-end detection
- Offline location caching

### For Current Web App

- IndexedDB caching of location history
- Service Worker for offline capability
- Better error recovery
- Location accuracy estimation display
- Battery impact monitoring

## Troubleshooting

### "Mock: Durham, NC" shows in production

- Check if site is on HTTPS
- Verify `window.isSecureContext` is `true`
- Check browser console for permission errors

### Location not updating

- Check LocationIndicator status
- Ensure browser permissions granted
- Check throttle settings (5s minimum)
- Verify not in limited environment

### Map not loading

- Check Leaflet CSS is imported
- Verify network connection to tile server
- Check browser console for errors

## Dependencies

```json
{
  "leaflet": "^1.9.4",
  "@types/leaflet": "^1.9.x"
}
```

## Architecture Diagram

```
┌─────────────────────────────────────────┐
│           App Root (main.tsx)           │
│  ┌───────────────────────────────────┐  │
│  │      MeetingProvider              │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │  MeetingUI (fixed overlay)  │  │  │
│  │  │  - ActiveMeetingWindow      │  │  │
│  │  └─────────────────────────────┘  │  │
│  │                                   │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │     App (BrowserRouter)     │  │  │
│  │  │  ┌───────────────────────┐  │  │  │
│  │  │  │   Space Page          │  │  │  │
│  │  │  │  - useGeolocation     │  │  │  │
│  │  │  │  - LocationIndicator  │  │  │  │
│  │  │  │  - SurpriseMe         │  │  │  │
│  │  │  │  - ConnectPing        │  │  │  │
│  │  │  └───────────────────────┘  │  │  │
│  │  │  ┌───────────────────────┐  │  │  │
│  │  │  │   Spaces Page         │  │  │  │
│  │  │  │  - SpacesMap          │  │  │  │
│  │  │  └───────────────────────┘  │  │  │
│  │  └─────────────────────────────┘  │  │
│  │                                   │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │     FeedbackModal           │  │  │
│  │  └─────────────────────────────┘  │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

## Credits

- **Mapping**: OpenStreetMap contributors
- **Location Library**: Leaflet
- **City**: Durham, NC (default for development)
