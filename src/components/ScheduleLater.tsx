import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, Clock, MapPin } from "lucide-react";

interface ScheduleLaterProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (plan: { when: string; time: string; place: string }) => void;
}

export const ScheduleLater = ({ open, onClose, onConfirm }: ScheduleLaterProps) => {
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<string | null>(null);
  const [userConfirmed, setUserConfirmed] = useState(false);

  const dayOptions = ["Today", "Tomorrow", "This weekend"];
  const timeOptions = ["+15m", "+30m", "+1h", "Choose time"];
  const placeOptions = ["Corner Bookshop", "Washington Square Park", "Sweet Spot Desserts"];

  const handleConfirm = () => {
    if (selectedDay && selectedTime && selectedPlace && !userConfirmed) {
      setUserConfirmed(true);
      // Simulate waiting for other user
      setTimeout(() => {
        onConfirm({
          when: selectedDay,
          time: selectedTime,
          place: selectedPlace
        });
        resetForm();
      }, 1500);
    }
  };

  const resetForm = () => {
    setSelectedDay(null);
    setSelectedTime(null);
    setSelectedPlace(null);
    setUserConfirmed(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule for Later</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Day Selection */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Calendar className="w-4 h-4" />
              <span>When?</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {dayOptions.map((day) => (
                <Button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  variant={selectedDay === day ? "default" : "outline"}
                  size="sm"
                >
                  {day}
                </Button>
              ))}
            </div>
          </div>

          {/* Time Selection */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Clock className="w-4 h-4" />
              <span>What time?</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {timeOptions.map((time) => (
                <Button
                  key={time}
                  onClick={() => setSelectedTime(time)}
                  variant={selectedTime === time ? "default" : "outline"}
                  size="sm"
                  disabled={!selectedDay}
                >
                  {time}
                </Button>
              ))}
            </div>
          </div>

          {/* Place Selection */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <MapPin className="w-4 h-4" />
              <span>Where?</span>
            </div>
            <div className="flex flex-col gap-2">
              {placeOptions.map((place) => (
                <Button
                  key={place}
                  onClick={() => setSelectedPlace(place)}
                  variant={selectedPlace === place ? "default" : "outline"}
                  size="sm"
                  disabled={!selectedTime}
                  className="justify-start"
                >
                  {place}
                </Button>
              ))}
            </div>
          </div>

          {/* Confirm Button */}
          <div className="space-y-2">
            <Button
              onClick={handleConfirm}
              disabled={!selectedDay || !selectedTime || !selectedPlace || userConfirmed}
              className="w-full gradient-warm"
            >
              {userConfirmed ? "Waiting for match..." : "Confirm Together"}
            </Button>
            {userConfirmed && (
              <p className="text-xs text-center text-muted-foreground">
                Both of you need to confirm...
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
