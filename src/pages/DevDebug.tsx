import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useNearbyMatches } from '@/hooks/useNearbyMatches';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, MapPin, Users, Database, Activity } from 'lucide-react';
import { formatDistance } from '@/lib/geo';
import { FEATURE_FLAGS } from '@/config/featureFlags';
import { useToast } from '@/hooks/use-toast';

const DevDebug = () => {
  const { user } = useAuth();
  const { location, status, isMockLocation } = useGeolocation({ enabled: true });
  const { nearbyUsers, loading: matchingLoading, refetch } = useNearbyMatches({
    location,
    enabled: true,
  });
  const { toast } = useToast();
  
  const [lastPresenceUpdate, setLastPresenceUpdate] = useState<Date | null>(null);
  const [presenceData, setPresenceData] = useState<any>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [matchCount, setMatchCount] = useState(0);

  // Fetch presence data
  useEffect(() => {
    if (!user) return;

    const fetchPresence = async () => {
      const { data } = await supabase
        .from('presence' as any)
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle() as any;

      if (data) {
        setPresenceData(data);
        setLastPresenceUpdate(new Date(data.updated_at));
      }
    };

    fetchPresence();
    const interval = setInterval(fetchPresence, 5000);
    return () => clearInterval(interval);
  }, [user]);

  // Fetch profile data
  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      const { data } = await supabase
        .from('profiles' as any)
        .select('*')
        .eq('id', user.id)
        .single() as any;

      if (data) {
        setProfileData(data);
      }
    };

    fetchProfile();
  }, [user]);

  // Fetch match count
  useEffect(() => {
    if (!user) return;

    const fetchMatches = async () => {
      const { data } = await supabase
        .from('matches' as any)
        .select('id')
        .or(`uid_a.eq.${user.id},uid_b.eq.${user.id}`) as any;

      setMatchCount(data?.length || 0);
    };

    fetchMatches();
  }, [user, nearbyUsers]);

  const handleForceUpdate = async () => {
    if (!location || !user) return;

    try {
      const { error } = await supabase
        .from('profiles' as any)
        .update({
          lat: location.lat,
          lng: location.lng,
          location_updated_at: new Date().toISOString(),
        } as any)
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: 'Location Updated',
        description: 'Force-published current location to database',
      });
      
      // Refetch nearby users
      refetch();
    } catch (error) {
      console.error('Force update error:', error);
      toast({
        title: 'Update Failed',
        description: 'Could not force-update location',
        variant: 'destructive',
      });
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background p-8 flex items-center justify-center">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Please log in to view debug info</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Developer Debug</h1>
          <Badge variant="outline" className="text-xs">
            {isMockLocation ? 'MOCK LOCATION' : 'REAL GPS'}
          </Badge>
        </div>

        {/* User Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              User Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 font-mono text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">User ID:</span>
              <span className="text-right">{user.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email:</span>
              <span>{user.email}</span>
            </div>
            {profileData && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name:</span>
                  <span>{profileData.name || 'Not set'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Interests:</span>
                  <span>{profileData.interests?.join(', ') || 'None'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Onboarded:</span>
                  <Badge variant={profileData.onboarded ? 'default' : 'secondary'}>
                    {profileData.onboarded ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Visible:</span>
                  <Badge variant={profileData.is_visible ? 'default' : 'secondary'}>
                    {profileData.is_visible ? 'Yes' : 'No'}
                  </Badge>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Location Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Location Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Status:</span>
              <Badge variant={status === 'live' ? 'default' : 'secondary'}>
                {status.toUpperCase()}
              </Badge>
            </div>
            
            {location && (
              <>
                <div className="font-mono text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Latitude:</span>
                    <span>{location.lat.toFixed(6)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Longitude:</span>
                    <span>{location.lng.toFixed(6)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Accuracy:</span>
                    <span>{Math.round(location.accuracy)}m</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Speed:</span>
                    <span>{location.speed ? `${location.speed.toFixed(1)} m/s` : 'N/A'}</span>
                  </div>
                </div>

                <Button onClick={handleForceUpdate} className="w-full" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Force Update Location
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Presence Data */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              Presence Table
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 font-mono text-xs">
            {presenceData ? (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Updated:</span>
                  <span>{lastPresenceUpdate?.toLocaleTimeString() || 'Never'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Geohash:</span>
                  <span>{presenceData.geohash || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Coords:</span>
                  <span>
                    {presenceData.lat?.toFixed(6)}, {presenceData.lng?.toFixed(6)}
                  </span>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">No presence data yet</p>
            )}
          </CardContent>
        </Card>

        {/* Nearby Matches */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Nearby Matches ({nearbyUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Total Matches in DB:</span>
              <Badge>{matchCount}</Badge>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Currently Nearby:</span>
              <Badge variant="default">{nearbyUsers.length}</Badge>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Loading:</span>
              <Badge variant={matchingLoading ? 'default' : 'secondary'}>
                {matchingLoading ? 'Yes' : 'No'}
              </Badge>
            </div>

            {nearbyUsers.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">Active Matches:</p>
                {nearbyUsers.map((user) => (
                  <div key={user.id} className="bg-muted/50 p-2 rounded text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="font-semibold">{user.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {formatDistance(user.distance)}
                      </Badge>
                    </div>
                    <div className="text-muted-foreground">
                      Shared: {user.sharedInterests.join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Feature Flags */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Feature Flags</CardTitle>
          </CardHeader>
          <CardContent className="font-mono text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Background Location:</span>
              <span>{FEATURE_FLAGS.backgroundLocation ? '✅' : '❌'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Debug Logging:</span>
              <span>{FEATURE_FLAGS.debugPresenceLogging ? '✅' : '❌'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Max Match Distance:</span>
              <span>{FEATURE_FLAGS.maxMatchDistanceMeters}m</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Min Displacement:</span>
              <span>{FEATURE_FLAGS.locationThrottle.minDisplacementMeters}m</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Min Interval (Moving):</span>
              <span>{FEATURE_FLAGS.locationThrottle.minIntervalMovingSeconds}s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Min Interval (Stationary):</span>
              <span>{FEATURE_FLAGS.locationThrottle.minIntervalStationarySeconds}s</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DevDebug;
