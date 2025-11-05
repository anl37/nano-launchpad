import { DURHAM_RECS } from "@/config/city";
import { VenueSuggestion } from "@/types/connection";
import { getCategoriesForInterests, getTagsForInterests } from "./interest-utils";

interface MatchingParams {
  userInterests: string[];
  connectionInterests: string[];
  maxResults?: number;
}

export function getPersonalizedVenues({
  userInterests,
  connectionInterests,
  maxResults = 10,
}: MatchingParams): VenueSuggestion[] {
  // Combine interests from both users
  const combinedInterests = [...new Set([...userInterests, ...connectionInterests])];
  const targetCategories = getCategoriesForInterests(combinedInterests);
  const suggestedTags = getTagsForInterests(combinedInterests);

  // Score and filter venues
  const scoredVenues = DURHAM_RECS.map((venue) => {
    let score = 0;
    const venueCategoryLower = venue.category.toLowerCase();

    // Category match (40 points)
    if (targetCategories.some(cat => venueCategoryLower.includes(cat))) {
      score += 40;
      // Extra points if both users share this interest
      const matchesBothInterests = userInterests.some(ui => 
        connectionInterests.some(ci => 
          getCategoriesForInterests([ui]).some(c => venueCategoryLower.includes(c)) &&
          getCategoriesForInterests([ci]).some(c => venueCategoryLower.includes(c))
        )
      );
      if (matchesBothInterests) score += 10;
    }

    // Rating (30 points)
    const rating = 4.2 + Math.random() * 0.6;
    score += (rating / 5) * 30;

    // Distance (20 points) - closer is better
    const distanceM = Math.floor(Math.random() * 800) + 150;
    const distanceScore = Math.max(0, 20 - (distanceM / 800) * 20);
    score += distanceScore;

    // Open now bonus (10 points)
    const openNow = Math.random() > 0.2;
    if (openNow) score += 10;

    return {
      id: venue.id,
      name: venue.name,
      category: venue.category,
      lat: venue.lat,
      lng: venue.lng,
      distanceM,
      matchScore: Math.round(score),
      tags: suggestedTags.slice(0, 3),
      openNow,
      opensAt: !openNow ? { hour: 17, minute: 0 } : undefined,
      rating,
      description: `Great spot in Durham`,
    };
  });

  // Sort by score and return top results
  return scoredVenues
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, maxResults);
}
