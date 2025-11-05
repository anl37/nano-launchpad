import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (feedback: FeedbackData) => void;
  userName?: string;
}

export interface FeedbackData {
  rating_safety: number;
  rating_vibes: number;
  rating_fit: number;
  rating_activity: number;
  rating_overall: number;
  comment?: string;
}

const questions = [
  { key: 'rating_safety' as const, label: 'How safe did you feel?' },
  { key: 'rating_vibes' as const, label: 'How were the vibes?' },
  { key: 'rating_fit' as const, label: 'How well did you connect?' },
  { key: 'rating_activity' as const, label: 'How was the activity/venue?' },
  { key: 'rating_overall' as const, label: 'Overall experience?' },
];

export const FeedbackModal = ({ open, onClose, onSubmit, userName }: FeedbackModalProps) => {
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [comment, setComment] = useState('');
  const [hoveredRating, setHoveredRating] = useState<{ key: string; value: number } | null>(null);

  const handleRating = (key: string, value: number) => {
    setRatings(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = () => {
    // Validate all ratings are provided
    if (questions.some(q => !ratings[q.key])) {
      return;
    }

    const feedbackData: FeedbackData = {
      rating_safety: ratings.rating_safety,
      rating_vibes: ratings.rating_vibes,
      rating_fit: ratings.rating_fit,
      rating_activity: ratings.rating_activity,
      rating_overall: ratings.rating_overall,
      comment: comment.trim() || undefined,
    };

    onSubmit(feedbackData);
    
    // Reset form
    setRatings({});
    setComment('');
    onClose();
  };

  const allRated = questions.every(q => ratings[q.key]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>How was your meetup?</DialogTitle>
          <DialogDescription>
            {userName ? `Share your experience with ${userName}` : 'Rate your experience'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {questions.map((question) => (
            <div key={question.key} className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                {question.label}
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((value) => {
                  const isSelected = ratings[question.key] >= value;
                  const isHovered = hoveredRating?.key === question.key && hoveredRating.value >= value;
                  
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => handleRating(question.key, value)}
                      onMouseEnter={() => setHoveredRating({ key: question.key, value })}
                      onMouseLeave={() => setHoveredRating(null)}
                      className="transition-transform hover:scale-110 active:scale-95"
                    >
                      <Star
                        className={`w-8 h-8 transition-colors ${
                          isSelected || isHovered
                            ? 'fill-primary text-primary'
                            : 'text-muted-foreground'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Additional thoughts (optional)
            </label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share more about your experience..."
              className="resize-none"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Skip
          </Button>
          <Button onClick={handleSubmit} disabled={!allRated}>
            Submit Feedback
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
