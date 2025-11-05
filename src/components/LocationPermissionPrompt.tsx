import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, MapPin, RefreshCw } from 'lucide-react';
import { LocationStatus } from '@/hooks/useGeolocation';

interface LocationPermissionPromptProps {
  status: LocationStatus;
  onRetry?: () => void;
}

export const LocationPermissionPrompt = ({ status, onRetry }: LocationPermissionPromptProps) => {
  if (status === 'live') return null;

  const getMessage = () => {
    switch (status) {
      case 'denied':
        return {
          icon: <AlertCircle className="w-12 h-12 text-destructive" />,
          title: 'Location Permission Denied',
          description: 'To find nearby people, please enable location permissions in your browser settings.',
          action: 'Open Settings',
          actionHref: 'https://support.google.com/chrome/answer/142065',
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-12 h-12 text-warning" />,
          title: 'Location Error',
          description: 'Unable to access your location. Please check your device settings and try again.',
          action: 'Retry',
          actionCallback: onRetry,
        };
      case 'unsupported':
        return {
          icon: <MapPin className="w-12 h-12 text-muted-foreground" />,
          title: 'Location Not Supported',
          description: 'Your browser does not support geolocation. Please try a different browser.',
          action: null,
        };
      case 'paused':
        return {
          icon: <MapPin className="w-12 h-12 text-muted-foreground" />,
          title: 'Location Paused',
          description: 'Turn on location tracking to see who\'s nearby.',
          action: 'Enable Location',
          actionCallback: onRetry,
        };
      default:
        return null;
    }
  };

  const config = getMessage();
  if (!config) return null;

  return (
    <Card className="border-2 border-dashed border-border">
      <CardContent className="pt-8 pb-8 text-center">
        <div className="flex flex-col items-center gap-4 max-w-sm mx-auto">
          <div className="p-4 rounded-full bg-muted/50">
            {config.icon}
          </div>
          
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">{config.title}</h3>
            <p className="text-sm text-muted-foreground">
              {config.description}
            </p>
          </div>

          {config.action && (
            config.actionHref ? (
              <Button asChild variant="default">
                <a href={config.actionHref} target="_blank" rel="noopener noreferrer">
                  {config.action}
                </a>
              </Button>
            ) : config.actionCallback ? (
              <Button onClick={config.actionCallback} variant="default">
                <RefreshCw className="w-4 h-4 mr-2" />
                {config.action}
              </Button>
            ) : null
          )}
        </div>
      </CardContent>
    </Card>
  );
};
