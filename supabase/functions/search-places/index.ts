import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchPlacesRequest {
  lat: number;
  lng: number;
  interests: string[];
  radius?: number;
}

// Map interests to Google Places types with expanded categories
function getPlaceTypesFromInterests(interests: string[]): string[] {
  const typeMapping: Record<string, string[]> = {
    coffee: ['cafe', 'coffee_shop', 'bakery'],
    tea: ['cafe', 'tea_house'],
    reading: ['library', 'book_store', 'cafe'],
    books: ['book_store', 'library'],
    nature: ['park', 'hiking_area', 'garden'],
    food: ['restaurant', 'cafe', 'meal_takeaway'],
    drinks: ['bar', 'night_club', 'liquor_store'],
    beer: ['bar', 'brewery'],
    wine: ['bar', 'wine_bar'],
    art: ['art_gallery', 'museum', 'cultural_center'],
    fitness: ['gym', 'fitness_center', 'spa'],
    yoga: ['gym', 'spa', 'park'],
    music: ['night_club', 'music_venue', 'bar'],
    shopping: ['shopping_mall', 'store', 'clothing_store'],
    sports: ['stadium', 'sports_complex', 'park'],
    gaming: ['arcade', 'game_store', 'entertainment'],
    history: ['museum', 'historical_landmark', 'tourist_attraction'],
  };

  const types = new Set<string>();
  interests.forEach(interest => {
    const mapped = typeMapping[interest.toLowerCase()];
    if (mapped) {
      mapped.forEach(t => types.add(t));
    }
  });

  // Default to popular hangout spots if no specific mapping
  if (types.size === 0) {
    types.add('restaurant');
    types.add('cafe');
    types.add('bar');
  }

  return Array.from(types);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    
    if (!apiKey) {
      console.error('GOOGLE_MAPS_API_KEY environment variable is not set');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { lat, lng, interests, radius = 1000 }: SearchPlacesRequest = await req.json();
    
    if (!lat || !lng || !interests || interests.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: lat, lng, interests' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Searching places at ${lat},${lng} with interests:`, interests);

    const placeTypes = getPlaceTypesFromInterests(interests);
    console.log('Mapped to place types:', placeTypes);

    // Search for places of different types
    const allPlaces = new Map();
    const maxPerType = 5; // Limit per type to get variety

    for (const type of placeTypes) {
      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${type}&key=${apiKey}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === 'OK' && data.results) {
        console.log(`Found ${data.results.length} places for type: ${type}`);
        
        // Take top rated places per type for variety
        data.results
          .sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0))
          .slice(0, maxPerType)
          .forEach((place: any) => {
            if (!allPlaces.has(place.place_id) && place.rating && place.rating > 3.5) {
              allPlaces.set(place.place_id, {
                id: place.place_id,
                name: place.name,
                category: place.types?.[0] || 'place',
                lat: place.geometry.location.lat,
                lng: place.geometry.location.lng,
                rating: place.rating || 0,
                openNow: place.opening_hours?.open_now,
                vicinity: place.vicinity,
                types: place.types || [],
              });
            }
          });
      }
    }

    // Convert to array, sort by rating and open status, take top 10
    let places = Array.from(allPlaces.values())
      .sort((a, b) => {
        // Prioritize open places
        if (a.openNow !== b.openNow) {
          return (b.openNow ? 1 : 0) - (a.openNow ? 1 : 0);
        }
        // Then by rating
        return b.rating - a.rating;
      })
      .slice(0, 10);

    console.log(`Returning ${places.length} unique places`);

    return new Response(
      JSON.stringify({ places }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
    
  } catch (error) {
    console.error('Error in search-places function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
