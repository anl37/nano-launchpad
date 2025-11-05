import { VenueSuggestion } from "@/types/connection";
import { format, parse } from "date-fns";

const DAY_MAP: Record<string, 'mon'|'tue'|'wed'|'thu'|'fri'|'sat'|'sun'> = {
  '0': 'sun',
  '1': 'mon',
  '2': 'tue',
  '3': 'wed',
  '4': 'thu',
  '5': 'fri',
  '6': 'sat',
};

/**
 * Get opening status and label for a venue
 * Returns { open: boolean, label: string }
 */
export function getVenueStatus(venue: VenueSuggestion, now = new Date()): { open: boolean; label: string } {
  if (!venue.hours) {
    return { open: false, label: "Hours unavailable" };
  }

  if (venue.hours.holidayClosedToday) {
    return { open: false, label: "Closed today" };
  }

  const dayOfWeek = DAY_MAP[now.getDay().toString()];
  const todayHours = venue.hours.weekly?.[dayOfWeek];

  if (!todayHours || todayHours.length === 0) {
    return { open: false, label: "Closed today" };
  }

  // Check if currently open in any interval
  const currentTime = format(now, 'HH:mm');
  
  for (const interval of todayHours) {
    const { open: openTime, close: closeTime } = interval;
    
    // Handle overnight intervals (e.g., 18:00-02:00)
    if (closeTime < openTime) {
      // Overnight: either currently in today's evening or tomorrow's early morning
      if (currentTime >= openTime || currentTime < closeTime) {
        const closeDisplay = format(parse(closeTime, 'HH:mm', now), 'h:mm a');
        return { open: true, label: `Open now · closes ${closeDisplay}` };
      }
    } else {
      // Normal interval
      if (currentTime >= openTime && currentTime < closeTime) {
        const closeDisplay = format(parse(closeTime, 'HH:mm', now), 'h:mm a');
        return { open: true, label: `Open now · closes ${closeDisplay}` };
      }
    }
  }

  // Not currently open - find next opening time today
  for (const interval of todayHours) {
    if (currentTime < interval.open) {
      const openDisplay = format(parse(interval.open, 'HH:mm', now), 'h:mm a');
      return { open: false, label: `Closed · opens ${openDisplay}` };
    }
  }

  return { open: false, label: "Closed · opens tomorrow" };
}

/**
 * Normalize venue category to type
 */
export function normalizeVenueType(category: string): string {
  const lower = category.toLowerCase();
  
  if (lower.includes('coffee') || lower.includes('café') || lower.includes('cafe')) {
    return 'coffee';
  }
  if (lower.includes('stadium') || lower.includes('arena') || lower.includes('sport')) {
    return 'stadium';
  }
  if (lower.includes('garden') || lower.includes('park')) {
    return 'garden';
  }
  if (lower.includes('sight') || lower.includes('landmark') || lower.includes('museum')) {
    return 'sight';
  }
  if (lower.includes('bar') || lower.includes('lounge') || lower.includes('hangout')) {
    return 'hangout';
  }
  if (lower.includes('restaurant') || lower.includes('food') || lower.includes('dining')) {
    return 'restaurant';
  }
  if (lower.includes('study') || lower.includes('library') || lower.includes('cowork')) {
    return 'study';
  }
  if (lower.includes('shop') || lower.includes('mall') || lower.includes('retail')) {
    return 'shopping';
  }
  
  return 'default';
}
