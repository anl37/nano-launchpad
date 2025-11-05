import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.79.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LocationRequest {
  latitude: number;
  longitude: number;
  timestamp_utc?: string;
  user_timezone_at_event?: string;
  confidence?: number;
}

/**
 * Get timezone from coordinates using Google TimeZone API
 */
async function getTimezoneFromCoords(lat: number, lng: number): Promise<string> {
  const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
  if (!apiKey) {
    console.warn('GOOGLE_MAPS_API_KEY not set for timezone detection');
    return 'UTC';
  }

  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const url = `https://maps.googleapis.com/maps/api/timezone/json?location=${lat},${lng}&timestamp=${timestamp}&key=${apiKey}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      console.error('TimeZone API error:', response.status);
      return 'UTC';
    }

    const data = await response.json();
    if (data.status === 'OK' && data.timeZoneId) {
      console.log(`Detected timezone: ${data.timeZoneId}`);
      return data.timeZoneId;
    }
  } catch (error) {
    console.error('Error fetching timezone:', error);
  }

  return 'UTC';
}

// Check place cache first, then fetch from API if needed
async function getPlaceDetails(
  supabaseClient: any,
  lat: number,
  lng: number
): Promise<{
  placeId: string | null;
  placeName: string | null;
  placeType: string;
  types: string[];
}> {
  const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
  if (!apiKey) {
    console.warn('GOOGLE_MAPS_API_KEY not set, using defaults');
    return { placeId: null, placeName: null, placeType: 'general', types: [] };
  }

  try {
    // Step 1: Check if we have a cached place within 50m
    const { data: cachedPlaces } = await supabaseClient
      .from('place_cache')
      .select('*')
      .gte('lat', lat - 0.0005) // ~50m
      .lte('lat', lat + 0.0005)
      .gte('lng', lng - 0.0005)
      .lte('lng', lng + 0.0005)
      .limit(5);

    if (cachedPlaces && cachedPlaces.length > 0) {
      // Find closest cached place
      let closest = cachedPlaces[0];
      let minDist = Math.hypot(lat - closest.lat, lng - closest.lng);
      
      for (const place of cachedPlaces) {
        const dist = Math.hypot(lat - place.lat, lng - place.lng);
        if (dist < minDist) {
          minDist = dist;
          closest = place;
        }
      }
      
      // If within 50m, use cached
      if (minDist < 0.0005) {
        // Update last_used_at and use_count
        await supabaseClient
          .from('place_cache')
          .update({
            last_used_at: new Date().toISOString(),
            use_count: closest.use_count + 1,
          })
          .eq('place_id', closest.place_id);
        
        console.log('Using cached place:', closest.place_name);
        return {
          placeId: closest.place_id,
          placeName: closest.place_name,
          placeType: closest.place_type,
          types: closest.types || [],
        };
      }
    }

    // Step 2: Not in cache, fetch from Google Places API
    const nearbyUrl = `https://places.googleapis.com/v1/places:searchNearby`;
    const response = await fetch(nearbyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.types,places.primaryType',
      },
      body: JSON.stringify({
        locationRestriction: {
          circle: {
            center: {
              latitude: lat,
              longitude: lng,
            },
            radius: 50.0,
          },
        },
        maxResultCount: 1,
      }),
    });

    if (!response.ok) {
      console.error('Places API error:', response.status);
      return { placeId: null, placeName: null, placeType: 'general', types: [] };
    }

    const data = await response.json();
    
    if (data.places && data.places.length > 0) {
      const place = data.places[0];
      const placeId = place.id || null;
      const placeName = place.displayName?.text || null;
      const types: string[] = place.types || [];
      
      let placeType = place.primaryType || 'general';
      if (!place.primaryType && types.length > 0) {
        const priorityTypes = ['cafe', 'restaurant', 'gym', 'library', 'bar', 'park', 'shopping_mall'];
        const foundType = types.find(t => priorityTypes.includes(t));
        placeType = foundType || types[0];
      }
      
      // Step 3: Cache the result
      if (placeId) {
        await supabaseClient
          .from('place_cache')
          .upsert({
            place_id: placeId,
            place_name: placeName,
            place_type: placeType,
            types: types,
            lat: lat,
            lng: lng,
          });
        
        console.log('Cached new place:', placeName);
      }
      
      return { placeId, placeName, placeType, types };
    }
  } catch (error) {
    console.error('Error fetching place details:', error);
  }

  return { placeId: null, placeName: null, placeType: 'general', types: [] };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get user from JWT
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { 
      latitude, 
      longitude, 
      timestamp_utc, 
      user_timezone_at_event,
      confidence = 1.0
    }: LocationRequest = await req.json();

    if (!latitude || !longitude) {
      return new Response(JSON.stringify({ error: 'Missing latitude or longitude' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use provided timestamp or current time
    const eventTimestamp = timestamp_utc ? new Date(timestamp_utc) : new Date();
    const eventTimestampISO = eventTimestamp.toISOString();
    
    // Detect timezone if not provided
    let timezone = user_timezone_at_event;
    if (!timezone) {
      timezone = await getTimezoneFromCoords(latitude, longitude);
    }
    
    // Get place details (from cache or API)
    const { placeId, placeName, placeType, types } = await getPlaceDetails(supabase, latitude, longitude);

    console.log('Recording location visit:', { 
      userId: user.id, 
      placeType, 
      placeName,
      timestamp_utc: eventTimestampISO,
      timezone,
    });

    // Insert location visit with confidence - trigger will auto-fill time fields
    const { error: visitError } = await supabase
      .from('location_visits')
      .insert({
        user_id: user.id,
        lat: latitude,
        lng: longitude,
        place_id: placeId,
        place_name: placeName,
        place_type: placeType,
        types: types,
        timestamp_utc: eventTimestampISO,
        user_timezone_at_event: timezone,
        visited_at: eventTimestampISO,
        confidence: confidence,
      });

    if (visitError) {
      console.error('Error inserting location visit:', visitError);
      throw visitError;
    }

    // Get updated activity patterns for this user
    const { data: patterns } = await supabase
      .from('activity_patterns')
      .select('*')
      .eq('user_id', user.id);

    // Build activity fingerprint
    const fingerprint: Record<string, any> = {};
    if (patterns) {
      patterns.forEach(pattern => {
        const key = `${pattern.place_type}_${pattern.time_of_day}_${pattern.day_type}`;
        fingerprint[key] = {
          visit_count: pattern.visit_count,
          frequency_score: pattern.frequency_score,
          last_visit: pattern.last_visit_at,
        };
      });
    }

    // Update profile with activity fingerprint
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ activity_fingerprint: fingerprint })
      .eq('id', user.id);

    if (profileError) {
      console.error('Error updating activity fingerprint:', profileError);
    }

    // Recalculate frequency scores
    const { error: recalcError } = await supabase.rpc('recalculate_frequency_scores', {
      target_user_id: user.id,
    });

    if (recalcError) {
      console.error('Error recalculating frequency scores:', recalcError);
    }

    // Query the inserted record to get computed time fields
    const { data: visitData } = await supabase
      .from('location_visits')
      .select('day_of_week, time_window, time_label')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return new Response(
      JSON.stringify({ 
        success: true, 
        placeId,
        placeName,
        placeType,
        types,
        timezone,
        timestamp_utc: eventTimestamp.toISOString(),
        dayOfWeek: visitData?.day_of_week,
        timeWindow: visitData?.time_window,
        timeLabel: visitData?.time_label,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in record-location:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
