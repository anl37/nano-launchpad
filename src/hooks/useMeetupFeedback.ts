import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';

interface SubmitFeedbackParams {
  matchId: string;
  rating: number;
  notes?: string;
}

/**
 * Submits feedback for a meetup to improve future compatibility calculations
 */
export const useMeetupFeedback = () => {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const submitFeedback = async ({ matchId, rating, notes }: SubmitFeedbackParams) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to submit feedback",
        variant: "destructive",
      });
      return { success: false };
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke('submit-feedback', {
        body: {
          matchId,
          rating,
          notes: notes || null,
        },
      });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to submit feedback",
          variant: "destructive",
        });
        return { success: false };
      }

      toast({
        title: "Thank you!",
        description: "Your feedback helps improve future matches",
      });
      return { success: true };
    } catch (err) {
      console.error('[Feedback] Exception:', err);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      return { success: false };
    } finally {
      setSubmitting(false);
    }
  };

  return { submitFeedback, submitting };
};
