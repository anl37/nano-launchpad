import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { getInterestEmoji } from '@/config/interests';

export interface ActivityStat {
  icon: string;
  name: string;
  frequency: string;
  isInterest: boolean;
}

export const useActivityStats = () => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivityStats = async () => {
      if (!user?.id) return;

      // Get user interests from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('interests')
        .eq('id', user.id)
        .single();

      // Get activity patterns
      const { data: patterns } = await supabase
        .from('activity_patterns')
        .select('place_type, visit_count')
        .eq('user_id', user.id)
        .order('visit_count', { ascending: false })
        .limit(3);

      const stats: ActivityStat[] = [];

      // Add interests first
      if (profile?.interests && profile.interests.length > 0) {
        profile.interests.forEach((interest: string) => {
          // Try to find matching pattern
          const pattern = patterns?.find(p => 
            p.place_type.toLowerCase().includes(interest.toLowerCase())
          );
          
          const visitsPerWeek = pattern 
            ? (pattern.visit_count * 7 / 30).toFixed(0) 
            : null;

          stats.push({
            icon: getInterestEmoji(interest),
            name: interest,
            frequency: visitsPerWeek ? `${visitsPerWeek}×/week` : 'TBD',
            isInterest: true
          });
        });
      }

      // Add top patterns if we have space and they're not duplicates
      if (patterns && stats.length < 3) {
        patterns.forEach(pattern => {
          if (stats.length >= 3) return;
          
          const alreadyAdded = stats.some(s => 
            pattern.place_type.toLowerCase().includes(s.name.toLowerCase())
          );
          
          if (!alreadyAdded) {
            const visitsPerWeek = (pattern.visit_count * 7 / 30).toFixed(0);
            stats.push({
              icon: getPlaceTypeEmoji(pattern.place_type),
              name: formatPlaceType(pattern.place_type),
              frequency: `${visitsPerWeek}×/week`,
              isInterest: false
            });
          }
        });
      }

      setActivities(stats);
      setLoading(false);
    };

    fetchActivityStats();
  }, [user?.id]);

  return { activities, loading };
};

function getPlaceTypeEmoji(placeType: string): string {
  const type = placeType.toLowerCase();
  if (type.includes('cafe') || type.includes('coffee')) return '☕';
  if (type.includes('gym')) return '💪';
  if (type.includes('book') || type.includes('library')) return '📚';
  if (type.includes('park') || type.includes('outdoor')) return '🌲';
  if (type.includes('restaurant') || type.includes('food')) return '🍽️';
  if (type.includes('bar')) return '🍺';
  if (type.includes('museum') || type.includes('art')) return '🎨';
  return '📍';
}

function formatPlaceType(placeType: string): string {
  return placeType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
