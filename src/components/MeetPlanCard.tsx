import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, Calendar } from "lucide-react";
import { formatMeetTime } from "@/lib/time-utils";
import { formatDistance } from "@/lib/location-utils";
import { toast } from "@/hooks/use-toast";

interface MeetPlan {
  id: string;
  matchName: string;
  place: {
    name: string;
    address: string;
    lat: number;
    lng: number;
  };
  startAt: Date;
  meetCode: string;
  distanceM: number;
  status: "confirmed" | "pending" | "completed";
}

interface MeetPlanCardProps {
  plan: MeetPlan;
}

export const MeetPlanCard = ({ plan }: MeetPlanCardProps) => {

  const handleGetDirections = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(plan.place.name)}`;
    window.open(url, '_blank');
  };


  const handleExportCalendar = () => {
    // Create ICS file content
    const ics = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
SUMMARY:Spotmate meet: ${plan.place.name}
LOCATION:${plan.place.name}, ${plan.place.address}
DTSTART:${plan.startAt.toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DESCRIPTION:Meeting ${plan.matchName} at ${plan.place.name}. Meet code: ${plan.meetCode}
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([ics], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spotmate-${plan.id}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="gradient-card rounded-3xl p-5 shadow-soft space-y-4 border border-border/50">
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">{plan.place.name}</h3>
          {plan.status === "confirmed" && (
            <span className="text-xs px-3 py-1 rounded-full bg-success/10 text-success font-medium">
              Confirmed
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">with {plan.matchName}</p>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span>{formatMeetTime(plan.startAt)}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-muted-foreground" />
          <span>{plan.place.address} • {formatDistance(plan.distanceM)}</span>
        </div>
      </div>

      <div className="bg-muted/30 rounded-2xl p-4 text-center">
        <p className="text-xs text-muted-foreground mb-1">Meet code</p>
        <p className="text-2xl font-bold text-foreground">{plan.meetCode}</p>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={handleGetDirections}
          variant="outline"
          size="sm"
          className="flex-1 rounded-full"
        >
          <Navigation className="w-4 h-4 mr-2" />
          Directions
        </Button>
        <Button
          onClick={handleExportCalendar}
          variant="outline"
          size="sm"
          className="flex-1 rounded-full"
        >
          <Calendar className="w-4 h-4 mr-2" />
          Calendar
        </Button>
      </div>
    </div>
  );
};
