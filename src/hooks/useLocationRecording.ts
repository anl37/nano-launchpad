import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GeolocationData } from './useGeolocation';
import { useAuth } from './useAuth';
import { getCurrentTimezone } from '@/lib/timezone-utils';

interface UseLocationRecordingOptions {
  location: GeolocationData | null;
  enabled: boolean;
}

/**
 * Records user location visits in the background to build activity patterns
 * Calls the record-location edge function periodically with timezone info
 */
export const useLocationRecording = ({ location, enabled }: UseLocationRecordingOptions) => {
  const { user } = useAuth();
  const lastRecordedRef = useRef<number>(0);
  const recordingRef = useRef<boolean>(false);

  useEffect(() => {
    if (!enabled || !user || !location || recordingRef.current) {
      return;
    }

    const now = Date.now();
    // Record location every 5 minutes
    if (now - lastRecordedRef.current < 5 * 60 * 1000) {
      return;
    }

    const recordLocation = async () => {
      recordingRef.current = true;
      try {
        // Detect timezone from location
        const timezone = await getCurrentTimezone(location.lat, location.lng);
        
        // Calculate confidence based on GPS accuracy
        let confidence = 1.0;
        if (location.accuracy > 100) {
          confidence = 0.5;
        } else if (location.accuracy > 50) {
          confidence = 0.7;
        } else if (location.accuracy > 20) {
          confidence = 0.9;
        }
        
        const { error } = await supabase.functions.invoke('record-location', {
          body: {
            latitude: location.lat,
            longitude: location.lng,
            timestamp_utc: new Date().toISOString(),
            user_timezone_at_event: timezone,
            confidence: confidence,
          },
        });

        if (error) {
          console.error('[LocationRecording] Error:', error);
        } else {
          lastRecordedRef.current = now;
          console.log(`[LocationRecording] Logged at ${timezone} (confidence: ${confidence.toFixed(2)})`);
        }
      } catch (err) {
        console.error('[LocationRecording] Exception:', err);
      } finally {
        recordingRef.current = false;
      }
    };

    recordLocation();
  }, [location, enabled, user]);
};
