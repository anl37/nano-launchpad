import { Map, MapPin } from "lucide-react";
import { TabNavigation } from "@/components/TabNavigation";
import { GoogleSpacesMap } from "@/components/GoogleSpacesMap";
import { PoiInfoPanel } from "@/components/PoiInfoPanel";
import { DURHAM_RECS } from "@/config/city";
import { useState } from "react";

const Spaces = () => {
  const locationCounts: Record<string, number> = {}; // Empty for now as presence tracking removed
  const [selectedVenue, setSelectedVenue] = useState<{ name: string; id?: string; type?: string } | null>(null);
  const [selectedPoi, setSelectedPoi] = useState<{ name: string; placeId: string; location: { lat: number; lng: number } } | null>(null);

  return (
    <div className="min-h-screen bg-gradient-subtle pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border shadow-soft">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Map className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-base">Durham Spaces</h1>
              <p className="text-xs text-muted-foreground">
                Recommended spots nearby
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Map */}
        <GoogleSpacesMap 
          locationCounts={locationCounts} 
          onVenueSelect={(venue) => setSelectedVenue(venue)}
          onPoiClick={(poi) => setSelectedPoi(poi)}
        />
        
        {selectedPoi && (
          <PoiInfoPanel
            locationName={selectedPoi.name}
            connectCount={locationCounts[selectedPoi.placeId] || 0}
          />
        )}

        {/* Location Info */}
        <div className="gradient-card rounded-2xl p-6 shadow-soft text-center">
          {selectedVenue && selectedVenue.id ? (
            <div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <MapPin className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-lg text-foreground">{selectedVenue.name}</h3>
              </div>
              <p className="text-2xl font-bold text-primary mb-1">
                {locationCounts[selectedVenue.id] || 0}
              </p>
              <p className="text-sm text-muted-foreground">
                {locationCounts[selectedVenue.id] === 1 ? 'person is' : 'people are'} open to connect here
              </p>
            </div>
          ) : (
            <div>
              <p className="text-muted-foreground">
                Click on a map pin to view number of people open to connect and more information about the location
              </p>
            </div>
          )}
        </div>
      </div>

      <TabNavigation />
    </div>
  );
};

export default Spaces;
