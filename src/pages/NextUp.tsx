import { useState } from "react";
import { Sparkles, Calendar } from "lucide-react";
import { TabNavigation } from "@/components/TabNavigation";
import { ConnectionCard } from "@/components/ConnectionCard";
import { VenueSelectorDialog } from "@/components/VenueSelectorDialog";
import { PoiInfoPanel } from "@/components/PoiInfoPanel";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useMeeting } from "@/context/MeetingContext";
import { ConnectionProfile, VenueSuggestion, MeetPlan } from "@/types/connection";
import { getPersonalizedVenues } from "@/lib/venue-matching";
import { getCommonInterests } from "@/lib/interest-utils";
import { format } from "date-fns";

const NextUp = () => {
  const { connections, addPlan } = useMeeting();
  const [selectedConnection, setSelectedConnection] = useState<ConnectionProfile | null>(null);
  const [suggestedVenues, setSuggestedVenues] = useState<VenueSuggestion[]>([]);
  const [commonInterests, setCommonInterests] = useState<string[]>([]);
  const [showVenueSelector, setShowVenueSelector] = useState(false);
  const [showTimeConfirm, setShowTimeConfirm] = useState(false);
  const [showCalendarPrompt, setShowCalendarPrompt] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<VenueSuggestion | null>(null);
  const [meetTime, setMeetTime] = useState("");
  const [pendingPlan, setPendingPlan] = useState<MeetPlan | null>(null);
  const [selectedPoi, setSelectedPoi] = useState<{ name: string; placeId: string; location: { lat: number; lng: number } } | null>(null);

  // Mock current user interests for demo
  const currentUserInterests = ["coffee", "reading", "nature"];

  const handleConnectionClick = (connection: ConnectionProfile) => {
    setSelectedConnection(connection);
    
    // Calculate personalized venues
    const venues = getPersonalizedVenues({
      userInterests: currentUserInterests,
      connectionInterests: connection.interests,
      maxResults: 10,
    });
    setSuggestedVenues(venues);
    
    // Find common interests
    const common = getCommonInterests(currentUserInterests, connection.interests);
    setCommonInterests(common.length > 0 ? common : [...new Set([...currentUserInterests, ...connection.interests])]);
    
    setShowVenueSelector(true);
  };

  const handleVenueSelect = (venue: VenueSuggestion) => {
    setSelectedVenue(venue);
    setShowVenueSelector(false);
    
    // Default to 1 hour from now
    const defaultTime = new Date(Date.now() + 60 * 60 * 1000);
    setMeetTime(format(defaultTime, "yyyy-MM-dd'T'HH:mm"));
    
    setShowTimeConfirm(true);
  };

  const handleMapVenueSelect = (venue: VenueSuggestion) => {
    if (!selectedConnection) {
      // If no connection is selected, prompt user to select one first
      toast({
        title: "Select a connection first",
        description: "Please choose who you want to meet before picking a spot",
        variant: "destructive",
      });
      return;
    }

    setSelectedVenue(venue);
    setShowVenueSelector(false); // Close the venue selector dialog
    
    // Default to 1 hour from now
    const defaultTime = new Date(Date.now() + 60 * 60 * 1000);
    setMeetTime(format(defaultTime, "yyyy-MM-dd'T'HH:mm"));
    
    setShowTimeConfirm(true);
  };

  const handlePoiConfirm = () => {
    if (!selectedConnection || !selectedPoi) return;

    // Convert POI to venue format for time dialog
    setSelectedVenue({
      id: selectedPoi.placeId,
      name: selectedPoi.name,
      lat: selectedPoi.location.lat,
      lng: selectedPoi.location.lng,
      distanceM: 0,
      matchScore: 0,
      category: "poi",
      tags: [],
      openNow: true,
    });

    // Default to 1 hour from now
    const defaultTime = new Date(Date.now() + 60 * 60 * 1000);
    setMeetTime(format(defaultTime, "yyyy-MM-dd'T'HH:mm"));
    
    setShowTimeConfirm(true);
  };

  const handleConfirmPlan = () => {
    if (!selectedConnection || !selectedVenue || !meetTime) return;

    const plan: MeetPlan = {
      id: Math.random().toString(36).substr(2, 9),
      matchName: selectedConnection.name,
      place: {
        name: selectedVenue.name,
        address: "Durham, NC",
        lat: selectedVenue.lat,
        lng: selectedVenue.lng,
      },
      startAt: new Date(meetTime),
      meetCode: `🎯-${Math.floor(Math.random() * 99)}`,
      distanceM: selectedVenue.distanceM,
      status: "confirmed",
    };

    // Store plan for calendar download prompt
    setPendingPlan(plan);

    // Add to plans
    addPlan(plan);

    toast({
      title: "✨ Plan confirmed!",
      description: `Meeting ${selectedConnection.name} at ${selectedVenue.name}`,
    });

    // Clear POI selection if it was a POI
    setSelectedPoi(null);

    // Show calendar download prompt
    setShowTimeConfirm(false);
    setShowCalendarPrompt(true);
  };

  const downloadCalendarEvent = (plan: MeetPlan) => {
    const startDate = new Date(plan.startAt);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour duration
    
    const formatICSDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Spotmate//EN',
      'BEGIN:VEVENT',
      `DTSTART:${formatICSDate(startDate)}`,
      `DTEND:${formatICSDate(endDate)}`,
      `SUMMARY:Spotmate meet: ${plan.place.name}`,
      `LOCATION:${plan.place.name}, ${plan.place.address}`,
      `DESCRIPTION:Meeting ${plan.matchName} at ${plan.place.name}. Meet code: ${plan.meetCode}`,
      'STATUS:CONFIRMED',
      `UID:${plan.id}@spotmate.app`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `spotmate-${plan.matchName.toLowerCase()}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-subtle pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border shadow-soft">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-base">Your Connections</h1>
              <p className="text-xs text-muted-foreground">
                People you've met through Spotmate
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {connections.length > 0 ? (
          connections.map((connection) => (
            <ConnectionCard
              key={connection.userId}
              connection={connection}
              onClick={() => handleConnectionClick(connection)}
            />
          ))
        ) : (
          <div className="gradient-card rounded-3xl p-10 text-center shadow-soft mt-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground mb-2">No connections yet</p>
            <p className="text-xs text-muted-foreground">
              Use Surprise Me or Direct Connect to meet someone!
            </p>
          </div>
        )}

        <p className="text-xs text-center text-muted-foreground pt-4">
          Click a connection to plan your next meetup
        </p>
      </div>

      <TabNavigation />

      {/* Venue Selector Dialog */}
      <VenueSelectorDialog
        open={showVenueSelector}
        connection={selectedConnection}
        venues={suggestedVenues}
        commonInterests={commonInterests}
        onClose={() => setShowVenueSelector(false)}
        onSelectVenue={handleVenueSelect}
        onMapVenueSelect={handleMapVenueSelect}
        onPoiClick={(poi) => setSelectedPoi(poi)}
        selectedPoi={selectedPoi}
        onPoiConfirm={handlePoiConfirm}
      />


      {/* Time Confirmation Dialog */}
      <Dialog open={showTimeConfirm} onOpenChange={setShowTimeConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>When do you want to meet?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Meeting {selectedConnection?.name} at {selectedVenue?.name}
            </p>
            <div className="space-y-2">
              <Label htmlFor="meetTime">Select date and time</Label>
              <Input
                id="meetTime"
                type="datetime-local"
                value={meetTime}
                onChange={(e) => setMeetTime(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowTimeConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleConfirmPlan}
                disabled={!meetTime}
              >
                Confirm
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Calendar Download Prompt */}
      <Dialog open={showCalendarPrompt} onOpenChange={(open) => {
        setShowCalendarPrompt(open);
        if (!open) {
          setSelectedConnection(null);
          setSelectedVenue(null);
          setPendingPlan(null);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Download calendar invite?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Would you like to download an .ics file to add this meetup to your calendar?
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowCalendarPrompt(false);
                  setSelectedConnection(null);
                  setSelectedVenue(null);
                  setPendingPlan(null);
                }}
              >
                No, thanks
              </Button>
              <Button
                className="flex-1 gap-2"
                onClick={() => {
                  if (pendingPlan) {
                    downloadCalendarEvent(pendingPlan);
                  }
                  setShowCalendarPrompt(false);
                  setSelectedConnection(null);
                  setSelectedVenue(null);
                  setPendingPlan(null);
                }}
              >
                <Calendar className="w-4 h-4" />
                Download
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NextUp;
