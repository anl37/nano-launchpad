import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface OnboardingCheckProps {
  children: React.ReactNode;
}

/**
 * Component to check onboarding status and redirect if needed
 * Wraps protected routes to ensure users complete onboarding
 */
export const OnboardingCheck = ({ children }: OnboardingCheckProps) => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkOnboarding = async () => {
      if (authLoading || !user) {
        setChecking(false);
        return;
      }

      // Skip check if already on onboarding pages
      const onboardingPaths = ['/interests-setup', '/location-setup'];
      if (onboardingPaths.includes(location.pathname)) {
        setChecking(false);
        return;
      }

      try {
        const { data, error} = await supabase
          .from('profiles')
          .select('onboarded')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error checking onboarding:', error);
          setChecking(false);
          return;
        }

        if (!data || !data.onboarded) {
          // User hasn't completed onboarding
          navigate('/interests-setup', { replace: true });
          return;
        }

        setChecking(false);
      } catch (error) {
        console.error('Unexpected error checking onboarding:', error);
        setChecking(false);
      }
    };

    checkOnboarding();
  }, [user, authLoading, navigate, location.pathname]);

  // Show nothing while checking (ProtectedRoute already handles auth loading)
  if (checking) {
    return null;
  }

  return <>{children}</>;
};
