import { useEffect, useRef, useState } from 'react';
import { DEFAULT_CITY_CENTER, DURHAM_RECS } from '@/config/city';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// Category emoji mapping
const getCategoryEmoji = (type: string = 'default'): string => {
  const iconMap: Record<string, string> = {
    coffee: '☕',
    stadium: '⚽',
    garden: '🌿',
    sight: '🏛️',
    hangout: '🍺',
    restaurant: '🍴',
    study: '📚',
    shopping: '🛍️',
    default: '📍',
  };
  return iconMap[type] || iconMap.default;
};

interface Location {
  name: string;
  lat: number;
  lng: number;
  category?: string;
  id?: string;
  type?: string;
}

interface GoogleSpacesMapProps {
  venues?: Location[];
  onVenueSelect?: (venue: Location) => void;
  onPoiClick?: (poi: { name: string; placeId: string; location: { lat: number; lng: number } }) => void;
  selectedVenueId?: string | null;
  height?: string;
  showHeader?: boolean;
  locationCounts?: Record<string, number>;
}

export const GoogleSpacesMap = ({ 
  venues = DURHAM_RECS, 
  onVenueSelect,
  onPoiClick,
  selectedVenueId = null,
  height = "300px",
  showHeader = true,
  locationCounts = {}
}: GoogleSpacesMapProps) => {
  const mapRef = useRef<google.maps.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  // Initialize map once
  useEffect(() => {
    const initMap = async () => {
      if (!containerRef.current || mapRef.current) return;

      try {
        // Fetch API key from backend
        const { data: keyData } = await supabase.functions.invoke('google-maps-proxy');
        
        if (!keyData?.apiKey) {
          throw new Error('Failed to get Google Maps API key');
        }

        // Load Google Maps script with Places library
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${keyData.apiKey}&libraries=places,marker&v=weekly`;
        script.async = true;
        script.defer = true;
        
        await new Promise<void>((resolve, reject) => {
          script.onload = () => resolve();
          script.onerror = reject;
          document.head.appendChild(script);
        });
        
        // Initialize map
        const map = new google.maps.Map(containerRef.current, {
          center: { lat: DEFAULT_CITY_CENTER.lat, lng: DEFAULT_CITY_CENTER.lng },
          zoom: 14,
          mapId: 'DEMO_MAP_ID',
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
        });

        mapRef.current = map;

        // Add POI click listener
        if (onPoiClick) {
          map.addListener('click', (event: any) => {
            const placeId = event.placeId;
            if (placeId) {
              event.stop(); // Prevent default info window
              
              const service = new google.maps.places.PlacesService(map);
              service.getDetails(
                { placeId: placeId, fields: ['name', 'geometry', 'place_id'] },
                (place, status) => {
                  if (status === google.maps.places.PlacesServiceStatus.OK && place) {
                    onPoiClick({
                      name: place.name || 'Unknown Location',
                      placeId: place.place_id || placeId,
                      location: {
                        lat: place.geometry?.location?.lat() || 0,
                        lng: place.geometry?.location?.lng() || 0,
                      },
                    });
                  }
                }
              );
            }
          });
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Error loading Google Maps:', error);
        toast.error('Failed to load map');
        setIsLoading(false);
      }
    };

    initMap();

    return () => {
      markersRef.current.forEach(marker => {
        (marker as any).setMap(null);
      });
      markersRef.current.clear();
      if (mapRef.current) {
        mapRef.current = null;
      }
    };
  }, []); // Only initialize once

  // Custom markers removed - now using only native Google Maps POIs

  return (
    <div className="relative w-full rounded-3xl overflow-hidden shadow-soft" style={{ height }}>
      <div ref={containerRef} className="w-full h-full" />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Loading map...</p>
          </div>
        </div>
      )}
      {showHeader && (
        <div className="absolute top-3 left-3 bg-background/90 backdrop-blur-sm rounded-xl px-3 py-2 shadow-lg z-[1000]">
          <h3 className="font-semibold text-sm">Durham, NC</h3>
          <p className="text-xs text-muted-foreground">Live connections at spots</p>
        </div>
      )}
    </div>
  );
};
