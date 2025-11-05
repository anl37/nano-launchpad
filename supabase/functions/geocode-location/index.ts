import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GeocodeRequest {
  lat: number;
  lng: number;
}

interface GeocodeResponse {
  name: string;
  emoji: string;
}

function getEmojiForPlaceType(types: string[]): string {
  const typeMap: Record<string, string> = {
    cafe: '☕',
    restaurant: '🍽️',
    bar: '🍺',
    park: '🌳',
    museum: '🎨',
    library: '📚',
    gym: '💪',
    shopping_mall: '🛍️',
    store: '🏪',
    bakery: '🥐',
    book_store: '📚',
    stadium: '🏟️',
    university: '🎓',
    school: '🏫',
    church: '⛪',
    hospital: '🏥',
    pharmacy: '💊',
    bank: '🏦',
    atm: '💳',
    lodging: '🏨',
    movie_theater: '🎬',
    night_club: '🎉',
    point_of_interest: '⭐',
  };
  
  for (const type of types) {
    if (typeMap[type]) {
      return typeMap[type];
    }
  }
  
  return '📍';
}

serve(async (req) => {
  // Handle CORS preflight requests
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

    const { lat, lng }: GeocodeRequest = await req.json();
    
    if (!lat || !lng) {
      console.error('Missing lat or lng parameters');
      return new Response(
        JSON.stringify({ error: 'Missing lat or lng parameters' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Geocoding location: ${lat}, ${lng}`);

    // Strategy 1: Try very small radius (20m) for precise venue detection
    const precisePlacesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=20&key=${apiKey}`;
    
    const precisePlacesResponse = await fetch(precisePlacesUrl);
    const precisePlacesData = await precisePlacesResponse.json();
    
    console.log(`Precise search (20m) status: ${precisePlacesData.status}, results: ${precisePlacesData.results?.length || 0}`);
    
    if (precisePlacesData.results && precisePlacesData.results.length > 0) {
      console.log(`First 3 results from 20m search:`, JSON.stringify(
        precisePlacesData.results.slice(0, 3).map((r: any) => ({
          name: r.name,
          types: r.types
        }))
      ));
    }
    
    // Filter out generic location types like "locality", "political", etc.
    const isSpecificVenue = (types: string[]) => {
      const genericTypes = ['locality', 'political', 'administrative_area_level_1', 'administrative_area_level_2', 'country'];
      const specificTypes = ['cafe', 'restaurant', 'bar', 'store', 'gym', 'library', 'museum', 'park', 'establishment', 'point_of_interest'];
      
      // Return false if it contains generic types
      if (types.some(t => genericTypes.includes(t))) {
        return false;
      }
      
      // Return true if it contains specific venue types
      return types.some(t => specificTypes.includes(t));
    };
    
    if (precisePlacesData.status === 'OK' && precisePlacesData.results.length > 0) {
      // Find the most specific place (not just a city or region)
      const specificPlace = precisePlacesData.results.find((place: any) => 
        isSpecificVenue(place.types || [])
      );
      
      if (specificPlace) {
        const name = specificPlace.name;
        const types = specificPlace.types || [];
        const emoji = getEmojiForPlaceType(types);
        
        console.log(`✅ Found specific venue (20m radius): ${name} (${emoji}), types: ${types.join(', ')}`);
        
        const response: GeocodeResponse = { name, emoji };
        return new Response(
          JSON.stringify(response), 
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      } else {
        console.log('No specific venue found in 20m radius results');
      }
    }
    
    // Strategy 2: Try slightly larger radius (50m)
    const nearbyPlacesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=50&key=${apiKey}`;
    
    const nearbyPlacesResponse = await fetch(nearbyPlacesUrl);
    const nearbyPlacesData = await nearbyPlacesResponse.json();
    
    console.log(`Nearby search (50m) status: ${nearbyPlacesData.status}, results: ${nearbyPlacesData.results?.length || 0}`);
    
    if (nearbyPlacesData.results && nearbyPlacesData.results.length > 0) {
      console.log(`First 3 results from 50m search:`, JSON.stringify(
        nearbyPlacesData.results.slice(0, 3).map((r: any) => ({
          name: r.name,
          types: r.types
        }))
      ));
    }
    
    if (nearbyPlacesData.status === 'OK' && nearbyPlacesData.results.length > 0) {
      // Find the most specific place
      const specificPlace = nearbyPlacesData.results.find((place: any) => 
        isSpecificVenue(place.types || [])
      );
      
      if (specificPlace) {
        const name = specificPlace.name;
        const types = specificPlace.types || [];
        const emoji = getEmojiForPlaceType(types);
        
        console.log(`✅ Found specific venue (50m radius): ${name} (${emoji}), types: ${types.join(', ')}`);
        
        const response: GeocodeResponse = { name, emoji };
        return new Response(
          JSON.stringify(response), 
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      } else {
        console.log('No specific venue found in 50m radius results');
      }
    }
    
    console.log('Nearby Search failed, falling back to Geocoding API');
    
    // Fallback to reverse geocoding
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
    
    const geocodeResponse = await fetch(geocodeUrl);
    const geocodeData = await geocodeResponse.json();
    
    if (geocodeData.status === 'OK' && geocodeData.results.length > 0) {
      // Try to get the most specific place name
      for (const result of geocodeData.results) {
        if (result.types.includes('premise') || 
            result.types.includes('establishment') ||
            result.types.includes('point_of_interest')) {
          const name = result.formatted_address.split(',')[0];
          console.log(`Found place via Geocoding: ${name}`);
          
          const response: GeocodeResponse = { name, emoji: '📍' };
          return new Response(
            JSON.stringify(response), 
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
      }
      
      // Fall back to first result
      const name = geocodeData.results[0].formatted_address.split(',')[0];
      console.log(`Using first geocoding result: ${name}`);
      
      const response: GeocodeResponse = { name, emoji: '📍' };
      return new Response(
        JSON.stringify(response), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    console.error('Both Google APIs failed to find location');
    return new Response(
      JSON.stringify({ error: 'Location not found' }), 
      { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
    
  } catch (error) {
    console.error('Error in geocode-location function:', error);
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
