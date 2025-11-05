import { User, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";

interface RecentMatchCardProps {
  userName: string;
  spaceName: string;
  connectedAt: string;
  onContinue: () => void;
}

export const RecentMatchCard = ({ userName, spaceName, connectedAt, onContinue }: RecentMatchCardProps) => {
  return (
    <button
      onClick={onContinue}
      className="w-full text-left"
    >
      <Card className="p-4 gradient-card border-primary/20 hover:shadow-elegant transition-all">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <User className="w-6 h-6 text-primary" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-base">Continue with {userName}</h3>
              <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full font-medium">
                Recent
              </span>
            </div>
            
            <div className="flex flex-col gap-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                <span>Met at {spaceName}</span>
              </div>
              <span className="text-xs">{connectedAt}</span>
            </div>
          </div>
        </div>
        
        <p className="text-sm text-muted-foreground mt-3 ml-15">
          Tap to see personalized activity suggestions based on your shared interests
        </p>
      </Card>
    </button>
  );
};
