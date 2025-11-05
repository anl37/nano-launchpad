import { formatDistanceToNow, format, isToday, isYesterday, isTomorrow } from "date-fns";
import { formatInTimezone, getCurrentTimezone } from "./timezone-utils";

/**
 * Format a timestamp as relative time (Now, 1m ago, Today 6:12 PM, etc.)
 * Uses current user's timezone for display
 */
export function relativeTime(timestamp: Date | string | number, timezone?: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "Now";
  if (diffMin < 60) return `${diffMin}m ago`;
  
  if (isToday(date)) {
    return `Today ${format(date, 'h:mm a')}`;
  }
  if (isYesterday(date)) {
    return `Yesterday ${format(date, 'h:mm a')}`;
  }
  
  return format(date, 'MMM d, h:mm a');
}

/**
 * Format a timestamp in a specific timezone
 */
export async function relativeTimeInTimezone(
  timestamp: Date | string | number,
  timezone?: string
): Promise<string> {
  const tz = timezone || await getCurrentTimezone();
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "Now";
  if (diffMin < 60) return `${diffMin}m ago`;
  
  return formatInTimezone(date, tz);
}

/**
 * Format a future timestamp (for meet plans)
 */
export function formatMeetTime(timestamp: Date | string | number): string {
  const date = new Date(timestamp);
  
  if (isToday(date)) {
    return `Today ${format(date, 'h:mm a')}`;
  }
  if (isTomorrow(date)) {
    return `Tomorrow ${format(date, 'h:mm a')}`;
  }
  
  return format(date, 'EEE, MMM d • h:mm a');
}

/**
 * Get current time formatted for header
 */
export function getCurrentTime(): string {
  return format(new Date(), 'h:mm a');
}

/**
 * Format opening hours
 */
export function formatOpeningTime(hour: number, minute: number = 0): string {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return format(date, 'h:mm a');
}
