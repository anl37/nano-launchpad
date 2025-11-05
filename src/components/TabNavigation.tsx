import { Home, Map, Sparkles, Calendar, User } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

const tabs = [
  { id: "home", label: "Home", icon: Home, path: "/space" },
  { id: "spaces", label: "Spaces", icon: Map, path: "/spaces" },
  { id: "next-up", label: "Next Up", icon: Sparkles, path: "/next-up" },
  { id: "plans", label: "Plans", icon: Calendar, path: "/plans" },
  { id: "profile", label: "Profile", icon: User, path: "/profile" },
];

export const TabNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border shadow-elegant">
      <div className="max-w-2xl mx-auto px-2 py-2">
        <div className="flex items-center justify-around">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = location.pathname === tab.path;
            
            return (
              <button
                key={tab.id}
                onClick={() => navigate(tab.path)}
                className={`
                  flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all duration-300
                  ${isActive 
                    ? "text-primary bg-primary/10" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }
                `}
              >
                <Icon className={`w-5 h-5 ${isActive ? "scale-110" : ""}`} />
                <span className="text-xs font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
