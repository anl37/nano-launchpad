import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

interface IncomingRequest {
  id: string;
  sender_id: string;
  sender_name: string;
  created_at: string;
}

export const useIncomingConnectionRequests = () => {
  const { user } = useAuth();
  const [incomingRequests, setIncomingRequests] = useState<IncomingRequest[]>([]);
  const [currentRequest, setCurrentRequest] = useState<IncomingRequest | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    // Fetch initial pending requests
    const fetchPendingRequests = async () => {
      const { data, error } = await supabase
        .from('connection_requests')
        .select('id, sender_id, created_at')
        .eq('receiver_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching pending requests:', error);
        return;
      }

      if (data && data.length > 0) {
        // Fetch sender profiles
        const senderIds = data.map(req => req.sender_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', senderIds);

        const profilesMap = new Map(profiles?.map(p => [p.id, p.name]) || []);

        const requests = data.map(req => ({
          id: req.id,
          sender_id: req.sender_id,
          sender_name: profilesMap.get(req.sender_id) || 'Someone',
          created_at: req.created_at
        }));
        setIncomingRequests(requests);
        setCurrentRequest(requests[0]);
      }
    };

    fetchPendingRequests();

    // Listen for new connection requests in real-time
    const channel = supabase
      .channel('incoming-connection-requests')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'connection_requests',
          filter: `receiver_id=eq.${user.id}`
        },
        async (payload) => {
          console.log('New connection request received:', payload);
          
          // Fetch sender profile to get name
          const { data: senderProfile } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', payload.new.sender_id)
            .single();

          const newRequest: IncomingRequest = {
            id: payload.new.id,
            sender_id: payload.new.sender_id,
            sender_name: senderProfile?.name || 'Someone',
            created_at: payload.new.created_at
          };

          setIncomingRequests(prev => [...prev, newRequest]);
          if (!currentRequest) {
            setCurrentRequest(newRequest);
          }
          
          toast.info(`${newRequest.sender_name} wants to connect!`);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, currentRequest]);

  const removeRequest = (requestId: string) => {
    setIncomingRequests(prev => {
      const updated = prev.filter(r => r.id !== requestId);
      if (currentRequest?.id === requestId) {
        setCurrentRequest(updated[0] || null);
      }
      return updated;
    });
  };

  return {
    currentRequest,
    incomingRequests,
    removeRequest
  };
};
