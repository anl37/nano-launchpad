import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const EMOJI_OPTIONS = [
  "🐱", "☕", "🌿", "🪩", "🎨", "📚", "🎵", "🏃", "🧘", "🍕",
  "🎮", "🌸", "⚡", "🌙", "☀️", "🎭", "🦋", "🐶", "🎸", "🏀",
  "🌊", "🔥", "❄️", "🌈", "⭐", "🎪", "🎯", "🧩", "🎲", "🏔️",
];

interface EmojiPickerProps {
  open: boolean;
  onClose: () => void;
  currentEmoji?: string;
  onSelect: (emoji: string) => void;
}

export const EmojiPicker = ({ open, onClose, currentEmoji, onSelect }: EmojiPickerProps) => {
  const [selectedEmoji, setSelectedEmoji] = useState(currentEmoji || "");

  const handleSelect = (emoji: string) => {
    setSelectedEmoji(emoji);
    onSelect(emoji);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Pick an emoji that feels like you</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Something you'd send to a friend
          </p>
        </DialogHeader>

        <div className="grid grid-cols-6 gap-3 py-4">
          {EMOJI_OPTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleSelect(emoji)}
              className={`text-4xl p-3 rounded-2xl hover:bg-accent transition-all hover:scale-110 ${
                selectedEmoji === emoji ? 'bg-accent ring-2 ring-primary' : ''
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>

        {currentEmoji && (
          <p className="text-xs text-center text-muted-foreground">
            Current: {currentEmoji}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
};
