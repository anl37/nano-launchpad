import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

interface RequestStatusUpdate {
  requestId: string;
  receiverId: string;
  receiverName: string;
  status: 'accepted' | 'rejected';
}

export const useConnectionRequestStatus = () => {
  const { user } = useAuth();
  const [statusUpdate, setStatusUpdate] = useState<RequestStatusUpdate | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    // Listen for updates to connection requests sent by this user
    const channel = supabase
      .channel('connection-request-status')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'connection_requests',
          filter: `sender_id=eq.${user.id}`
        },
        async (payload) => {
          const request = payload.new;
          
          if (request.status === 'rejected') {
            // Fetch receiver name
            const { data: receiverProfile } = await supabase
              .from('profiles')
              .select('name')
              .eq('id', request.receiver_id)
              .single();

            const receiverName = receiverProfile?.name || 'This user';
            
            toast.info(`${receiverName} is not available to connect right now. Thanks for your interest!`);
            
            setStatusUpdate({
              requestId: request.id,
              receiverId: request.receiver_id,
              receiverName,
              status: 'rejected'
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const clearStatus = () => {
    setStatusUpdate(null);
  };

  return {
    statusUpdate,
    clearStatus
  };
};
