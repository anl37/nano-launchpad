import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface DayPresence {
  day: number; // 0-6 (Sun-Sat)
  count: number;
  timeOfDay: {
    morning: number;
    afternoon: number;
    evening: number;
  };
}

export const useWeeklyPresence = () => {
  const { user } = useAuth();
  const [weeklyData, setWeeklyData] = useState<DayPresence[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWeeklyPresence = async () => {
      if (!user?.id) return;

      // Get visits from last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data, error } = await supabase
        .from('location_visits')
        .select('visited_at, time_of_day')
        .eq('user_id', user.id)
        .gte('visited_at', sevenDaysAgo.toISOString());

      if (error) {
        console.error('Error fetching weekly presence:', error);
        setLoading(false);
        return;
      }

      // Initialize days with zeros
      const daysMap = new Map<number, DayPresence>();
      for (let i = 0; i < 7; i++) {
        daysMap.set(i, {
          day: i,
          count: 0,
          timeOfDay: { morning: 0, afternoon: 0, evening: 0 }
        });
      }

      // Aggregate visits by day
      data?.forEach(visit => {
        const date = new Date(visit.visited_at);
        const dayOfWeek = date.getDay();
        const dayData = daysMap.get(dayOfWeek)!;
        
        dayData.count++;
        
        // Count by time of day
        if (visit.time_of_day === 'morning') dayData.timeOfDay.morning++;
        else if (visit.time_of_day === 'afternoon') dayData.timeOfDay.afternoon++;
        else if (visit.time_of_day === 'evening') dayData.timeOfDay.evening++;
      });

      setWeeklyData(Array.from(daysMap.values()));
      setLoading(false);
    };

    fetchWeeklyPresence();
  }, [user?.id]);

  return { weeklyData, loading };
};
