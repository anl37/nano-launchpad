/**
 * Fixed set of 10 interest options for Spotmate
 * Users must select exactly 3 during onboarding
 */

export const INTEREST_OPTIONS = [
  "Coffee",
  "Gym",
  "Books",
  "Running",
  "Science",
  "Social Science",
  "Art",
  "Music",
  "Movies",
  "Outdoors",
] as const;

export type Interest = typeof INTEREST_OPTIONS[number];

/**
 * Validate that exactly 3 interests are selected
 */
export function validateInterests(interests: string[]): { valid: boolean; error?: string } {
  if (interests.length !== 3) {
    return { valid: false, error: `Please select exactly 3 interests (you have ${interests.length})` };
  }
  
  const validInterests = interests.every(i => INTEREST_OPTIONS.includes(i as Interest));
  if (!validInterests) {
    return { valid: false, error: 'Invalid interest selection' };
  }
  
  return { valid: true };
}

/**
 * Get emoji for interest
 */
export function getInterestEmoji(interest: string): string {
  const emojiMap: Record<string, string> = {
    Coffee: "☕",
    Gym: "💪",
    Books: "📚",
    Running: "🏃",
    Science: "🔬",
    "Social Science": "🧠",
    Art: "🎨",
    Music: "🎵",
    Movies: "🎬",
    Outdoors: "🌲",
  };
  
  return emojiMap[interest] || "✨";
}

/**
 * Find common interests between two users
 */
export function getCommonInterests(interests1: string[], interests2: string[]): string[] {
  return interests1.filter(i => interests2.includes(i));
}
