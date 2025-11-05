import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { GeolocationData } from './useGeolocation';
import { toGeohash, distanceMeters } from '@/lib/geo';
import { FEATURE_FLAGS } from '@/config/featureFlags';

interface UsePresenceUpdatesOptions {
  enabled: boolean;
  location: GeolocationData | null;
}

interface PingBuffer {
  location: GeolocationData;
  timestamp: number;
  confidence: number;
}

/**
 * Hook to manage presence updates with intelligent throttling
 * Publishes to Supabase when:
 * - Moved ≥ minDisplacementMeters
 * - ≥ minInterval seconds elapsed
 * - First update after enabling
 */
export const usePresenceUpdates = ({ enabled, location }: UsePresenceUpdatesOptions) => {
  const { user } = useAuth();
  const lastPublishedRef = useRef<{
    lat: number;
    lng: number;
    timestamp: number;
  } | null>(null);
  const publishTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingBufferRef = useRef<PingBuffer[]>([]);
  const batchTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate confidence based on GPS accuracy and speed
  const calculateConfidence = useCallback((locationData: GeolocationData): number => {
    let confidence = 1.0;
    
    // Reduce confidence for poor GPS accuracy
    if (locationData.accuracy > 100) {
      confidence *= 0.5;
    } else if (locationData.accuracy > 50) {
      confidence *= 0.7;
    } else if (locationData.accuracy > 20) {
      confidence *= 0.9;
    }
    
    // Reduce confidence if moving fast (less stable readings)
    const speed = locationData.speed ?? 0;
    if (speed > 5) { // > 18 km/h
      confidence *= 0.8;
    }
    
    return Math.max(0.1, Math.min(1.0, confidence));
  }, []);

  // Deduplicate: check if ping is too similar to recent pings
  const isDuplicate = useCallback((newLocation: GeolocationData): boolean => {
    const recent = pingBufferRef.current.slice(-3);
    for (const buffered of recent) {
      const distance = distanceMeters(
        buffered.location.lat,
        buffered.location.lng,
        newLocation.lat,
        newLocation.lng
      );
      const timeDiff = Math.abs(Date.now() - buffered.timestamp) / 1000;
      
      // If within 10m and within 30 seconds, it's a duplicate
      if (distance < 10 && timeDiff < 30) {
        return true;
      }
    }
    return false;
  }, []);

  const shouldPublish = useCallback((newLocation: GeolocationData): boolean => {
    if (!lastPublishedRef.current) {
      // First update, always publish
      return true;
    }

    const { lat: lastLat, lng: lastLng, timestamp: lastTime } = lastPublishedRef.current;
    const now = Date.now();
    const timeSinceLastPublish = (now - lastTime) / 1000; // seconds

    // Check displacement
    const displacement = distanceMeters(lastLat, lastLng, newLocation.lat, newLocation.lng);

    // Determine if user is stationary
    const isStationary = (newLocation.speed ?? 0) < FEATURE_FLAGS.locationThrottle.stationarySpeedThreshold;

    const minInterval = isStationary 
      ? FEATURE_FLAGS.locationThrottle.minIntervalStationarySeconds
      : FEATURE_FLAGS.locationThrottle.minIntervalMovingSeconds;

    // Publish if moved enough OR enough time has passed
    if (displacement >= FEATURE_FLAGS.locationThrottle.minDisplacementMeters) {
      if (FEATURE_FLAGS.debugPresenceLogging) {
        console.log('[Presence] Publishing due to displacement:', {
          displacement: displacement.toFixed(1),
          threshold: FEATURE_FLAGS.locationThrottle.minDisplacementMeters,
        });
      }
      return true;
    }

    if (timeSinceLastPublish >= minInterval) {
      if (FEATURE_FLAGS.debugPresenceLogging) {
        console.log('[Presence] Publishing due to time interval:', {
          elapsed: timeSinceLastPublish.toFixed(0),
          threshold: minInterval,
          state: isStationary ? 'stationary' : 'moving',
        });
      }
      return true;
    }

    return false;
  }, []);

  const publishPresence = useCallback(async (locationData: GeolocationData) => {
    if (!user) return;

    const geohash = toGeohash(locationData.lat, locationData.lng);

    try {
      // Update presence table (single row per user)
      const { error: presenceError } = await supabase
        .from('presence')
        .upsert({
          user_id: user.id,
          lat: locationData.lat,
          lng: locationData.lng,
          geohash: geohash,
          updated_at: new Date().toISOString(),
        });

      if (presenceError) {
        console.error('[Presence] Error updating presence:', presenceError);
        return;
      }

      // Also update profile location (for historical tracking)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          lat: locationData.lat,
          lng: locationData.lng,
          geohash: geohash,
          location_accuracy: locationData.accuracy,
          location_updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (profileError) {
        console.error('[Presence] Error updating profile location:', profileError);
      }

      // Update last published reference
      lastPublishedRef.current = {
        lat: locationData.lat,
        lng: locationData.lng,
        timestamp: Date.now(),
      };

      if (FEATURE_FLAGS.debugPresenceLogging) {
        console.log('[Presence] Published:', {
          lat: locationData.lat.toFixed(6),
          lng: locationData.lng.toFixed(6),
          geohash,
          accuracy: locationData.accuracy,
        });
      }
    } catch (error) {
      console.error('[Presence] Unexpected error:', error);
    }
  }, [user]);

  // Batch publish buffered pings
  const publishBatch = useCallback(async () => {
    if (pingBufferRef.current.length === 0 || !user) return;

    const batch = [...pingBufferRef.current];
    pingBufferRef.current = [];

    // Use most recent ping for presence update
    const latest = batch[batch.length - 1];
    const geohash = toGeohash(latest.location.lat, latest.location.lng);

    try {
      // Update presence table
      const { error: presenceError } = await supabase
        .from('presence')
        .upsert({
          user_id: user.id,
          lat: latest.location.lat,
          lng: latest.location.lng,
          geohash: geohash,
          updated_at: new Date().toISOString(),
        });

      if (presenceError) {
        console.error('[Presence] Batch error:', presenceError);
        return;
      }

      // Update profile location
      await supabase
        .from('profiles')
        .update({
          lat: latest.location.lat,
          lng: latest.location.lng,
          geohash: geohash,
          location_accuracy: latest.location.accuracy,
          location_updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      lastPublishedRef.current = {
        lat: latest.location.lat,
        lng: latest.location.lng,
        timestamp: Date.now(),
      };

      if (FEATURE_FLAGS.debugPresenceLogging) {
        console.log(`[Presence] Published batch of ${batch.length} pings`, {
          avgConfidence: (batch.reduce((sum, p) => sum + p.confidence, 0) / batch.length).toFixed(2),
        });
      }
    } catch (error) {
      console.error('[Presence] Batch publish error:', error);
    }
  }, [user]);

  // Main effect: handle location updates with batching
  useEffect(() => {
    if (!enabled || !location || !user) {
      return;
    }

    // Skip duplicates
    if (isDuplicate(location)) {
      return;
    }

    // Calculate confidence
    const confidence = calculateConfidence(location);

    // Add to buffer
    pingBufferRef.current.push({
      location,
      timestamp: Date.now(),
      confidence,
    });

    // Keep buffer size reasonable
    if (pingBufferRef.current.length > 10) {
      pingBufferRef.current.shift();
    }

    // Clear existing batch timer
    if (batchTimerRef.current) {
      clearTimeout(batchTimerRef.current);
    }

    // Check if should publish immediately
    if (shouldPublish(location)) {
      publishBatch();
    } else {
      // Otherwise, schedule batch publish in 30 seconds
      batchTimerRef.current = setTimeout(() => {
        publishBatch();
      }, 30000);
    }

    return () => {
      if (batchTimerRef.current) {
        clearTimeout(batchTimerRef.current);
      }
    };
  }, [enabled, location, user, shouldPublish, isDuplicate, calculateConfidence, publishBatch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (batchTimerRef.current) {
        clearTimeout(batchTimerRef.current);
      }
      // Flush any remaining pings
      if (pingBufferRef.current.length > 0) {
        publishBatch();
      }
    };
  }, [publishBatch]);

  return {
    lastPublished: lastPublishedRef.current,
  };
};
