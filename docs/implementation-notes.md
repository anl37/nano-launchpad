# Implementation Notes - Spotmate Location Matching System

## Repository Audit (as of 2025-10-26)

### Existing Infrastructure

#### Authentication
- ✅ Email/password authentication exists via Supabase Auth
- ✅ Name storage via `auth.users.raw_user_meta_data.name`
- ✅ Auth screens at `/auth` with login & signup flows
- ⚠️ Missing: `onboarded` flag to track onboarding completion

#### Database Tables (Supabase PostgreSQL)

**profiles table** (exists)
- id (uuid, FK to auth.users)
- name (text)
- interests (text[]) - ✅ Already array format
- lat, lng (double precision)
- location_updated_at (timestamptz)
- availability_status ('online' | 'busy' | 'offline')
- Other fields: avatar_url, emoji_signature, location_accuracy

**user_presence table** (exists)
- id, user_id, location_id, lat, lng
- status ('live' | 'paused')
- last_updated, created_at
- ⚠️ Currently location-centric, needs user-centric approach
- ⚠️ Missing: geohash field for spatial indexing

**connections table** (exists)
- Similar to "matches" concept but focused on completed meetings
- user_id, connected_user_id, last_met_at, meet_count

**meet_plans table** (exists)
- Stores scheduled meetups with venue details

#### Existing Code

**Hooks:**
- `useGeolocation.ts` - Browser-based location tracking ✅
- `useUserPresence.ts` - Presence updates (needs refactor)
- `useAuth.tsx` - Auth state management ✅

**Utils:**
- `interest-utils.ts` - Interest/category mapping ✅
- `location-utils.ts` - Haversine distance calculation ✅
- `geocoding-utils.ts` - Google Maps integration ✅

**Screens:**
- `/auth` - Sign up & login ✅
- `/space` - Main "nearby" view (mock data) ⚠️
- `/profile` - User profile view
- ❌ Missing: Interests onboarding screen
- ❌ Missing: Location setup screen
- ❌ Missing: Real-time matching logic

### Architecture Translation: Firebase → Supabase

| Firebase Concept | Supabase Equivalent | Status |
|-----------------|-------------------|--------|
| Firestore collections | PostgreSQL tables | ✅ Exists |
| Firestore security rules | Row Level Security (RLS) | ✅ Basic RLS exists |
| `serverTimestamp()` | `NOW()` / `CURRENT_TIMESTAMP` | ✅ |
| Real-time listeners | Supabase Realtime | ✅ Enabled for tables |
| Geohash queries | PostGIS extension + custom functions | ⚠️ Needs implementation |
| Background location (mobile) | Browser geolocation API (web) | ✅ Implemented, throttled |

## Data Model Adaptation

### Core Interest Set (Fixed 10 options)
```typescript
export const INTEREST_OPTIONS = [
  "Coffee", "Gym", "Books", "Running", "Science",
  "Social Science", "Art", "Music", "Movies", "Outdoors"
];
```

### profiles table (Updated Schema)
```sql
-- Add fields:
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS geohash TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT TRUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarded BOOLEAN DEFAULT FALSE;

-- Add indexes:
CREATE INDEX IF NOT EXISTS idx_profiles_geohash ON profiles(geohash) WHERE is_visible = TRUE;
CREATE INDEX IF NOT EXISTS idx_profiles_location_updated ON profiles(location_updated_at);
```

### presence table (Simplified, User-Centric)
```sql
-- Rename/refactor user_presence → presence
-- Simplify to single row per user (no location_id)
CREATE TABLE IF NOT EXISTS presence (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  geohash TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### matches table (New - Core Matching Logic)
```sql
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pair_id TEXT UNIQUE NOT NULL, -- sort([uidA, uidB]).join("_")
  uid_a UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  uid_b UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_interests TEXT[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_together_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'suggested' CHECK (status IN ('suggested', 'connected', 'dismissed'))
);
```

## Migration Plan (Non-Breaking)

### Phase 1: Database Updates ✅
1. Add geohash columns to profiles & create presence table
2. Create matches table
3. Update RLS policies
4. Add PostGIS or custom geohash functions

### Phase 2: Onboarding Flow 🔄
1. Create `InterestsSetupScreen` (exactly 3 selections)
2. Create `LocationSetupScreen` (request permissions)
3. Update Auth flow to redirect to onboarding
4. Update profiles with onboarded flag

### Phase 3: Real-Time Matching 🔄
1. Refactor `useGeolocation` → continuous updates
2. Create `useNearbyMatches` hook with geohash queries
3. Implement match creation logic
4. Update Space screen with real data

### Phase 4: Background Location (Browser) 🔄
1. Implement throttled publishing (20-30m displacement)
2. Add feature flags for debug logging
3. Create developer debug panel
4. Add heartbeat for stationary detection

## Geospatial Strategy

### Geohash Implementation
- Use `ngeohash` library (npm package)
- Precision 7 (~150m) for proximity queries
- Client-side: compute geohash on each location update
- Server-side: query by geohash prefix for ~25m bounding box

### Query Flow
1. User location updates → compute geohash
2. Update `profiles.geohash` + `profiles.location_updated_at`
3. Query nearby: `SELECT * FROM profiles WHERE geohash LIKE 'prefix%' AND is_visible = TRUE`
4. Client-side: filter by Haversine distance ≤ 15m
5. Match: shared interests ≥ 1 → upsert matches table

## Privacy & Security

### Row Level Security Policies
```sql
-- profiles: read all, write self (email in auth.users only)
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- presence: read all, write self (no PII)
CREATE POLICY "presence_select" ON presence FOR SELECT TO authenticated USING (true);
CREATE POLICY "presence_upsert" ON presence FOR ALL TO authenticated USING (auth.uid() = user_id);

-- matches: read/write if member of pair
CREATE POLICY "matches_select" ON matches FOR SELECT TO authenticated 
  USING (auth.uid() = uid_a OR auth.uid() = uid_b);
CREATE POLICY "matches_upsert" ON matches FOR ALL TO authenticated 
  USING (auth.uid() = uid_a OR auth.uid() = uid_b);
```

### Data Minimization
- ❌ Never store email/phone in presence or matches
- ✅ Only store lat/lng/geohash in presence (no user metadata)
- ✅ profiles.is_visible controls discovery, NOT collection
- ✅ Background updates always run when authorized

## Background Location (Web-Based)

### Browser Geolocation API
- Continuous `watchPosition` when "Connect" is enabled
- Throttled writes: 20-30m displacement OR 60-120s interval
- High accuracy mode during active meetings
- Mock location fallback for non-HTTPS/localhost

### Target Write Rates
- Stationary: ~30-60 writes/hour/user
- Walking: ~120-240 writes/hour/user
- Max debounce: 5 seconds between updates

### Feature Flags
```typescript
export const FEATURE_FLAGS = {
  backgroundLocation: true,    // Always on when authorized
  debugPresenceLogging: true,  // Console logs for dev
  mockLocationInHttp: true     // Use Durham mock if !HTTPS
};
```

## Testing Requirements

### Unit Tests
- Interest validator (exactly 3 selections)
- Geohash bbox generation
- Haversine distance calculation
- Pair ID generator (idempotent)
- Throttle/debounce logic

### Two-Device Manual Test
1. Create 2 accounts, select overlapping interests
2. Grant location permissions on both
3. Verify presence updates (check `updated_at` in DB)
4. Move devices within 15m
5. Check matches table for auto-created match
6. Verify Nearby screen shows each other

### Battery Impact (Browser)
- Desktop: Negligible (plugged in)
- Mobile web: Monitor in Chrome DevTools → Performance
- Target: < 3-5% battery drain per hour (walking)

## Conflicts & Resolutions

### ✅ Resolved
- **user_presence table**: Keep for backward compatibility, create new `presence` table
- **connections vs matches**: Keep both - connections = completed meets, matches = suggestions
- **Firebase → Supabase**: Adapted data model, no breaking changes

### ⚠️ To Address
- **Geohash library**: Need to add `ngeohash` dependency
- **PostGIS**: Consider adding for advanced geo queries (optional optimization)
- **Realtime subscriptions**: Test load with 100+ concurrent users
- **Mock location**: Currently uses Durham, NC center - make city-agnostic

## Next Steps (Priority Order)

1. ✅ Create implementation notes (this document)
2. 🔄 Add geohash support + database migrations
3. 🔄 Create InterestsSetupScreen component
4. 🔄 Create LocationSetupScreen component
5. 🔄 Implement useNearbyMatches hook
6. 🔄 Update Space screen with real matching
7. 🔄 Add developer debug screen
8. 🔄 Create testing documentation

---

**Last Updated**: 2025-10-26
**Next Review**: After Phase 2 completion
