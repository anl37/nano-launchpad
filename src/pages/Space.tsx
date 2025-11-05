import { useState, useEffect } from "react";
import { UserCard } from "@/components/UserCard";
import { ConnectToggle } from "@/components/ConnectToggle";
import { SurpriseMe } from "@/components/SurpriseMe";
import { MapPin, Users } from "lucide-react";
import { getCurrentTime } from "@/lib/time-utils";
import { TabNavigation } from "@/components/TabNavigation";
import { ActiveMeetingWindow } from "@/components/ActiveMeetingWindow";
import { ConnectPing } from "@/components/ConnectPing";
import { useMeeting } from "@/context/MeetingContext";
import { LocationIndicator } from "@/components/LocationIndicator";
import { LocationPermissionPrompt } from "@/components/LocationPermissionPrompt";
import { useGeolocation } from "@/hooks/useGeolocation";
import { usePresenceUpdates } from "@/hooks/usePresenceUpdates";
import { useNearbyMatches } from "@/hooks/useNearbyMatches";
import { findNearestVenue } from "@/lib/location-utils";
import { getPlaceNameFromCoords } from "@/lib/geocoding-utils";
import { DURHAM_RECS } from "@/config/city";
import { useToast } from "@/hooks/use-toast";
import { useConnectionRequest } from "@/hooks/useConnectionRequest";
import { useLocationRecording } from "@/hooks/useLocationRecording";

// Mock data
const mockUsers = [
  {
    id: "1",
    name: "Alex",
    avatar: "👨‍💻",
    headline: "Coffee & code enthusiast",
    lastSeen: "Just now",
    activities: ["Running", "Coffee", "Tech"],
    score: 87,
    weeklyVisits: [0, 1, 2, 1, 3, 2, 1],
    bio: "Software developer who loves morning runs and quality coffee. Always down for a chat about startups or trail running.",
    typicalTimes: "Mornings 7-9 AM, Evenings 6-8 PM",
    emojiSignature: "☕"
  },
  {
    id: "2",
    name: "Jordan",
    avatar: "🎨",
    headline: "Design & yoga",
    lastSeen: "2m ago",
    activities: ["Yoga", "Art", "Coffee"],
    score: 92,
    weeklyVisits: [2, 2, 1, 2, 2, 3, 1],
    bio: "Product designer balancing pixels and pranayama. Looking for creative conversations and post-workout smoothie buddies.",
    typicalTimes: "Mornings 8-10 AM, Lunch 12-1 PM",
    emojiSignature: "🧘"
  },
  {
    id: "3",
    name: "Sam",
    avatar: "📚",
    headline: "Books & morning walks",
    lastSeen: "5m ago",
    activities: ["Reading", "Walking", "Coffee"],
    score: 78,
    weeklyVisits: [1, 0, 2, 1, 1, 2, 2],
    bio: "Book lover and early bird. Always have a recommendation ready and enjoy philosophical morning conversations.",
    typicalTimes: "Early mornings 6-8 AM",
    emojiSignature: "📚"
  }
];

const Space = () => {
  const [connectEnabled, setConnectEnabled] = useState(() => {
    const saved = localStorage.getItem('connectEnabled');
    return saved === 'true';
  });
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(getCurrentTime());
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [connectTargetUser, setConnectTargetUser] = useState<string>("");
  const [connectTargetUserId, setConnectTargetUserId] = useState<string>("");
  const [directMeetCode, setDirectMeetCode] = useState('');
  const [directMeetingData, setDirectMeetingData] = useState<{
    sharedEmojiCode: string;
    venueName: string;
    landmark: string;
  } | null>(null);
  const [currentVenue, setCurrentVenue] = useState({ name: "Peak Coffee Lab", emoji: "🌿" });
  
  const { currentMeeting, startMeeting, endMeeting, addOrUpdateConnection } = useMeeting();
  
  // Location tracking (always enabled, not tied to Connect status)
  const { location, status, toggleTracking, isMockLocation, startTracking } = useGeolocation({
    enabled: true, // Always track when user has granted permission
    highAccuracy: !!currentMeeting,
  });
  
  // Presence updates (throttled publishing)
  usePresenceUpdates({
    enabled: true, // Always publish when location available
    location,
  });
  
  // Nearby matching (only when Connect is enabled)
  const { nearbyUsers, loading: matchingLoading } = useNearbyMatches({
    location,
    enabled: connectEnabled,
  });
  
  // Background location recording for activity learning
  useLocationRecording({
    location,
    enabled: status === 'live' && !isMockLocation, // Only record real locations
  });
  
  const { toast } = useToast();
  const { sendConnectionRequest } = useConnectionRequest();
  
  // Convert nearbyUsers to display format
  const visibleUsers = nearbyUsers.map((user, index) => ({
    id: user.id,
    name: user.name,
    avatar: user.emoji_signature || "👤",
    headline: `${user.sharedInterests.join(', ')} • ${Math.round(user.distance)}m away`,
    lastSeen: "Now",
    activities: user.interests,
    score: user.compatibilityScore ?? (100 - index * 5), // Use adaptive score or fallback
    weeklyVisits: [1, 2, 1, 2, 3, 2, 1], // Mock data
    bio: `Shares interests: ${user.sharedInterests.join(', ')}`,
    typicalTimes: "Various times",
    emojiSignature: user.emoji_signature || "👤",
    sharedInterests: user.sharedInterests, // Pass shared interests
    distance: user.distance, // Pass actual distance
    compatibilityScore: user.compatibilityScore, // Include adaptive score
  }));


  const handleConnect = (userId: string, userName: string) => {
    setConnectTargetUserId(userId);
    setConnectTargetUser(userName);
    const meetCode = `🐢-${Math.floor(Math.random() * 99)}`;
    setDirectMeetCode(meetCode);
    setShowConnectDialog(true);
  };

  const handleStartTalkingSurprise = (data: { userName: string; interests: string[] }) => {
    const meetCode = `🐢-${Math.floor(Math.random() * 99)}`;
    
    startMeeting({
      id: `meeting-${Date.now()}`,
      sessionId: `session-${Date.now()}`,
      type: 'SURPRISE',
      userName: data.userName,
      meetCode,
      startedAt: new Date(),
      spaceName: currentVenue.name,
    });
    
    // Add to connections with actual matched user data
    addOrUpdateConnection(
      `user-${Date.now()}`,
      data.userName,
      data.interests
    );
  };

  const handleStartTalkingDirect = (data: { sharedEmojiCode: string; venueName: string; landmark: string }) => {
    const selectedUser = visibleUsers.find(u => u.name === connectTargetUser);
    
    // Convert user activities to interests (lowercase)
    const userInterests = selectedUser?.activities.map(a => a.toLowerCase()) || ["coffee"];
    
    setDirectMeetingData(data);
    
    startMeeting({
      id: `meeting-${Date.now()}`,
      sessionId: `session-${Date.now()}`,
      type: 'DIRECT',
      userName: connectTargetUser,
      meetCode: directMeetCode,
      startedAt: new Date(),
      venue: data.venueName,
      landmark: data.landmark,
      sharedEmojiCode: data.sharedEmojiCode,
    });
    
    // Add to connections
    addOrUpdateConnection(
      selectedUser?.id || `user-${Date.now()}`,
      connectTargetUser,
      userInterests
    );
  };

  // Update venue based on location using secure edge function
  useEffect(() => {
    const updateVenueFromLocation = async () => {
      if (!location) return;
      
      // Try Google Maps via secure edge function first
      try {
        const googlePlace = await getPlaceNameFromCoords(
          location.lat, 
          location.lng
        );
        
        if (googlePlace) {
          setCurrentVenue(googlePlace);
          return;
        }
      } catch (error) {
        console.error('Google Maps lookup failed, trying local venues:', error);
      }
      
      // Fallback to local Durham venue matching with strict proximity (50m = ~160ft)
      const nearestVenue = findNearestVenue(location.lat, location.lng, DURHAM_RECS, 50);
      
      if (nearestVenue) {
        setCurrentVenue({ name: nearestVenue.name, emoji: nearestVenue.emoji });
        return;
      }
      
      // Try slightly wider radius (150m = ~500ft)  
      const nearestVenueWide = findNearestVenue(location.lat, location.lng, DURHAM_RECS, 150);
      
      if (nearestVenueWide) {
        const distanceM = Math.round(nearestVenueWide.distance);
        if (distanceM < 100) {
          // Close enough, just show the venue name
          setCurrentVenue({ name: nearestVenueWide.name, emoji: nearestVenueWide.emoji });
        } else {
          // Show distance for venues 100m+ away
          setCurrentVenue({ 
            name: `${distanceM}m from ${nearestVenueWide.name}`, 
            emoji: "📍" 
          });
        }
        return;
      }
      
      // No close venues found
      setCurrentVenue({ name: "Exploring Durham", emoji: "🗺️" });
    };
    
    updateVenueFromLocation();
  }, [location, toast]);

  // Persist connect status
  useEffect(() => {
    localStorage.setItem('connectEnabled', connectEnabled.toString());
  }, [connectEnabled]);

  // Update time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(getCurrentTime());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-subtle pb-24">
      {/* Active Meeting Bar - Only on Home tab */}
      {currentMeeting?.status === 'active' && (
        <div className="p-4 max-w-2xl mx-auto">
          <ActiveMeetingWindow
            userName={currentMeeting.userName}
            meetCode={currentMeeting.meetCode}
            startAt={currentMeeting.startedAt}
            spaceName={currentMeeting.spaceName}
            venue={currentMeeting.venue}
            landmark={currentMeeting.landmark}
            sharedEmojiCode={currentMeeting.sharedEmojiCode}
            onEndMeeting={() => endMeeting('manual')}
          />
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border shadow-soft">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-lg">{currentVenue.emoji}</span>
              </div>
              <div>
                <h1 className="font-bold text-base">{currentVenue.name}</h1>
                <p className="text-xs text-muted-foreground">
                  Now • {currentTime} • Downtown
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <LocationIndicator 
                status={status} 
                onToggle={toggleTracking} 
                isMockLocation={isMockLocation}
                coords={location ? {
                  lat: location.lat,
                  lng: location.lng,
                  accuracy: location.accuracy
                } : null}
              />
              <ConnectToggle enabled={connectEnabled} onToggle={setConnectEnabled} />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Presence Glow */}
        {connectEnabled && (
          <div className="relative">
            <div className="absolute inset-0 bg-success/5 rounded-3xl animate-pulse shadow-glow" />
            <div className="relative bg-card/50 backdrop-blur border border-success/20 rounded-3xl p-6 shadow-soft">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-success animate-pulse shadow-glow" />
                <div className="flex-1">
                  <p className="font-semibold text-foreground">You're here</p>
                  <p className="text-sm text-muted-foreground">People within 100 m can see you</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Surprise Me - Main CTA */}
        {connectEnabled && (
          <div className="flex flex-col items-center gap-3 py-4">
            <SurpriseMe 
              isInSpace={connectEnabled}
              onStartTalking={handleStartTalkingSurprise}
            />
            <p className="text-xs text-muted-foreground text-center max-w-xs">
              Get randomly paired with someone spontaneous
            </p>
          </div>
        )}

        {/* People Grid - Limited to 6 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <h2 className="font-semibold text-foreground">Nearby</h2>
              </div>
              <span className="text-xs text-muted-foreground px-3 py-1 rounded-full bg-muted/50">
                {connectEnabled 
                  ? `${visibleUsers.length} ${visibleUsers.length === 1 ? 'person' : 'people'}`
                  : 'Connect off'
                }
              </span>
            </div>

          {/* Location Permission Issues */}
          {(status === 'denied' || status === 'error' || status === 'unsupported') && (
            <LocationPermissionPrompt status={status} onRetry={startTracking} />
          )}

          {!connectEnabled ? (
            <div className="gradient-card rounded-3xl p-10 text-center shadow-soft">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/5 flex items-center justify-center">
                <Users className="w-10 h-10 text-primary/40" />
              </div>
              <h3 className="font-semibold mb-2 text-foreground">Turn on Connect</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
                See who's here and let them see you
              </p>
              <button 
                onClick={() => setConnectEnabled(true)} 
                className="gradient-warm px-6 py-3 rounded-full font-medium shadow-soft hover:shadow-elegant transition-all"
              >
                Enable Connect
              </button>
            </div>
          ) : visibleUsers.length === 0 ? (
            <div className="gradient-card rounded-3xl p-10 text-center shadow-soft">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/5 flex items-center justify-center">
                <MapPin className="w-10 h-10 text-primary/40" />
              </div>
              <h3 className="font-semibold mb-2 text-foreground">No one nearby yet</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                {matchingLoading 
                  ? "Searching for people nearby..."
                  : "Be the first! Others within 100m who share your interests will appear here."
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {visibleUsers.map((user) => (
                <UserCard
                  key={user.id}
                  user={user}
                  onSelect={() => setSelectedUserId(user.id)}
                  onConnect={handleConnect}
                />
              ))}
            </div>
          )}
        </div>

        <p className="text-xs text-center text-muted-foreground pt-4">
          Less app, more friend
        </p>
      </div>

      <ConnectPing
        open={showConnectDialog}
        onOpenChange={setShowConnectDialog}
        userName={connectTargetUser}
        meetCode={directMeetCode}
        onSendRequest={() => sendConnectionRequest(connectTargetUserId, connectTargetUser)}
        onStartTalking={handleStartTalkingDirect}
      />

      <TabNavigation />
    </div>
  );
};

export default Space;
