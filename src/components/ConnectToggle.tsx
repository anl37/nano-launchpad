import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface ConnectToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export const ConnectToggle = ({ enabled, onToggle }: ConnectToggleProps) => {
  return (
    <div className="flex items-center gap-2">
      <Switch
        id="connect-mode"
        checked={enabled}
        onCheckedChange={onToggle}
      />
      <Label
        htmlFor="connect-mode"
        className={`font-semibold cursor-pointer ${enabled ? 'text-success' : 'text-muted-foreground'}`}
      >
        {enabled ? 'Connected' : 'Connect'}
      </Label>
    </div>
  );
};
