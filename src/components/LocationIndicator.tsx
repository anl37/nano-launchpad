import { MapPin, MapPinOff, AlertCircle } from "lucide-react";
import { LocationStatus } from "@/hooks/useGeolocation";

interface LocationIndicatorProps {
  status: LocationStatus;
  onToggle?: () => void;
}

interface LocationCoords {
  lat: number;
  lng: number;
  accuracy?: number;
}

export const LocationIndicator = ({ 
  status, 
  onToggle, 
  isMockLocation,
  coords 
}: LocationIndicatorProps & { 
  isMockLocation?: boolean;
  coords?: LocationCoords | null;
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'live':
        return {
          icon: MapPin,
          text: 'Live',
          className: 'bg-success/10 text-success border-success/20',
          iconClassName: 'animate-pulse',
        };
      case 'paused':
        return {
          icon: MapPinOff,
          text: 'Paused',
          className: 'bg-muted text-muted-foreground border-border',
          iconClassName: '',
        };
      case 'denied':
        return {
          icon: AlertCircle,
          text: 'No permission',
          className: 'bg-destructive/10 text-destructive border-destructive/20',
          iconClassName: '',
        };
      case 'error':
        return {
          icon: AlertCircle,
          text: 'Error',
          className: 'bg-destructive/10 text-destructive border-destructive/20',
          iconClassName: '',
        };
      case 'unsupported':
        return {
          icon: AlertCircle,
          text: 'Not supported',
          className: 'bg-muted text-muted-foreground border-border',
          iconClassName: '',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className="flex flex-col gap-1 items-end">
      <button
        onClick={onToggle}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${config.className}`}
      >
        <Icon className={`w-3 h-3 ${config.iconClassName}`} />
        <span>{config.text}</span>
      </button>
      {isMockLocation && (
        <div className="text-[10px] text-muted-foreground px-2 text-right max-w-[140px]">
          Mock: Durham, NC
        </div>
      )}
      {coords && (
        <div className="text-[10px] font-mono text-muted-foreground px-2 text-right">
          {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
          {coords.accuracy && (
            <div className="text-[9px]">±{Math.round(coords.accuracy)}m</div>
          )}
        </div>
      )}
    </div>
  );
};
