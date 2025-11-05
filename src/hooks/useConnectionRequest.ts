import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export const useConnectionRequest = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const sendConnectionRequest = async (receiverId: string, receiverName: string) => {
    if (!user?.id) {
      toast.error("You must be logged in to connect");
      return { success: false };
    }

    if (user.id === receiverId) {
      toast.error("You cannot connect with yourself");
      return { success: false };
    }

    setIsLoading(true);
    try {
      // Check if already connected or request exists
      const pairId = [user.id, receiverId].sort().join('_');
      
      const { data: existingMatch } = await supabase
        .from('matches')
        .select('id, status')
        .eq('pair_id', pairId)
        .maybeSingle();

      if (existingMatch && existingMatch.status === 'connected') {
        toast.error("You're already connected with this person");
        return { success: false };
      }

      const { data: existingRequest } = await supabase
        .from('connection_requests')
        .select('id, status')
        .eq('sender_id', user.id)
        .eq('receiver_id', receiverId)
        .in('status', ['pending'])
        .maybeSingle();

      if (existingRequest) {
        toast.error("Connection request already sent");
        return { success: false };
      }

      // Check if receiver has auto-accept enabled
      const { data: receiverProfile, error: profileError } = await supabase
        .from('profiles')
        .select('auto_accept_connections, name')
        .eq('id', receiverId)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching receiver profile:', profileError);
        toast.error("Failed to check receiver preferences");
        return { success: false };
      }

      if (!receiverProfile) {
        toast.error("Receiver profile not found");
        return { success: false };
      }

      

      // Explicitly check if auto-accept is enabled (must be true, not null or false)
      if (receiverProfile.auto_accept_connections === true) {
        // Auto-accept: Fetch locations and create match with meeting details
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('id, lat, lng')
          .in('id', [user.id, receiverId]);

        if (profileError || !profiles || profiles.length !== 2) {
          toast.error("Failed to fetch user locations");
          return { success: false };
        }

        const userProfile = profiles.find(p => p.id === user.id);
        const receiverProfileData = profiles.find(p => p.id === receiverId);

        if (!userProfile?.lat || !userProfile?.lng || !receiverProfileData?.lat || !receiverProfileData?.lng) {
          toast.error("User locations not available");
          return { success: false };
        }

        // Calculate midpoint
        const midLat = (userProfile.lat + receiverProfileData.lat) / 2;
        const midLng = (userProfile.lng + receiverProfileData.lng) / 2;

        // Geocode the midpoint
        let venueName = 'Current location';
        let landmark = 'Main entrance';
        let venueLat = midLat;
        let venueLng = midLng;

        try {
          const { data: geocodeData } = await supabase.functions.invoke('geocode-location', {
            body: { lat: midLat, lng: midLng }
          });

          if (geocodeData?.venueName) {
            venueName = geocodeData.venueName;
            venueLat = geocodeData.lat || midLat;
            venueLng = geocodeData.lng || midLng;
            
            const { generateContextualLandmark } = await import('@/lib/meeting-location-utils');
            landmark = generateContextualLandmark(venueName, geocodeData.types);
          }
        } catch (error) {
          console.error('Error geocoding location:', error);
        }

        // Generate meeting details
        const { generateEmojiCodes, generateMeetCode } = await import('@/lib/meeting-location-utils');
        const sharedEmojiCode = generateEmojiCodes();
        const meetCode = generateMeetCode();
        
        const { error: matchError } = await supabase
          .from('matches')
          .insert({
            uid_a: user.id < receiverId ? user.id : receiverId,
            uid_b: user.id < receiverId ? receiverId : user.id,
            pair_id: pairId,
            status: 'connected',
            venue_name: venueName,
            landmark: landmark,
            meet_code: meetCode,
            shared_emoji_code: sharedEmojiCode,
            venue_lat: venueLat,
            venue_lng: venueLng,
          });

        if (matchError) {
          if (matchError.code === '23505') {
            toast.error("You're already connected with this person");
          } else {
            toast.error("Failed to create connection");
          }
          return { success: false };
        }

        toast.success(`You're now connected with ${receiverName}!`);
        return { success: true, autoAccepted: true };
      } else {
        // Manual mode: Create connection request
        const { error: requestError } = await supabase
          .from('connection_requests')
          .insert({
            sender_id: user.id,
            receiver_id: receiverId,
            status: 'pending'
          });

        if (requestError) {
          if (requestError.code === '23505') {
            toast.error("Connection request already sent");
          } else {
            toast.error("Failed to send connection request");
          }
          return { success: false };
        }

        toast.success(`Connection request sent to ${receiverName}`);
        return { success: true, autoAccepted: false };
      }
    } catch (error) {
      console.error('Error sending connection request:', error);
      toast.error("Failed to connect");
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  };

  const acceptConnectionRequest = async (requestId: string, senderId: string) => {
    if (!user?.id) return { success: false };

    setIsLoading(true);
    try {
      // Fetch both users' locations
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, lat, lng')
        .in('id', [user.id, senderId]);

      if (profileError || !profiles || profiles.length !== 2) {
        toast.error("Failed to fetch user locations");
        return { success: false };
      }

      const userProfile = profiles.find(p => p.id === user.id);
      const senderProfile = profiles.find(p => p.id === senderId);

      if (!userProfile?.lat || !userProfile?.lng || !senderProfile?.lat || !senderProfile?.lng) {
        toast.error("User locations not available");
        return { success: false };
      }

      // Calculate midpoint
      const midLat = (userProfile.lat + senderProfile.lat) / 2;
      const midLng = (userProfile.lng + senderProfile.lng) / 2;

      // Geocode the midpoint to get venue name
      let venueName = 'Current location';
      let landmark = 'Main entrance';
      let venueLat = midLat;
      let venueLng = midLng;

      try {
        const { data: geocodeData } = await supabase.functions.invoke('geocode-location', {
          body: { lat: midLat, lng: midLng }
        });

        if (geocodeData?.venueName) {
          venueName = geocodeData.venueName;
          venueLat = geocodeData.lat || midLat;
          venueLng = geocodeData.lng || midLng;
          
          const { generateContextualLandmark } = await import('@/lib/meeting-location-utils');
          landmark = generateContextualLandmark(venueName, geocodeData.types);
        }
      } catch (error) {
        console.error('Error geocoding location:', error);
      }

      // Generate meeting details
      const { generateEmojiCodes, generateMeetCode } = await import('@/lib/meeting-location-utils');
      const sharedEmojiCode = generateEmojiCodes();
      const meetCode = generateMeetCode();

      const pairId = [user.id, senderId].sort().join('_');
      
      // Check if match already exists
      const { data: existingMatch } = await supabase
        .from('matches')
        .select('id, status')
        .eq('pair_id', pairId)
        .maybeSingle();

      if (existingMatch) {
        // Update existing match to connected with meeting details
        const { error: updateMatchError } = await supabase
          .from('matches')
          .update({ 
            status: 'connected',
            venue_name: venueName,
            landmark: landmark,
            meet_code: meetCode,
            shared_emoji_code: sharedEmojiCode,
            venue_lat: venueLat,
            venue_lng: venueLng,
          })
          .eq('id', existingMatch.id);

        if (updateMatchError) {
          toast.error("Failed to update connection");
          return { success: false };
        }
      } else {
        // Create new match with meeting details
        const { error: matchError } = await supabase
          .from('matches')
          .insert({
            uid_a: user.id < senderId ? user.id : senderId,
            uid_b: user.id < senderId ? senderId : user.id,
            pair_id: pairId,
            status: 'connected',
            venue_name: venueName,
            landmark: landmark,
            meet_code: meetCode,
            shared_emoji_code: sharedEmojiCode,
            venue_lat: venueLat,
            venue_lng: venueLng,
          });

        if (matchError) {
          toast.error(`Failed to create connection: ${matchError.message}`);
          return { success: false };
        }
      }

      // Update request status
      const { error: updateError } = await supabase
        .from('connection_requests')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', requestId);

      if (updateError) {
        console.error('Error updating request status:', updateError);
      }

      toast.success("Connection accepted!");
      return { success: true };
    } catch (error) {
      console.error('Error accepting connection request:', error);
      toast.error("Failed to accept connection");
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  };

  const rejectConnectionRequest = async (requestId: string) => {
    if (!user?.id) return { success: false };

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('connection_requests')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', requestId);

      if (error) {
        toast.error("Failed to reject connection");
        return { success: false };
      }

      toast.success("Connection request rejected");
      return { success: true };
    } catch (error) {
      console.error('Error rejecting connection request:', error);
      toast.error("Failed to reject connection");
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    sendConnectionRequest,
    acceptConnectionRequest,
    rejectConnectionRequest,
    isLoading
  };
};
