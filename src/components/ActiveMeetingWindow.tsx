import { useState } from "react";
import { Shield, Fingerprint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SOSConfirm } from "@/components/SOSConfirm";
import { EmojiCard } from "@/components/EmojiCard";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { relativeTime } from "@/lib/time-utils";

interface ActiveMeetingWindowProps {
  userName: string;
  meetCode: string;
  startAt: Date;
  spaceName?: string;
  venue?: string;
  landmark?: string;
  sharedEmojiCode?: string;
  onEndMeeting: () => void;
  onViewPlan?: () => void;
}

export const ActiveMeetingWindow = ({
  userName,
  meetCode,
  startAt,
  spaceName,
  venue,
  landmark,
  sharedEmojiCode,
  onEndMeeting,
  onViewPlan,
}: ActiveMeetingWindowProps) => {
  const [showSOSConfirm, setShowSOSConfirm] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showEmojiCard, setShowEmojiCard] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);

  let holdTimer: NodeJS.Timeout;
  let progressInterval: NodeJS.Timeout;

  const handleSOSPress = () => {
    setIsHolding(true);
    setHoldProgress(0);

    progressInterval = setInterval(() => {
      setHoldProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 5;
      });
    }, 100);

    holdTimer = setTimeout(() => {
      setIsHolding(false);
      setShowSOSConfirm(true);
      clearInterval(progressInterval);
      setHoldProgress(0);
    }, 2000);
  };

  const handleSOSRelease = () => {
    clearTimeout(holdTimer);
    clearInterval(progressInterval);
    setIsHolding(false);
    setHoldProgress(0);
  };

  const handleSOSConfirm = () => {
    const emergencyNumber = '911';
    window.open(`tel:${emergencyNumber}`, '_self');
    
    console.log('SOS triggered:', { timestamp: new Date() });
    
    setShowSOSConfirm(false);
    
    setTimeout(() => {
      toast({
        title: "Are you safe?",
        description: "Tap to update safety status",
        action: (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => toast({ title: "Good to hear!" })}>
              I'm OK
            </Button>
          </div>
        ),
      });
    }, 3000);
  };

  const handleEndConfirm = () => {
    setShowEndConfirm(false);
    onEndMeeting();
  };

  const contextText = landmark && venue ? `${venue} — ${landmark}` : venue || spaceName || "Current location";

  return (
    <>
      <div className="gradient-card border-2 border-primary/20 rounded-3xl p-5 shadow-lg animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-success animate-pulse" />
              <h3 className="font-semibold text-foreground">Meeting in progress</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Meeting {userName} {sharedEmojiCode && sharedEmojiCode}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              at {contextText}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {sharedEmojiCode && venue && landmark && (
            <Button
              onClick={() => setShowEmojiCard(true)}
              variant="outline"
              className="flex-1 rounded-full font-semibold"
            >
              <Fingerprint className="w-4 h-4 mr-2" />
              Identify
            </Button>
          )}
          <button
            onMouseDown={handleSOSPress}
            onMouseUp={handleSOSRelease}
            onMouseLeave={handleSOSRelease}
            onTouchStart={handleSOSPress}
            onTouchEnd={handleSOSRelease}
            className="relative flex-1 px-4 py-3 bg-destructive text-destructive-foreground rounded-full font-semibold hover:bg-destructive/90 transition-all active:scale-95"
          >
            <span className="relative z-10">SOS (hold)</span>
            {isHolding && (
              <div
                className="absolute inset-0 bg-destructive-foreground/20 rounded-full transition-all"
                style={{ width: `${holdProgress}%` }}
              />
            )}
          </button>

          <Button
            onClick={() => setShowEndConfirm(true)}
            variant="outline"
            className="flex-1 rounded-full font-semibold"
          >
            End Meeting
          </Button>
        </div>

        {onViewPlan && (
          <button
            onClick={onViewPlan}
            className="w-full mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors underline"
          >
            View plan
          </button>
        )}
      </div>

      <SOSConfirm
        open={showSOSConfirm}
        onClose={() => setShowSOSConfirm(false)}
        onConfirm={handleSOSConfirm}
      />

      <AlertDialog open={showEndConfirm} onOpenChange={setShowEndConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End this meeting?</AlertDialogTitle>
            <AlertDialogDescription>
              This will close the active meeting window and ask you to rate your experience.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleEndConfirm}>
              End & Rate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {sharedEmojiCode && venue && landmark && (
        <EmojiCard
          open={showEmojiCard}
          onClose={() => setShowEmojiCard(false)}
          emojiCode={sharedEmojiCode}
          venueName={venue}
          landmark={landmark}
        />
      )}
    </>
  );
};
