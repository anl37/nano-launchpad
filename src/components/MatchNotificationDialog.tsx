import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useMatchNotifications } from "@/hooks/useMatchNotifications";
import { IcebreakerScreen } from "@/components/IcebreakerScreen";
import { Sparkles } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMeeting } from "@/context/MeetingContext";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface MeetingDetails {
  sharedEmojiCode: string;
  venueName: string;
  landmark: string;
  meetCode: string;
}

export const MatchNotificationDialog = () => {
  const { newMatch, clearMatch } = useMatchNotifications();
  const { startMeeting, addOrUpdateConnection } = useMeeting();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showIcebreaker, setShowIcebreaker] = useState(false);
  const [meetingDetails, setMeetingDetails] = useState<MeetingDetails | null>(null);
  const [matchedUserInterests, setMatchedUserInterests] = useState<string[]>([]);
  const lastMatchId = useRef<string | null>(null);

  // Load meeting details from database
  useEffect(() => {
    if (newMatch && newMatch.matchId !== lastMatchId.current) {
      lastMatchId.current = newMatch.matchId;
      
      const loadMeetingDetails = async () => {
        const { data, error } = await supabase
          .from('matches')
          .select('venue_name, landmark, meet_code, shared_emoji_code, shared_interests')
          .eq('id', newMatch.matchId)
          .single();
        
        if (error) {
          console.error('[MatchNotification] Error loading meeting details:', error);
          return;
        }
        
        if (data) {
          setMeetingDetails({
            sharedEmojiCode: data.shared_emoji_code || '🎉🎊',
            venueName: data.venue_name || 'Current location',
            landmark: data.landmark || 'Main entrance',
            meetCode: data.meet_code || 'MEET0000'
          });
          setMatchedUserInterests(data.shared_interests || []);
        }
      };
      
      loadMeetingDetails();
    }
  }, [newMatch]);

  const handleContinue = () => {
    setShowIcebreaker(true);
  };

  const handleStartTalking = async () => {
    console.log('[MatchNotification] handleStartTalking called', { newMatch, meetingDetails, user: !!user });
    
    if (!newMatch || !meetingDetails || !user) {
      console.log('[MatchNotification] Missing required data, aborting');
      return;
    }

    // Update match status in database to 'talking'
    const { error } = await supabase
      .from('matches')
      .update({ status: 'talking' })
      .eq('id', newMatch.matchId);

    if (error) {
      console.warn('[MatchNotification] Proceeding despite status update error:', error);
    }

    // Start meeting in local context
    startMeeting({
      id: `meeting-${Date.now()}`,
      sessionId: newMatch.matchId,
      type: 'DIRECT',
      userName: newMatch.matchedUserName,
      meetCode: meetingDetails.meetCode,
      startedAt: new Date(),
      venue: meetingDetails.venueName,
      landmark: meetingDetails.landmark,
      sharedEmojiCode: meetingDetails.sharedEmojiCode,
    });

    // Add connection for Next Up tab
    addOrUpdateConnection(
      newMatch.matchedUserId,
      newMatch.matchedUserName,
      matchedUserInterests
    );

    // Close dialogs and navigate to space
    setShowIcebreaker(false);
    clearMatch();
    lastMatchId.current = null;
    setMeetingDetails(null);
    navigate('/space');
  };

  if (!newMatch || !meetingDetails) return null;

  return (
    <>
    <Dialog open={!!newMatch && !showIcebreaker} onOpenChange={(open) => !open && clearMatch()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 justify-center text-2xl">
            <Sparkles className="w-6 h-6 text-success" />
            It's a Match!
            <Sparkles className="w-6 h-6 text-success" />
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="text-center">
            <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-warm flex items-center justify-center text-5xl shadow-glow animate-bounce">
              🎉
            </div>
            <p className="text-lg font-semibold mb-2">
              You're now connected with {newMatch.matchedUserName}!
            </p>
            <p className="text-sm text-muted-foreground">
              You can now start planning meetups together
            </p>
          </div>

          <Button
            onClick={handleContinue}
            className="w-full gradient-warm shadow-soft hover:shadow-glow transition-all"
          >
            Let's Meet!
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    <IcebreakerScreen
      open={showIcebreaker}
      onClose={() => {
        setShowIcebreaker(false);
        clearMatch();
        lastMatchId.current = null;
        setMeetingDetails(null);
      }}
      userName={newMatch.matchedUserName}
      meetCode={meetingDetails.meetCode}
      sharedEmojiCode={meetingDetails.sharedEmojiCode}
      venueName={meetingDetails.venueName}
      landmark={meetingDetails.landmark}
      onStartTalking={handleStartTalking}
    />
  </>
  );
};
