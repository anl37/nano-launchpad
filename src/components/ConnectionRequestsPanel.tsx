import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useConnectionRequest } from "@/hooks/useConnectionRequest";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, UserPlus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ConnectionRequest {
  id: string;
  sender_id: string;
  created_at: string;
  sender: {
    name: string | null;
    emoji_signature: string | null;
    interests: string[] | null;
  };
}

export const ConnectionRequestsPanel = () => {
  const { user } = useAuth();
  const { acceptConnectionRequest, rejectConnectionRequest, isLoading } = useConnectionRequest();
  const [requests, setRequests] = useState<ConnectionRequest[]>([]);

  useEffect(() => {
    if (!user?.id) return;

    const fetchRequests = async () => {
      const { data } = await supabase
        .from('connection_requests')
        .select(`
          id,
          sender_id,
          created_at,
          sender:profiles!connection_requests_sender_id_fkey(name, emoji_signature, interests)
        `)
        .eq('receiver_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (data) {
        setRequests(data as any);
      }
    };

    fetchRequests();

    // Subscribe to new requests
    const channel = supabase
      .channel('connection_requests_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'connection_requests',
          filter: `receiver_id=eq.${user.id}`
        },
        () => {
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const handleAccept = async (requestId: string, senderId: string) => {
    const result = await acceptConnectionRequest(requestId, senderId);
    if (result.success) {
      setRequests(prev => prev.filter(req => req.id !== requestId));
    }
  };

  const handleReject = async (requestId: string) => {
    const result = await rejectConnectionRequest(requestId);
    if (result.success) {
      setRequests(prev => prev.filter(req => req.id !== requestId));
    }
  };

  if (requests.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground px-1 flex items-center gap-2">
        <UserPlus className="w-4 h-4" />
        Connection Requests ({requests.length})
      </h3>
      
      <div className="space-y-2">
        {requests.map((request) => (
          <Card key={request.id} className="p-4 gradient-card">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-warm flex items-center justify-center text-2xl shadow-soft flex-shrink-0">
                  {request.sender.emoji_signature || '👤'}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-foreground">
                    {request.sender.name || 'Anonymous'}
                  </h4>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                  </div>
                  {request.sender.interests && request.sender.interests.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {request.sender.interests.slice(0, 3).map((interest) => (
                        <Badge key={interest} variant="outline" className="text-xs">
                          {interest}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => handleAccept(request.id, request.sender_id)}
                  disabled={isLoading}
                  className="flex-1 gradient-warm"
                  size="sm"
                >
                  Accept
                </Button>
                <Button
                  onClick={() => handleReject(request.id)}
                  disabled={isLoading}
                  variant="outline"
                  className="flex-1"
                  size="sm"
                >
                  Decline
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
