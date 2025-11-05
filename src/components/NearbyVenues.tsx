import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Coffee, MapPin, Navigation } from "lucide-react";

const mockVenues = [
  {
    id: "1",
    name: "Blue Bottle Coffee",
    type: "Cafe",
    distance: 120,
    openNow: true
  },
  {
    id: "2",
    name: "The Corner Bistro",
    type: "Restaurant",
    distance: 250,
    openNow: true
  },
  {
    id: "3",
    name: "Green Leaf Bar",
    type: "Bar",
    distance: 180,
    openNow: true
  },
  {
    id: "4",
    name: "Sunset Smoothies",
    type: "Cafe",
    distance: 95,
    openNow: false
  }
];

export const NearbyVenues = () => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-1">
        <Coffee className="w-4 h-4 text-muted-foreground" />
        <h2 className="font-semibold text-foreground">Nearby Venues</h2>
        <span className="text-sm text-muted-foreground">Continue the conversation</span>
      </div>

      <div className="space-y-2">
        {mockVenues.map((venue) => (
          <div
            key={venue.id}
            className="gradient-card rounded-xl p-4 shadow-soft border border-border/50"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold">{venue.name}</h3>
                  {venue.openNow && (
                    <Badge variant="default" className="bg-success text-success-foreground text-xs">
                      Open
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-2">{venue.type}</p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  {venue.distance}m away
                </div>
              </div>
              
              <Button
                size="sm"
                variant="outline"
                className="gap-2 flex-shrink-0"
                onClick={() => window.open(`https://maps.google.com/?q=${venue.name}`, '_blank')}
              >
                <Navigation className="w-3 h-3" />
                Directions
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
