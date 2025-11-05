import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface ConnectPingProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
  userId?: string;
  meetCode?: string;
  onSendRequest?: () => Promise<{ success: boolean; autoAccepted?: boolean }>;
  onStartTalking?: (data: { sharedEmojiCode: string; venueName: string; landmark: string }) => void;
}


export const ConnectPing = ({ open, onOpenChange, userName, userId, meetCode, onSendRequest, onStartTalking }: ConnectPingProps) => {
  const [status, setStatus] = useState<'sending' | 'sent'>('sending');
  const navigate = useNavigate();

  // Reset status when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setStatus('sending');
    }
    onOpenChange(newOpen);
  };

  const handleSend = async () => {
    if (onSendRequest) {
      const result = await onSendRequest();
      if (!result.success) {
        handleOpenChange(false);
        return;
      }
      // If auto-accepted, close the dialog immediately
      if (result.autoAccepted) {
        handleOpenChange(false);
        return;
      }
    }
    
    // Close dialog immediately after sending
    handleOpenChange(false);
    // Navigate to home after closing
    navigate("/");
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {status === 'sending' && `Connect with ${userName}?`}
              {status === 'sent' && 'Ping sent!'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Send a one-time ping to {userName}. They'll be notified and can choose to accept.
            </p>
            <Button onClick={handleSend} disabled={status === 'sent'} className="w-full gradient-warm shadow-soft rounded-full">
              {status === 'sent' ? 'Sending...' : 'Send Connect Ping'}
            </Button>
            <Button variant="outline" onClick={() => handleOpenChange(false)} className="w-full rounded-full">
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
  );
};
