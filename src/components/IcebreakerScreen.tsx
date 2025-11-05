import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RefreshCw, Sparkles, MapPin, Fingerprint } from "lucide-react";
import { mockIcebreakers } from "@/types/session";
import { EmojiCard } from "./EmojiCard";

interface IcebreakerScreenProps {
  open: boolean;
  onClose: () => void;
  userName: string;
  meetCode: string;
  sharedEmojiCode?: string;
  venueName?: string;
  landmark?: string;
  onStartTalking?: () => void;
}

export const IcebreakerScreen = ({ 
  open, 
  onClose, 
  userName, 
  meetCode, 
  sharedEmojiCode,
  venueName,
  landmark,
  onStartTalking 
}: IcebreakerScreenProps) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showEmojiCard, setShowEmojiCard] = useState(false);
  const [questions] = useState(() => {
    // Pick 5 random questions
    const shuffled = [...mockIcebreakers].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 5);
  });

  const handleShuffle = () => {
    setCurrentQuestionIndex((prev) => (prev + 1) % questions.length);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              {sharedEmojiCode && venueName ? `You're meeting ${userName}` : 'Start your conversation'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {sharedEmojiCode && venueName && (
              <div className="gradient-card rounded-3xl p-6 text-center space-y-3">
                <div className="text-5xl mb-2">{sharedEmojiCode}</div>
                <div className="space-y-1">
                  <p className="font-semibold text-lg">{venueName}</p>
                  {landmark && (
                    <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span>{landmark}</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground pt-2">
                  Show your shared emoji {sharedEmojiCode} when you arrive
                </p>
              </div>
            )}
            
            <p className="text-sm text-muted-foreground text-center">
              {sharedEmojiCode ? 'Optional icebreaker to get started:' : 'Pick a question you both like — then go talk!'}
            </p>

          <div className="gradient-card rounded-3xl p-6 min-h-[160px] flex items-center justify-center">
            <p className="text-lg font-medium text-center leading-relaxed">
              {questions[currentQuestionIndex]}
            </p>
          </div>

          <div className="flex justify-center gap-2">
            {questions.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === currentQuestionIndex ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>

          <div className="space-y-2">
            {sharedEmojiCode && venueName && landmark && (
              <Button
                onClick={() => setShowEmojiCard(true)}
                variant="outline"
                className="w-full rounded-full font-semibold"
              >
                <Fingerprint className="w-4 h-4 mr-2" />
                Identify
              </Button>
            )}
            
            <Button
              onClick={handleShuffle}
              variant="outline"
              className="w-full rounded-full"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Shuffle Question
            </Button>

            <Button
              onClick={() => onStartTalking?.()}
              className="w-full rounded-full gradient-warm shadow-soft"
            >
              I'm heading there
            </Button>
          </div>

          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Meet Code: <span className="font-semibold">{meetCode}</span>
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {sharedEmojiCode && venueName && landmark && (
      <EmojiCard
        open={showEmojiCard}
        onClose={() => setShowEmojiCard(false)}
        emojiCode={sharedEmojiCode}
        venueName={venueName}
        landmark={landmark}
      />
    )}
  </>
  );
};
