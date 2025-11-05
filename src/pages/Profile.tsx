import { useState, useEffect } from "react";
import { User, Clock, MapPin, Settings, Shield, Users } from "lucide-react";
import { TabNavigation } from "@/components/TabNavigation";
import { HeatmapDay } from "@/components/HeatmapDay";
import { ConnectionRequestsPanel } from "@/components/ConnectionRequestsPanel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useWeeklyPresence } from "@/hooks/useWeeklyPresence";
import { useActivityStats } from "@/hooks/useActivityStats";
import { useUserTrends } from "@/hooks/useUserTrends";
import { supabase } from "@/integrations/supabase/client";

const Profile = () => {
  const { user } = useAuth();
  const { weeklyData, loading: loadingWeekly } = useWeeklyPresence();
  const { activities, loading: loadingActivities } = useActivityStats();
  const { trends, loading: loadingTrends } = useUserTrends();
  const [safetyCheckins, setSafetyCheckins] = useState(false);
  const [emergencyNumber, setEmergencyNumber] = useState('911');
  const [userName, setUserName] = useState<string | null>(null);
  const [autoAcceptConnections, setAutoAcceptConnections] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('name, auto_accept_connections')
        .eq('id', user.id)
        .maybeSingle();
      
      if (data) {
        if (data.name) setUserName(data.name);
        setAutoAcceptConnections(data.auto_accept_connections || false);
      }
    };

    fetchProfile();
  }, [user?.id]);

  const handleAutoAcceptToggle = async (enabled: boolean) => {
    if (!user?.id) return;
    
    const { error } = await supabase
      .from('profiles')
      .update({ auto_accept_connections: enabled })
      .eq('id', user.id);
    
    if (!error) {
      setAutoAcceptConnections(enabled);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border shadow-soft">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-base">Profile</h1>
              <p className="text-xs text-muted-foreground">
                Your presence & preferences
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Profile Card */}
        <div className="gradient-card rounded-3xl p-6 shadow-soft text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center text-4xl">
            😊
          </div>
          <h2 className="text-xl font-bold text-foreground mb-1">{userName || 'You'}</h2>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>

        {/* Weekly Presence */}
        <div className="gradient-card rounded-3xl p-6 shadow-soft">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            Weekly Presence
          </h3>
          {loadingWeekly ? (
            <div className="text-center text-sm text-muted-foreground">Loading...</div>
          ) : (
            <>
              <div className="grid grid-cols-[auto_1fr] gap-2">
                <div className="flex flex-col justify-around text-xs text-muted-foreground py-1">
                  <span>Morning</span>
                  <span>Afternoon</span>
                  <span>Evening</span>
                </div>
                <div className="space-y-2">
                  {['morning', 'afternoon', 'evening'].map((timeOfDay) => (
                    <div key={timeOfDay} className="flex gap-1">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => {
                        const dayData = weeklyData.find(d => d.day === index);
                        const count = dayData?.timeOfDay?.[timeOfDay as keyof typeof dayData.timeOfDay] || 0;
                        const maxCount = Math.max(...weeklyData.flatMap(d => [d.timeOfDay.morning, d.timeOfDay.afternoon, d.timeOfDay.evening]), 1);
                        const intensity = count === 0 ? 0 : Math.ceil((count / maxCount) * 3);
                        const bgColors = ['bg-muted', 'bg-primary/30', 'bg-primary/60', 'bg-primary'];
                        
                        return (
                          <div
                            key={`${day}-${timeOfDay}`}
                            className={`flex-1 h-8 rounded ${bgColors[intensity]} transition-all flex items-center justify-center text-xs font-medium`}
                            title={`${day} ${timeOfDay}: ${count} visit${count !== 1 ? 's' : ''}`}
                          >
                            {count > 0 && <span className="opacity-70">{count}</span>}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                  <div className="flex justify-between text-xs text-muted-foreground pt-1">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <span key={day} className="flex-1 text-center">{day}</span>
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3 text-center">
                Checked in {weeklyData.reduce((sum, d) => sum + d.count, 0)}× this week
              </p>
            </>
          )}
        </div>

        {/* Top Activities */}
        <div className="gradient-card rounded-3xl p-6 shadow-soft">
          <h3 className="font-semibold text-foreground mb-4">Top Activities</h3>
          {loadingActivities ? (
            <div className="text-center text-sm text-muted-foreground">Loading...</div>
          ) : activities.length > 0 ? (
            <div className="space-y-3">
              {activities.map((activity, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{activity.icon}</span>
                    <span className="text-sm font-medium text-foreground">{activity.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{activity.frequency}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center">No activities tracked yet</p>
          )}
        </div>

        {/* Typical Times */}
        <div className="gradient-card rounded-3xl p-6 shadow-soft">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Usually Here
          </h3>
          {loadingTrends ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {trends?.typicalTimeWindow || 'Not enough data yet'}
            </p>
          )}
        </div>

        {/* My Trends */}
        <div className="gradient-card rounded-3xl p-6 shadow-soft">
          <h3 className="font-semibold text-foreground mb-3">My Trends</h3>
          {loadingTrends ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : trends ? (
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>{trends.connectionStats}</p>
              <p>Most active on {trends.mostActiveDay}, {trends.typicalTimeWindow}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Not enough data yet</p>
          )}
        </div>

        {/* Connection Requests */}
        <ConnectionRequestsPanel />

        {/* Connection Preferences */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground px-1 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Connection Preferences
          </h3>
          
          <Card className="p-4 gradient-card">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-0.5 flex-1">
                  <Label htmlFor="auto-accept" className="text-sm font-medium">
                    Auto-accept connections
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {autoAcceptConnections 
                      ? "You'll automatically connect with anyone who sends you a ping" 
                      : "You'll review each connection request before accepting"}
                  </p>
                </div>
                <Switch
                  id="auto-accept"
                  checked={autoAcceptConnections}
                  onCheckedChange={handleAutoAcceptToggle}
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Safety Settings */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground px-1 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Safety
          </h3>
          
          <Card className="p-4 gradient-card">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="checkins" className="text-sm font-medium">
                    Quick check-ins
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Get a safety prompt 30 min after meet starts
                  </p>
                </div>
                <Switch
                  id="checkins"
                  checked={safetyCheckins}
                  onCheckedChange={setSafetyCheckins}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergency" className="text-sm font-medium">
                  Emergency number
                </Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Default: {emergencyNumber} (US)
                </p>
              </div>

              <div className="pt-2 border-t border-border">
                <Button variant="link" className="text-xs p-0 h-auto">
                  About Safety & Privacy
                </Button>
              </div>
            </div>
          </Card>
        </div>

        <p className="text-xs text-center text-muted-foreground pt-4">
          Less app, more friend
        </p>
      </div>

      <TabNavigation />
    </div>
  );
};

export default Profile;
