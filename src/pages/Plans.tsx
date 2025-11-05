import { MeetPlanCard } from "@/components/MeetPlanCard";
import { TabNavigation } from "@/components/TabNavigation";
import { Calendar } from "lucide-react";
import { useMeeting } from "@/context/MeetingContext";

const Plans = () => {
  const { plans } = useMeeting();
  
  // Separate into upcoming and past plans, sorted chronologically
  const now = new Date();
  const upcomingPlans = plans
    .filter(plan => new Date(plan.startAt) > now)
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  const pastPlans = plans
    .filter(plan => new Date(plan.startAt) <= now)
    .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());

  return (
    <div className="min-h-screen bg-gradient-subtle pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border shadow-soft">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-base">Plans</h1>
              <p className="text-xs text-muted-foreground">
                Upcoming & past meetups
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Upcoming */}
        <div className="space-y-3">
          <h2 className="font-semibold text-sm text-muted-foreground px-1">Upcoming</h2>
          {upcomingPlans.length > 0 ? (
            upcomingPlans.map((plan) => (
              <MeetPlanCard key={plan.id} plan={plan} />
            ))
          ) : (
            <div className="gradient-card rounded-3xl p-10 text-center shadow-soft">
              <p className="text-sm text-muted-foreground">No upcoming plans</p>
              <p className="text-xs text-muted-foreground mt-1">Connect with someone to make plans</p>
            </div>
          )}
        </div>

        {/* Past */}
        {pastPlans.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-semibold text-sm text-muted-foreground px-1">Past</h2>
            {pastPlans.map((plan) => (
              <MeetPlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        )}

        <p className="text-xs text-center text-muted-foreground pt-4">
          Meet in real life
        </p>
      </div>

      <TabNavigation />
    </div>
  );
};

export default Plans;
