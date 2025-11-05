import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useConnectionRequest } from "@/hooks/useConnectionRequest";
import { useIncomingConnectionRequests } from "@/hooks/useIncomingConnectionRequests";

export const IncomingConnectionRequestDialog = () => {
  const { currentRequest, removeRequest } = useIncomingConnectionRequests();
  const { acceptConnectionRequest, rejectConnectionRequest, isLoading } = useConnectionRequest();
  const [open, setOpen] = useState(false);

  // Only show dialog for manual acceptance (auto-accept is handled when request is sent)
  useEffect(() => {
    if (!currentRequest) return;
    // Show dialog for manual acceptance
    setOpen(true);
  }, [currentRequest]);

  const handleAccept = async () => {
    if (!currentRequest) return;

    // Close dialog immediately to prevent it staying open
    setOpen(false);
    
    const result = await acceptConnectionRequest(currentRequest.id, currentRequest.sender_id);
    
    if (result.success) {
      removeRequest(currentRequest.id);
    } else {
      // Reopen if failed
      setOpen(true);
    }
  };

  const handleReject = async () => {
    if (!currentRequest) return;

    const result = await rejectConnectionRequest(currentRequest.id);
    
    if (result.success) {
      setOpen(false);
      removeRequest(currentRequest.id);
    }
  };

  if (!currentRequest) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        setOpen(false);
        if (currentRequest) {
          removeRequest(currentRequest.id);
        }
      }
    }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Connection Request</DialogTitle>
          <DialogDescription>
            {currentRequest.sender_name} wants to connect with you
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-center py-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-warm flex items-center justify-center text-3xl shadow-soft">
              👋
            </div>
            <p className="text-sm text-muted-foreground">
              Accept this connection request to start connecting!
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleReject}
              disabled={isLoading}
              variant="outline"
              className="flex-1"
            >
              Reject
            </Button>
            <Button
              onClick={handleAccept}
              disabled={isLoading}
              className="flex-1 gradient-warm shadow-soft"
            >
              Accept
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
