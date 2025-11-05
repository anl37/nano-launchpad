import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Book, Coffee, Palette, Gamepad2, ShoppingBag, MapPin, Navigation } from "lucide-react";
import { formatDistance } from "@/lib/location-utils";
import { formatOpeningTime } from "@/lib/time-utils";

interface Venue {
  id: string;
  name: string;
  category: string;
  lat: number;
  lng: number;
  distanceM: number;
  openNow: boolean;
  opensAt?: { hour: number; minute: number };
  rating?: number;
  description?: string;
}

const categoryIcons: Record<string, any> = {
  bookstore: Book,
  coffee: Coffee,
  gallery: Palette,
  arcade: Gamepad2,
  thrift: ShoppingBag,
  park: MapPin,
};

const mockSuggestions: Venue[] = [
  {
    id: "1",
    name: "Corner Bookshop",
    category: "bookstore",
    lat: 40.7590,
    lng: -73.9845,
    distanceM: 320,
    openNow: true,
    rating: 4.6,
    description: "Cozy independent bookstore with café"
  },
  {
    id: "2",
    name: "Washington Square Park",
    category: "park",
    lat: 40.7308,
    lng: -73.9973,
    distanceM: 450,
    openNow: true,
    rating: 4.8,
    description: "Iconic park perfect for a walk"
  },
  {
    id: "3",
    name: "Modern Art Gallery",
    category: "gallery",
    lat: 40.7614,
    lng: -73.9776,
    distanceM: 580,
    openNow: true,
    rating: 4.4,
    description: "Contemporary art exhibitions"
  },
  {
    id: "4",
    name: "Retro Arcade Bar",
    category: "arcade",
    lat: 40.7298,
    lng: -73.9900,
    distanceM: 720,
    openNow: false,
    opensAt: { hour: 17, minute: 0 },
    rating: 4.5,
    description: "Classic arcade games & craft beer"
  },
  {
    id: "5",
    name: "Sweet Spot Desserts",
    category: "coffee",
    lat: 40.7565,
    lng: -73.9920,
    distanceM: 280,
    openNow: true,
    rating: 4.7,
    description: "Artisan ice cream & pastries"
  },
  {
    id: "6",
    name: "Vintage Finds",
    category: "thrift",
    lat: 40.7345,
    lng: -73.9912,
    distanceM: 650,
    openNow: true,
    rating: 4.3,
    description: "Curated vintage clothing & records"
  }
];

interface NextUpPanelProps {
  sessionId: string;
  onConfirm: (venue: Venue) => void;
  onScheduleLater: () => void;
}

export const NextUpPanel = ({ sessionId, onConfirm, onScheduleLater }: NextUpPanelProps) => {
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [userConfirmed, setUserConfirmed] = useState(false);

  const handleVenueSelect = (venue: Venue) => {
    setSelectedVenue(venue);
    setUserConfirmed(false);
  };

  const handleConfirm = () => {
    if (!userConfirmed) {
      setUserConfirmed(true);
      // In real app, this would trigger a sync event
      // For now, simulate waiting for other user
      setTimeout(() => {
        if (selectedVenue) {
          onConfirm(selectedVenue);
        }
      }, 1500);
    }
  };

  const handleGetDirections = (venue: Venue) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.name)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold">✨ Next Up</h2>
        <p className="text-sm text-muted-foreground">Pick an activity together</p>
      </div>

      {/* Suggestions Grid */}
      <div className="grid grid-cols-2 gap-3">
        {mockSuggestions.map((venue) => {
          const Icon = categoryIcons[venue.category] || MapPin;
          return (
            <button
              key={venue.id}
              onClick={() => handleVenueSelect(venue)}
              className="gradient-card rounded-2xl p-4 text-left hover:shadow-elegant transition-all"
            >
              <Icon className="w-6 h-6 text-primary mb-2" />
              <h3 className="font-semibold text-sm mb-1">{venue.name}</h3>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{formatDistance(venue.distanceM)}</span>
                {venue.openNow ? (
                  <span className="text-success">• Open now</span>
                ) : venue.opensAt ? (
                  <span>• Opens {formatOpeningTime(venue.opensAt.hour, venue.opensAt.minute)}</span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>

      {/* Schedule Later Option */}
      <Button
        onClick={onScheduleLater}
        variant="outline"
        className="w-full"
      >
        Schedule for Later
      </Button>

      {/* Venue Detail Dialog */}
      <Dialog open={!!selectedVenue} onOpenChange={() => setSelectedVenue(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedVenue?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span>{formatDistance(selectedVenue?.distanceM || 0)}</span>
                {selectedVenue?.openNow ? (
                  <span className="text-success font-medium">• Open now</span>
                ) : selectedVenue?.opensAt ? (
                  <span className="text-muted-foreground">
                    • Opens {formatOpeningTime(selectedVenue.opensAt.hour, selectedVenue.opensAt.minute)}
                  </span>
                ) : null}
              </div>
              {selectedVenue?.rating && (
                <p className="text-sm text-muted-foreground">⭐ {selectedVenue.rating}</p>
              )}
              <p className="text-sm">{selectedVenue?.description}</p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => selectedVenue && handleGetDirections(selectedVenue)}
                variant="outline"
                className="flex-1"
              >
                <Navigation className="w-4 h-4 mr-2" />
                Directions
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={userConfirmed}
                className="flex-1 gradient-warm"
              >
                {userConfirmed ? "Waiting for match..." : "Confirm Together"}
              </Button>
            </div>

            {userConfirmed && (
              <p className="text-xs text-center text-muted-foreground">
                Both of you need to confirm. They're deciding...
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
