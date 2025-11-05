import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { GeolocationData } from './useGeolocation';
import { distanceMeters, generatePairId, getGeohashNeighbors, toGeohash } from '@/lib/geo';
import { getCommonInterests } from '@/config/interests';
import { FEATURE_FLAGS } from '@/config/featureFlags';

export interface NearbyUser {
  id: string;
  name: string;
  interests: string[];
  lat: number;
  lng: number;
  distance: number;
  sharedInterests: string[];
  emoji_signature?: string;
  avatar_url?: string;
  compatibilityScore?: number;
}

interface UseNearbyMatchesOptions {
  location: GeolocationData | null;
  enabled: boolean;
}

/**
 * Hook to find and match with nearby users
 * - Queries by geohash for efficiency
 * - Filters by distance (≤100m default)
 * - Requires ≥1 shared interest
 * - Auto-creates matches when criteria met
 */
export const useNearbyMatches = ({ location, enabled }: UseNearbyMatchesOptions) => {
  const { user } = useAuth();
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [myInterests, setMyInterests] = useState<string[]>([]);

  // Load user's own interests
  useEffect(() => {
    if (!user) return;

    const loadMyInterests = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('interests')
        .eq('id', user.id)
        .single();

      if (!error && data) {
        setMyInterests(data.interests || []);
      }
    };

    loadMyInterests();
  }, [user]);

  // Note: Matches are now created only via connection requests, not automatically

  // Query nearby users
  const queryNearby = useCallback(async () => {
    if (!location || !user || !enabled || myInterests.length === 0) {
      setNearbyUsers([]);
      return;
    }

    setLoading(true);
    try {
      // Calculate geohash from current location coordinates (use precision 6 for 100m matching)
      const myGeohash = toGeohash(location.lat, location.lng, 6);
      const neighbors = getGeohashNeighbors(myGeohash);

      // Query profiles with nearby geohash
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, name, interests, lat, lng, geohash, emoji_signature, avatar_url, is_visible, onboarded')
        .neq('id', user.id) // Exclude self
        .eq('is_visible', true)
        .eq('onboarded', true)
        .in('geohash', neighbors);

      if (error) {
        console.error('[Nearby] Query error:', error);
        return;
      }

      if (!profiles || profiles.length === 0) {
        setNearbyUsers([]);
        return;
      }

      // Filter by precise distance and shared interests
      const nearby: NearbyUser[] = [];

      for (const profile of profiles) {
        if (!profile.lat || !profile.lng || !profile.interests) continue;

        // Calculate exact distance
        const distance = distanceMeters(location.lat, location.lng, profile.lat, profile.lng);

        // Must be within maxMatchDistanceMeters
        if (distance > FEATURE_FLAGS.maxMatchDistanceMeters) {
          continue;
        }

        // Must share at least 1 interest
        const sharedInterests = getCommonInterests(myInterests, profile.interests);
        if (sharedInterests.length === 0) {
          continue;
        }

        // Calculate adaptive compatibility score
        let compatibilityScore: number | undefined;
        try {
          const { data } = await supabase.functions.invoke('calculate-compatibility', {
            body: { targetUserId: profile.id },
          });
          compatibilityScore = data?.score;
        } catch (err) {
          console.error('[Nearby] Compatibility calculation failed:', err);
        }

        nearby.push({
          id: profile.id,
          name: profile.name,
          interests: profile.interests,
          lat: profile.lat,
          lng: profile.lng,
          distance,
          sharedInterests,
          emoji_signature: profile.emoji_signature || undefined,
          avatar_url: profile.avatar_url || undefined,
          compatibilityScore,
        });
      }

      // Sort by compatibility score (if available), then by distance
      nearby.sort((a, b) => {
        if (a.compatibilityScore !== undefined && b.compatibilityScore !== undefined) {
          return b.compatibilityScore - a.compatibilityScore;
        }
        return a.distance - b.distance;
      });

      setNearbyUsers(nearby);
    } catch (error) {
      console.error('[Nearby] Unexpected error:', error);
    } finally {
      setLoading(false);
    }
  }, [location, user, enabled, myInterests]);

  // Query on location change
  useEffect(() => {
    queryNearby();

    // Refresh every 30 seconds
    const interval = setInterval(queryNearby, 30000);

    return () => clearInterval(interval);
  }, [queryNearby]);

  // Subscribe to presence changes for real-time updates
  useEffect(() => {
    if (!enabled || !user) return;

    const channel = supabase
      .channel('presence-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'presence',
        },
        () => {
          // Refetch nearby users when presence changes
          queryNearby();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, user, queryNearby]);

  return {
    nearbyUsers,
    loading,
    refetch: queryNearby,
  };
};
