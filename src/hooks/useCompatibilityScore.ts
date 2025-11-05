import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface CompatibilityScore {
  targetUserId: string;
  score: number;
  breakdown: {
    interestScore: number;
    behaviorScore: number;
    feedbackScore: number;
  };
}

/**
 * Calculates adaptive compatibility score with another user
 * Uses interests, activity patterns, and feedback history
 */
export const useCompatibilityScore = (targetUserId: string | null) => {
  const { user } = useAuth();
  const [compatibility, setCompatibility] = useState<CompatibilityScore | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !targetUserId) {
      setCompatibility(null);
      return;
    }

    const calculateScore = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('calculate-compatibility', {
          body: { targetUserId },
        });

        if (error) {
          console.error('[Compatibility] Error:', error);
          setCompatibility(null);
        } else if (data) {
          setCompatibility(data);
        }
      } catch (err) {
        console.error('[Compatibility] Exception:', err);
        setCompatibility(null);
      } finally {
        setLoading(false);
      }
    };

    calculateScore();
  }, [user, targetUserId]);

  return { compatibility, loading };
};
