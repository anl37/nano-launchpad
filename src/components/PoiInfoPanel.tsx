import { MapPin, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PoiInfoPanelProps {
  locationName: string;
  connectCount: number;
  showConfirmButton?: boolean;
  onConfirm?: () => void;
}

export const PoiInfoPanel = ({
  locationName,
  connectCount,
  showConfirmButton = false,
  onConfirm,
}: PoiInfoPanelProps) => {
  return (
    <div className="bg-card border-t border-border p-4">
      <div className="flex items-center gap-2 mb-3">
        <MapPin className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-base">{locationName}</h3>
      </div>
      
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-4 h-4 text-primary" />
        <span className="text-lg font-semibold">{connectCount}</span>
        <span className="text-sm text-muted-foreground">
          {connectCount === 1 ? "person is" : "people are"} open to connect here
        </span>
      </div>

      {showConfirmButton && (
        <Button 
          className="w-full" 
          size="lg"
          onClick={onConfirm}
        >
          Select This Spot
        </Button>
      )}
    </div>
  );
};
