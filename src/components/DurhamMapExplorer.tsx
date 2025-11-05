import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star, Clock } from "lucide-react";
import { VenueSuggestion } from "@/types/connection";
import { formatDistance } from "@/lib/location-utils";
import { formatOpeningTime } from "@/lib/time-utils";

interface DurhamMapExplorerProps {
  venues: VenueSuggestion[];
  onSelectVenue: (venue: VenueSuggestion) => void;
}

export const DurhamMapExplorer = ({ venues, onSelectVenue }: DurhamMapExplorerProps) => {
  const getMatchColor = (score: number) => {
    if (score >= 80) return "bg-success text-success-foreground";
    if (score >= 60) return "bg-accent text-accent-foreground";
    return "bg-muted text-muted-foreground";
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-lg mb-1">Explore Durham</h3>
        <p className="text-sm text-muted-foreground">
          Browse 50 places across Durham and select one for your meetup
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {venues.map((venue) => (
          <div
            key={venue.id}
            className="gradient-card rounded-2xl p-4 shadow-soft hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">{venue.name}</h4>
                <p className="text-sm text-muted-foreground">{venue.category}</p>
              </div>
              <Badge className={`${getMatchColor(venue.matchScore)} shrink-0`}>
                {venue.matchScore}% match
              </Badge>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1 mb-3">
              {venue.tags.map((tag, idx) => (
                <span key={idx} className="text-xs text-muted-foreground">
                  {tag}
                  {idx < venue.tags.length - 1 && " •"}
                </span>
              ))}
            </div>

            {/* Info */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {formatDistance(venue.distanceM)}
              </span>
              {venue.rating && (
                <span className="flex items-center gap-1">
                  <Star className="w-3 h-3" />
                  {venue.rating.toFixed(1)}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {venue.openNow ? (
                  <span className="text-success">Open now</span>
                ) : venue.opensAt ? (
                  <span>Opens {formatOpeningTime(venue.opensAt.hour, venue.opensAt.minute)}</span>
                ) : null}
              </span>
            </div>

            <Button
              onClick={() => onSelectVenue(venue)}
              className="w-full"
              variant="outline"
            >
              Select this spot
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};
