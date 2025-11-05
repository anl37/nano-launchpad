import { supabase } from "@/integrations/supabase/client";

/**
 * Reverse geocode coordinates to get place name using secure edge function
 */
export async function getPlaceNameFromCoords(
  lat: number,
  lng: number
): Promise<{ name: string; emoji: string } | null> {
  try {
    const { data, error } = await supabase.functions.invoke('geocode-location', {
      body: { lat, lng }
    });
    
    if (error) {
      console.error('Error calling geocode-location function:', error);
      return null;
    }
    
    if (data && data.name && data.emoji) {
      return { name: data.name, emoji: data.emoji };
    }
    
    return null;
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    return null;
  }
}
