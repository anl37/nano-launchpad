import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { WeeklyPresence } from "@/components/WeeklyPresence";


import { Sparkles, Clock, Users, MapPin } from "lucide-react";

interface User {
  id: string;
  name: string;
  avatar: string;
  headline: string;
  lastSeen: string;
  activities: string[];
  score: number;
  weeklyVisits: number[];
  bio: string;
  typicalTimes: string;
  emojiSignature?: string;
  sharedInterests?: string[];
  distance?: number;
}

interface UserCardProps {
  user: User;
  onSelect: () => void;
  onConnect?: (userId: string, userName: string) => void;
}

export const UserCard = ({ user, onConnect }: UserCardProps) => {
  const [showProfile, setShowProfile] = useState(false);

  const openConnect = () => {
    onConnect?.(user.id, user.name);
  };


  return (
    <>
      <div
        onClick={() => setShowProfile(true)}
        className="gradient-card rounded-2xl p-4 shadow-soft hover:shadow-medium transition-all cursor-pointer border border-border/50"
      >
        <div className="flex gap-4">
          {/* Avatar */}
          <div className="w-14 h-14 rounded-2xl bg-gradient-warm flex items-center justify-center text-2xl shadow-soft flex-shrink-0">
            {user.avatar}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="font-bold text-lg">{user.name}</h3>
              {user.score >= 80 && (
                <Badge variant="secondary" className="gap-1 flex-shrink-0">
                  <Sparkles className="w-3 h-3" />
                  {user.score}
                </Badge>
              )}
            </div>
            {/* Distance indicator */}
            {user.distance !== undefined && (
              <div className="flex items-center gap-1 text-xs text-success mb-2">
                <MapPin className="w-3 h-3" />
                <span className="font-medium">{Math.round(user.distance)}m away</span>
              </div>
            )}
            
            {/* Shared Interests - Highlighted */}
            {user.sharedInterests && user.sharedInterests.length > 0 ? (
              <div className="mb-2">
                <div className="flex flex-wrap gap-1.5">
                  {user.sharedInterests.map((interest) => (
                    <Badge key={interest} variant="default" className="text-xs bg-success/90 hover:bg-success">
                      {interest}
                    </Badge>
                  ))}
                  {user.activities.filter(a => !user.sharedInterests?.includes(a)).slice(0, 2).map((activity) => (
                    <Badge key={activity} variant="outline" className="text-xs">
                      {activity}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {user.activities.slice(0, 3).map((activity) => (
                  <Badge key={activity} variant="outline" className="text-xs">
                    {activity}
                  </Badge>
                ))}
              </div>
            )}

            {/* Last Seen */}
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              {user.lastSeen}
            </div>
          </div>
        </div>

        {/* Connect Button */}
        <Button
          onClick={(e) => {
            e.stopPropagation();
            openConnect();
          }}
          className="w-full mt-3 gradient-warm shadow-soft hover:shadow-glow transition-all"
        >
          Connect
        </Button>
      </div>

      {/* Profile Modal */}
      <Dialog open={showProfile} onOpenChange={setShowProfile}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-warm flex items-center justify-center text-3xl shadow-soft">
                {user.avatar}
              </div>
              <div>
                <DialogTitle className="text-2xl mb-1">{user.name}</DialogTitle>
                <p className="text-sm text-muted-foreground">{user.headline}</p>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            {/* Bio */}
            <div>
              <h4 className="font-semibold mb-2">About</h4>
              <p className="text-sm text-muted-foreground">{user.bio}</p>
            </div>

            {/* Weekly Presence */}
            <div>
              <h4 className="font-semibold mb-2">Weekly Presence</h4>
              <WeeklyPresence visits={user.weeklyVisits} />
              <p className="text-xs text-muted-foreground mt-2">
                Here {user.weeklyVisits.reduce((a, b) => a + b, 0)}× this week
              </p>
            </div>

            {/* Typical Times */}
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Typical Times
              </h4>
              <p className="text-sm text-muted-foreground">{user.typicalTimes}</p>
            </div>

            {/* Shared Activities */}
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Shared Interests
              </h4>
              <div className="flex flex-wrap gap-2">
                {user.activities.map((activity) => (
                  <Badge key={activity} variant="secondary">
                    {activity}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Connect Button */}
            <Button
              onClick={() => {
                setShowProfile(false);
                openConnect();
              }}
              className="w-full gradient-warm shadow-soft hover:shadow-glow transition-all"
            >
              {`Connect with ${user.name}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </>
  );
};
