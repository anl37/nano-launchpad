import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface UserTrends {
  typicalTimeWindow: string;
  connectionStats: string;
  mostActiveDay: string;
}

export const useUserTrends = () => {
  const { user } = useAuth();
  const [trends, setTrends] = useState<UserTrends | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrends = async () => {
      if (!user?.id) return;

      // Get most common time of day
      const { data: timePatterns } = await supabase
        .from('activity_patterns')
        .select('time_of_day, visit_count')
        .eq('user_id', user.id)
        .order('visit_count', { ascending: false })
        .limit(1);

      // Get most common day type
      const { data: dayPatterns } = await supabase
        .from('activity_patterns')
        .select('day_type, visit_count')
        .eq('user_id', user.id)
        .order('visit_count', { ascending: false })
        .limit(1);

      // Get connection count (accepted matches)
      const { count: connectionCount } = await supabase
        .from('matches')
        .select('*', { count: 'exact', head: true })
        .or(`uid_a.eq.${user.id},uid_b.eq.${user.id}`)
        .eq('status', 'accepted');

      // Get cafe connection percentage
      const { data: allMatches } = await supabase
        .from('matches')
        .select('venue_name')
        .or(`uid_a.eq.${user.id},uid_b.eq.${user.id}`)
        .eq('status', 'accepted');

      const cafeCount = allMatches?.filter(m => 
        m.venue_name?.toLowerCase().includes('cafe') || 
        m.venue_name?.toLowerCase().includes('coffee')
      ).length || 0;
      
      const cafePercentage = allMatches && allMatches.length > 0
        ? Math.round((cafeCount / allMatches.length) * 100)
        : 0;

      // Format typical time window
      const timeOfDay = timePatterns?.[0]?.time_of_day || getCurrentTimeOfDay();
      const timeWindow = formatTimeWindow(timeOfDay);

      // Format most active day
      const dayType = dayPatterns?.[0]?.day_type || getCurrentDayType();
      const mostActiveDay = dayType === 'weekend' ? 'weekends' : 'weekdays';

      // Format connection stats
      const connectionStats = connectionCount 
        ? `${cafePercentage}% of connections at cafés`
        : '0 connections so far';

      setTrends({
        typicalTimeWindow: timeWindow,
        connectionStats,
        mostActiveDay
      });
      setLoading(false);
    };

    fetchTrends();
  }, [user?.id]);

  return { trends, loading };
};

function getCurrentTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

function getCurrentDayType(): string {
  const day = new Date().getDay();
  return (day === 0 || day === 6) ? 'weekend' : 'weekday';
}

function formatTimeWindow(timeOfDay: string): string {
  const windows: Record<string, string> = {
    morning: '8-12 AM',
    afternoon: '12-6 PM',
    evening: '6-10 PM'
  };
  return windows[timeOfDay] || 'Various times';
}
