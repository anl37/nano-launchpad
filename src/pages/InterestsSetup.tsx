import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { INTEREST_OPTIONS, validateInterests, getInterestEmoji } from "@/config/interests";
import { Sparkles, ArrowRight } from "lucide-react";

const InterestsSetup = () => {
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const toggleInterest = (interest: string) => {
    if (selectedInterests.includes(interest)) {
      setSelectedInterests(selectedInterests.filter(i => i !== interest));
    } else {
      if (selectedInterests.length < 3) {
        setSelectedInterests([...selectedInterests, interest]);
      } else {
        toast({
          title: "Maximum reached",
          description: "You can only select 3 interests. Remove one to add another.",
          variant: "destructive",
        });
      }
    }
  };

  const handleContinue = async () => {
    const validation = validateInterests(selectedInterests);
    
    if (!validation.valid) {
      toast({
        title: "Selection incomplete",
        description: validation.error,
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Error",
        description: "User not authenticated",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Update profile with interests
      const { error } = await supabase
        .from('profiles' as any)
        .upsert({
          id: user.id,
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          interests: selectedInterests,
          is_visible: true,
          updated_at: new Date().toISOString(),
        } as any);

      if (error) throw error;

      toast({
        title: "Interests saved!",
        description: "Let's set up your location next",
      });

      navigate("/location-setup");
    } catch (error: any) {
      console.error('Error saving interests:', error);
      toast({
        title: "Save failed",
        description: error.message || "Failed to save interests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center px-4">
      <div className="w-full max-w-2xl">
        <div className="bg-card rounded-3xl shadow-elegant p-8 border border-border">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto rounded-2xl gradient-warm flex items-center justify-center text-4xl shadow-soft mb-4">
              <Sparkles className="w-10 h-10 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold mb-3 text-gradient-warm">
              Pick your vibe
            </h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              Choose exactly 3 interests. We'll match you with people who share at least one.
            </p>
          </div>

          {/* Interest Selection */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-muted-foreground">
                Select 3 interests
              </p>
              <div className="flex gap-1">
                {[1, 2, 3].map((num) => (
                  <div
                    key={num}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      selectedInterests.length >= num
                        ? 'bg-primary'
                        : 'bg-muted'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {INTEREST_OPTIONS.map((interest) => {
                const isSelected = selectedInterests.includes(interest);
                return (
                  <button
                    key={interest}
                    onClick={() => toggleInterest(interest)}
                    className={`p-4 rounded-2xl border-2 transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/10 shadow-soft'
                        : 'border-border bg-card hover:border-primary/50 hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-3xl">{getInterestEmoji(interest)}</span>
                      <span className={`text-sm font-medium ${
                        isSelected ? 'text-primary' : 'text-foreground'
                      }`}>
                        {interest}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Interests Preview */}
          {selectedInterests.length > 0 && (
            <div className="mb-6 p-4 rounded-2xl bg-muted/50 border border-border">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Your selected interests:
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedInterests.map((interest) => (
                  <Badge
                    key={interest}
                    variant="secondary"
                    className="px-3 py-1 text-sm"
                  >
                    {getInterestEmoji(interest)} {interest}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Continue Button */}
          <Button
            onClick={handleContinue}
            disabled={selectedInterests.length !== 3 || loading}
            className="w-full gradient-warm shadow-soft hover:shadow-glow h-12 text-base"
          >
            {loading ? "Saving..." : "Continue"}
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>

          <p className="text-xs text-center text-muted-foreground mt-4">
            You can update your interests later in Settings
          </p>
        </div>
      </div>
    </div>
  );
};

export default InterestsSetup;
