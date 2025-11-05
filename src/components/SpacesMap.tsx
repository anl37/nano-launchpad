import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { DEFAULT_CITY_CENTER, DURHAM_RECS } from '@/config/city';

// Custom pin icons by type
const createCustomIcon = (type: string = 'default', isSelected: boolean = false) => {
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

  const icon = iconMap[type] || iconMap.default;
  const color = isSelected ? '#8B5CF6' : '#3B82F6';
  const size = isSelected ? 40 : 32;

  return L.divIcon({
    className: 'custom-venue-marker',
    html: `
      <div style="
        font-size: ${size}px;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
        transition: all 0.2s ease;
        ${isSelected ? 'transform: scale(1.2);' : ''}
      ">
        ${icon}
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
  });
};

interface Location {
  name: string;
  lat: number;
  lng: number;
  category?: string;
  id?: string;
  type?: string;
}

interface SpacesMapProps {
  venues?: Location[];
  onVenueSelect?: (venue: Location) => void;
  selectedVenueId?: string | null;
  height?: string;
  showHeader?: boolean;
}

export const SpacesMap = ({ 
  venues = DURHAM_RECS, 
  onVenueSelect,
  selectedVenueId = null,
  height = "300px",
  showHeader = true
}: SpacesMapProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Initialize map
    const map = L.map(containerRef.current).setView(
      [DEFAULT_CITY_CENTER.lat, DEFAULT_CITY_CENTER.lng],
      13
    );

    mapRef.current = map;

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    // Add markers for locations with custom icons
    venues.forEach((location) => {
      const isSelected = location.id === selectedVenueId;
      const icon = createCustomIcon(location.type, isSelected);
      
      const marker = L.marker([location.lat, location.lng], { icon })
        .addTo(map);

      if (onVenueSelect) {
        marker.on('click', () => {
          onVenueSelect(location);
        });
      }

      if (location.id) {
        markersRef.current.set(location.id, marker);
      }
    });

    // Cleanup on unmount
    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
    };
  }, [venues, onVenueSelect]);

  // Handle selected venue highlighting - update icons
  useEffect(() => {
    if (!mapRef.current) return;
    
    markersRef.current.forEach((marker, id) => {
      const venue = venues.find(v => v.id === id);
      const isSelected = id === selectedVenueId;
      const newIcon = createCustomIcon(venue?.type, isSelected);
      marker.setIcon(newIcon);
    });
  }, [selectedVenueId, venues]);

  return (
    <div className="relative w-full rounded-3xl overflow-hidden shadow-soft" style={{ height }}>
      <div ref={containerRef} className="w-full h-full" />
      {showHeader && (
        <div className="absolute top-3 left-3 bg-background/90 backdrop-blur-sm rounded-xl px-3 py-2 shadow-lg z-[1000]">
          <h3 className="font-semibold text-sm">Durham, NC</h3>
          <p className="text-xs text-muted-foreground">Recommended spots nearby</p>
        </div>
      )}
    </div>
  );
};
