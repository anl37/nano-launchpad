/**
 * Generate contextual meeting landmarks based on venue type
 */
export function generateContextualLandmark(venueName: string, venueTypes?: string[]): string {
  const name = venueName.toLowerCase();
  const types = venueTypes?.map(t => t.toLowerCase()) || [];
  
  // Dorms and residential
  if (name.includes('dorm') || name.includes('residence') || name.includes('hall') || 
      types.includes('lodging') || types.includes('housing')) {
    return 'Main lobby entrance';
  }
  
  // Coffee shops and cafes
  if (name.includes('coffee') || name.includes('cafe') || name.includes('espresso') ||
      types.includes('cafe') || types.includes('coffee_shop')) {
    return 'Front entrance';
  }
  
  // Gyms and fitness
  if (name.includes('gym') || name.includes('fitness') || name.includes('recreation') ||
      types.includes('gym') || types.includes('health')) {
    return 'Check-in desk';
  }
  
  // Libraries
  if (name.includes('library') || types.includes('library')) {
    return 'Main entrance';
  }
  
  // Restaurants and dining
  if (name.includes('restaurant') || name.includes('dining') || name.includes('grill') ||
      types.includes('restaurant') || types.includes('food')) {
    return 'Host stand';
  }
  
  // Bars and lounges
  if (name.includes('bar') || name.includes('pub') || name.includes('lounge') ||
      types.includes('bar') || types.includes('night_club')) {
    return 'Bar entrance';
  }
  
  // Parks and outdoor spaces
  if (name.includes('park') || name.includes('garden') || name.includes('quad') ||
      types.includes('park')) {
    return 'Main path entrance';
  }
  
  // Academic buildings
  if (name.includes('building') || name.includes('center') || name.includes('hall') ||
      types.includes('university') || types.includes('school')) {
    return 'Main entrance lobby';
  }
  
  // Default
  return 'Main entrance';
}

/**
 * Generate random emoji codes for meeting identification
 */
export function generateEmojiCodes(): string {
  const emojis = ["🐱", "☕", "🌿", "🪩", "🎨", "📚", "🎵", "🏃", "🧘", "🍕", "🌟", "🎯", "🌈", "⚡", "🔥"];
  const emoji1 = emojis[Math.floor(Math.random() * emojis.length)];
  const emoji2 = emojis[Math.floor(Math.random() * emojis.length)];
  return `${emoji1}${emoji2}`;
}

/**
 * Generate random meet code
 */
export function generateMeetCode(): string {
  return `MEET${Math.floor(1000 + Math.random() * 9000)}`;
}
