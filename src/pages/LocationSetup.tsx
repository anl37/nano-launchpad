import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MapPin, Shield, Check, AlertCircle } from "lucide-react";
import { toGeohash } from "@/lib/geo";

const LocationSetup = () => {
  const [status, setStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied'>('idle');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const requestLocation = async () => {
    if (!navigator.geolocation) {
      toast({
        title: "Not supported",
        description: "Location services are not supported in your browser",
        variant: "destructive",
      });
      return;
    }

    setStatus('requesting');

    try {
      // Request location permission
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      const { latitude, longitude, accuracy } = position.coords;
      const geohash = toGeohash(latitude, longitude);

      if (!user) throw new Error('User not authenticated');

      // Update profile with initial location
      const { error: profileError } = await supabase
        .from('profiles' as any)
        .update({
          lat: latitude,
          lng: longitude,
          geohash: geohash,
          location_accuracy: accuracy,
          location_updated_at: new Date().toISOString(),
        } as any)
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Initialize presence
      const { error: presenceError } = await supabase
        .from('presence' as any)
        .upsert({
          user_id: user.id,
          lat: latitude,
          lng: longitude,
          geohash: geohash,
          updated_at: new Date().toISOString(),
        } as any);

      if (presenceError) throw presenceError;

      setStatus('granted');

      toast({
        title: "Location enabled!",
        description: "Background location tracking is now active",
      });

      // Wait a moment to show success state
      setTimeout(() => {
        completeOnboarding();
      }, 1500);

    } catch (error: any) {
      console.error('Location permission error:', error);
      
      if (error.code === 1) {
        setStatus('denied');
        toast({
          title: "Permission denied",
          description: "Location access is required to find nearby people",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to get location",
          variant: "destructive",
        });
        setStatus('idle');
      }
    }
  };

  const completeOnboarding = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Mark onboarding as complete
      const { error } = await supabase
        .from('profiles' as any)
        .update({ onboarded: true } as any)
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "All set!",
        description: "Welcome to Spotmate",
      });

      navigate("/space");
    } catch (error: any) {
      console.error('Error completing onboarding:', error);
      toast({
        title: "Error",
        description: "Failed to complete setup. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const skipForNow = () => {
    toast({
      title: "Location optional",
      description: "You can enable it later in Settings",
    });
    completeOnboarding();
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-3xl shadow-elegant p-8 border border-border">
          {/* Header */}
          <div className="text-center mb-8">
            <div className={`w-20 h-20 mx-auto rounded-2xl flex items-center justify-center text-4xl shadow-soft mb-4 transition-all ${
              status === 'granted' ? 'bg-success/20' : 'gradient-warm'
            }`}>
              {status === 'granted' ? (
                <Check className="w-10 h-10 text-success" />
              ) : status === 'denied' ? (
                <AlertCircle className="w-10 h-10 text-destructive" />
              ) : (
                <MapPin className="w-10 h-10 text-primary-foreground" />
              )}
            </div>
            <h1 className="text-3xl font-bold mb-3 text-gradient-warm">
              {status === 'granted' ? 'All set!' : 'Enable location'}
            </h1>
            <p className="text-muted-foreground max-w-sm mx-auto">
              {status === 'granted' 
                ? 'Background location tracking is active. We\'ll match you with nearby people.'
                : 'We need your location to connect you with people nearby (within 10-15m).'
              }
            </p>
          </div>

          {/* Privacy Info */}
          <div className="mb-6 p-4 rounded-2xl bg-muted/50 border border-border">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">
                  Your privacy matters
                </p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Location updates continuously in background</li>
                  <li>• Only lat/lng stored (no personal info in tracking)</li>
                  <li>• Toggle visibility anytime to hide from discovery</li>
                  <li>• You control when you're open to connect</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {status !== 'granted' && (
            <div className="space-y-3">
              <Button
                onClick={requestLocation}
                disabled={status === 'requesting' || loading}
                className="w-full gradient-warm shadow-soft hover:shadow-glow h-12 text-base"
              >
                {status === 'requesting' ? 'Requesting permission...' : 'Enable Location'}
              </Button>

              <Button
                onClick={skipForNow}
                variant="ghost"
                disabled={loading}
                className="w-full"
              >
                Skip for now
              </Button>
            </div>
          )}

          {status === 'granted' && (
            <div className="text-center">
              <div className="inline-flex items-center gap-2 text-success text-sm font-medium">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                Location tracking active
              </div>
            </div>
          )}

          <p className="text-xs text-center text-muted-foreground mt-6">
            Background tracking runs continuously when authorized, independent of Connect status
          </p>
        </div>
      </div>
    </div>
  );
};

export default LocationSetup;
