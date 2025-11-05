/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in meters
 */
export function metersBetween(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Format distance for display
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    // Round to nearest 10m
    return `~${Math.round(meters / 10) * 10} m`;
  }
  // Round to 1 decimal for km
  return `~${(meters / 1000).toFixed(1)} km`;
}

/**
 * Mock user location (replace with actual geolocation in production)
 */
export function getMockUserLocation() {
  return {
    lat: 40.7580,
    lng: -73.9855,
    accuracy: 12
  };
}

/**
 * Get emoji for venue category
 */
function getCategoryEmoji(category: string): string {
  const categoryLower = category.toLowerCase();
  
  if (categoryLower.includes('café') || categoryLower.includes('coffee')) return '☕';
  if (categoryLower.includes('restaurant')) return '🍽️';
  if (categoryLower.includes('bar') || categoryLower.includes('brewery')) return '🍺';
  if (categoryLower.includes('park') || categoryLower.includes('garden')) return '🌳';
  if (categoryLower.includes('museum') || categoryLower.includes('gallery')) return '🎨';
  if (categoryLower.includes('library')) return '📚';
  if (categoryLower.includes('gym')) return '💪';
  if (categoryLower.includes('music')) return '🎵';
  if (categoryLower.includes('shopping')) return '🛍️';
  if (categoryLower.includes('market')) return '🛒';
  if (categoryLower.includes('dessert') || categoryLower.includes('ice cream')) return '🍨';
  if (categoryLower.includes('historic')) return '🏛️';
  if (categoryLower.includes('stadium')) return '🏟️';
  if (categoryLower.includes('mixed-use') || categoryLower.includes('hangout')) return '🏢';
  
  return '📍';
}

/**
 * Find the nearest venue from a list of venues
 */
export function findNearestVenue(
  userLat: number,
  userLng: number,
  venues: Array<{ id: string; name: string; lat: number; lng: number; category: string; landmarks?: string[] }>,
  maxDistanceMeters: number = 150
): { name: string; emoji: string; distance: number } | null {
  let nearestVenue: { name: string; emoji: string; distance: number } | null = null;
  let minDistance = Infinity;

  for (const venue of venues) {
    const distance = metersBetween(userLat, userLng, venue.lat, venue.lng);
    
    if (distance < minDistance && distance <= maxDistanceMeters) {
      minDistance = distance;
      nearestVenue = {
        name: venue.name,
        emoji: getCategoryEmoji(venue.category),
        distance: distance,
      };
    }
  }

  return nearestVenue;
}
