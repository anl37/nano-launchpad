import { MapPin, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface LocationInfoSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationName: string;
  connectCount: number;
  placeId?: string;
  location?: { lat: number; lng: number };
  showConfirmButton?: boolean;
  onConfirm?: () => void;
}

export const LocationInfoSheet = ({
  open,
  onOpenChange,
  locationName,
  connectCount,
  showConfirmButton = false,
  onConfirm,
}: LocationInfoSheetProps) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            {locationName}
          </SheetTitle>
          <SheetDescription className="text-left pt-2">
            <div className="flex items-center gap-2 text-foreground">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-lg font-semibold">{connectCount}</span>
              <span className="text-sm text-muted-foreground">
                {connectCount === 1 ? "person is" : "people are"} open to connect here
              </span>
            </div>
          </SheetDescription>
        </SheetHeader>

        {showConfirmButton && (
          <div className="mt-6 space-y-3">
            <Button 
              className="w-full" 
              size="lg"
              onClick={() => {
                onConfirm?.();
                onOpenChange(false);
              }}
            >
              Confirm Next Event Here
            </Button>
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
