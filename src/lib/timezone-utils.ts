/**
 * Timezone detection and conversion utilities
 * Detects IANA timezone from lat/lng with fallbacks
 */

/**
 * Get IANA timezone from coordinates using Google TimeZone API
 */
export async function getTimezoneFromCoords(
  lat: number,
  lng: number
): Promise<string> {
  try {
    // Try browser's timezone first as a quick check
    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // For production, you would call Google TimeZone API here
    // For now, use a simple heuristic based on longitude
    const timezone = estimateTimezoneFromLongitude(lng);
    
    console.log(`[Timezone] Detected: ${timezone} (browser: ${browserTz})`);
    return timezone;
  } catch (error) {
    console.error('[Timezone] Detection failed:', error);
    // Fallback to browser timezone
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
}

/**
 * Estimate timezone from longitude (rough approximation)
 * This is a fallback - production should use Google TimeZone API
 */
function estimateTimezoneFromLongitude(lng: number): string {
  // US timezones (rough longitude boundaries)
  if (lng >= -75) return 'America/New_York';      // Eastern: -75° to -60°
  if (lng >= -90) return 'America/Chicago';       // Central: -90° to -75°
  if (lng >= -115) return 'America/Denver';       // Mountain: -115° to -90°
  if (lng >= -125) return 'America/Los_Angeles';  // Pacific: -125° to -115°
  
  // Default fallback
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

/**
 * Get current timezone (with caching)
 */
let cachedTimezone: string | null = null;
let cachedCoords: { lat: number; lng: number } | null = null;

export async function getCurrentTimezone(
  lat?: number,
  lng?: number
): Promise<string> {
  // If coords provided and changed significantly (>50km), refresh
  if (lat !== undefined && lng !== undefined) {
    if (
      !cachedCoords ||
      Math.abs(cachedCoords.lat - lat) > 0.5 ||
      Math.abs(cachedCoords.lng - lng) > 0.5
    ) {
      cachedTimezone = await getTimezoneFromCoords(lat, lng);
      cachedCoords = { lat, lng };
    }
  }
  
  // Return cached or get browser timezone
  return cachedTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

/**
 * Convert UTC timestamp to local time string in a specific timezone
 */
export function formatInTimezone(
  utcTimestamp: string | Date,
  timezone: string,
  formatStr: string = 'PPpp'
): string {
  try {
    const date = typeof utcTimestamp === 'string' ? new Date(utcTimestamp) : utcTimestamp;
    
    // Use Intl.DateTimeFormat for timezone conversion
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    
    return formatter.format(date);
  } catch (error) {
    console.error('[Timezone] Format error:', error);
    return new Date(utcTimestamp).toLocaleString();
  }
}

/**
 * Get local time components from UTC timestamp in a specific timezone
 */
export function getLocalTimeComponents(
  utcTimestamp: string | Date,
  timezone: string
): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  dayOfWeek: string;
} {
  const date = typeof utcTimestamp === 'string' ? new Date(utcTimestamp) : utcTimestamp;
  
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    weekday: 'long',
    hour12: false,
  });
  
  const parts = formatter.formatToParts(date);
  const get = (type: string) => parts.find(p => p.type === type)?.value || '0';
  
  return {
    year: parseInt(get('year')),
    month: parseInt(get('month')),
    day: parseInt(get('day')),
    hour: parseInt(get('hour')),
    minute: parseInt(get('minute')),
    dayOfWeek: get('weekday'),
  };
}
