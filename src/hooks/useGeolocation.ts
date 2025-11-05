import { useState, useEffect, useRef, useCallback } from 'react';
import { DEFAULT_CITY_CENTER } from '@/config/city';

export type LocationStatus = 'live' | 'paused' | 'denied' | 'error' | 'unsupported';

export interface GeolocationData {
  lat: number;
  lng: number;
  accuracy: number;
  speed: number | null;
  heading: number | null;
  timestamp: number;
}

interface UseGeolocationOptions {
  enabled?: boolean;
  highAccuracy?: boolean;
  maximumAge?: number;
  timeout?: number;
  onUpdate?: (location: GeolocationData) => void;
}

export const useGeolocation = (options: UseGeolocationOptions = {}) => {
  const {
    enabled = true,
    highAccuracy = false,
    maximumAge = 0,
    timeout = 10000,
    onUpdate,
  } = options;

  // Check if we're in a limited environment (web/preview)
  const isLimitedEnv = typeof window !== 'undefined' && 
    (!window.isSecureContext || window.location.protocol !== 'https:');

  const [location, setLocation] = useState<GeolocationData | null>(
    isLimitedEnv
      ? {
          lat: DEFAULT_CITY_CENTER.lat,
          lng: DEFAULT_CITY_CENTER.lng,
          accuracy: 30,
          speed: null,
          heading: null,
          timestamp: Date.now(),
        }
      : null
  );
  const [status, setStatus] = useState<LocationStatus>(isLimitedEnv ? 'live' : 'paused');
  const [error, setError] = useState<string | null>(null);
  const [isMockLocation, setIsMockLocation] = useState(isLimitedEnv);
  const watchIdRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);

  const handleSuccess = useCallback(
    (position: GeolocationPosition) => {
      const now = Date.now();
      
      // Throttle to max 1 update per 5 seconds
      if (now - lastUpdateRef.current < 5000) {
        return;
      }

      const locationData: GeolocationData = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        speed: position.coords.speed,
        heading: position.coords.heading,
        timestamp: position.timestamp,
      };

      lastUpdateRef.current = now;
      setLocation(locationData);
      setStatus('live');
      setError(null);
      onUpdate?.(locationData);
    },
    [onUpdate]
  );

  const handleError = useCallback((err: GeolocationPositionError) => {
    console.error('Geolocation error:', err);
    
    switch (err.code) {
      case err.PERMISSION_DENIED:
        setStatus('denied');
        setError('Location permission denied');
        break;
      case err.POSITION_UNAVAILABLE:
        setStatus('error');
        setError('Location unavailable');
        break;
      case err.TIMEOUT:
        setStatus('error');
        setError('Location request timeout');
        break;
      default:
        setStatus('error');
        setError('Unknown location error');
    }
  }, []);

  const startTracking = useCallback(() => {
    // In limited env, use mock location
    if (isLimitedEnv) {
      const jitter = () => (Math.random() - 0.5) * 0.002;
      setLocation({
        lat: DEFAULT_CITY_CENTER.lat + jitter(),
        lng: DEFAULT_CITY_CENTER.lng + jitter(),
        accuracy: 30,
        speed: null,
        heading: null,
        timestamp: Date.now(),
      });
      setStatus('live');
      setIsMockLocation(true);
      return;
    }

    if (!navigator.geolocation) {
      setStatus('unsupported');
      setError('Geolocation not supported');
      setIsMockLocation(false);
      return;
    }

    if (watchIdRef.current !== null) {
      return; // Already tracking
    }

    const geoOptions: PositionOptions = {
      enableHighAccuracy: highAccuracy,
      maximumAge,
      timeout,
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      geoOptions
    );

    setStatus('live');
  }, [highAccuracy, maximumAge, timeout, handleSuccess, handleError]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setStatus('paused');
  }, []);

  const toggleTracking = useCallback(() => {
    if (status === 'live') {
      stopTracking();
    } else {
      startTracking();
    }
  }, [status, startTracking, stopTracking]);

  useEffect(() => {
    if (enabled) {
      startTracking();
    } else {
      stopTracking();
    }

    return () => {
      stopTracking();
    };
  }, [enabled, startTracking, stopTracking]);

  return {
    location,
    status,
    error,
    isMockLocation,
    startTracking,
    stopTracking,
    toggleTracking,
  };
};
