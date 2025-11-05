import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useEffect } from "react";

interface EmojiCardProps {
  open: boolean;
  onClose: () => void;
  emojiCode: string;
  venueName: string;
  landmark: string;
}

export const EmojiCard = ({ open, onClose, emojiCode, venueName, landmark }: EmojiCardProps) => {
  useEffect(() => {
    if (!open) return;

    // Keep screen on for 5 minutes
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err) {
        console.log('Wake lock failed:', err);
      }
    };

    requestWakeLock();

    const timeout = setTimeout(() => {
      if (wakeLock) wakeLock.release();
      onClose();
    }, 5 * 60 * 1000);

    return () => {
      clearTimeout(timeout);
      if (wakeLock) wakeLock.release();
    };
  }, [open, onClose]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg p-0 border-0">
        <div className="relative overflow-hidden rounded-3xl">
          <div className="gradient-warm p-12 text-center">
            <div className="animate-pulse">
              <div className="text-9xl mb-6 tracking-wider">
                {emojiCode}
              </div>
            </div>
            
            <div className="space-y-3 text-white">
              <p className="text-2xl font-bold">
                Meeting at
              </p>
              <p className="text-3xl font-bold">
                {venueName}
              </p>
              <p className="text-xl opacity-90">
                {landmark}
              </p>
            </div>

            <div className="mt-8 pt-6 border-t border-white/20">
              <p className="text-sm text-white/80">
                Ask your {emojiCode.split('').reverse().join('')} match how they picked their emoji 👋
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
