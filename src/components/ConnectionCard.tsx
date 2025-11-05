import { ConnectionProfile } from "@/types/connection";
import { Badge } from "@/components/ui/badge";
import { HeatmapWeek } from "./HeatmapWeek";
import { relativeTime } from "@/lib/time-utils";

interface ConnectionCardProps {
  connection: ConnectionProfile;
  onClick: () => void;
}

export const ConnectionCard = ({ connection, onClick }: ConnectionCardProps) => {
  const getAvatarColor = (name: string) => {
    const colors = [
      "bg-primary/20 text-primary",
      "bg-success/20 text-success",
      "bg-accent/20 text-accent",
      "bg-destructive/20 text-destructive",
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const visibleInterests = connection.interests.slice(0, 3);
  const remainingCount = connection.interests.length - 3;

  return (
    <button
      onClick={onClick}
      className="w-full gradient-card rounded-3xl p-4 text-left hover:shadow-elegant transition-all shadow-soft"
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0 ${getAvatarColor(connection.name)}`}>
          {connection.name.charAt(0).toUpperCase()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-base text-foreground">{connection.name}</h3>
            <span className="text-xs text-muted-foreground shrink-0">
              {relativeTime(connection.lastMetAt)}
            </span>
          </div>

          {/* Interests */}
          <div className="flex flex-wrap gap-1 mb-2">
            {visibleInterests.map((interest, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs px-2 py-0.5">
                {interest}
              </Badge>
            ))}
            {remainingCount > 0 && (
              <Badge variant="outline" className="text-xs px-2 py-0.5">
                +{remainingCount}
              </Badge>
            )}
          </div>

          {/* Weekly Heatmap */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">This week:</span>
            <HeatmapWeek meetHistory={connection.meetHistory} />
          </div>
        </div>
      </div>
    </button>
  );
};
