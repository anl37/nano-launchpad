interface HeatmapDayProps {
  day: string;
  count: number;
  timeOfDay: {
    morning: number;
    afternoon: number;
    evening: number;
  };
  isToday?: boolean;
}

export const HeatmapDay = ({ day, count, timeOfDay, isToday }: HeatmapDayProps) => {
  const maxVisits = Math.max(timeOfDay.morning, timeOfDay.afternoon, timeOfDay.evening, 1);
  const totalVisits = timeOfDay.morning + timeOfDay.afternoon + timeOfDay.evening;

  const getIntensity = (value: number) => {
    if (value === 0) return 0;
    return Math.ceil((value / maxVisits) * 3);
  };

  const bgColors = [
    'bg-muted',
    'bg-primary/30',
    'bg-primary/60',
    'bg-primary'
  ];

  const currentHour = new Date().getHours();
  const currentTimeOfDay = currentHour < 12 ? 'morning' : currentHour < 18 ? 'afternoon' : 'evening';

  return (
    <div className="flex-1 text-center">
      <div className="w-full rounded-lg overflow-hidden mb-1 h-12 flex flex-col">
        {/* Morning */}
        <div
          className={`flex-1 ${isToday && currentTimeOfDay === 'morning' ? bgColors[3] : bgColors[getIntensity(timeOfDay.morning)]} transition-all`}
          title={`${day} morning: ${timeOfDay.morning} visit${timeOfDay.morning !== 1 ? 's' : ''}`}
        />
        {/* Afternoon */}
        <div
          className={`flex-1 ${isToday && currentTimeOfDay === 'afternoon' ? bgColors[3] : bgColors[getIntensity(timeOfDay.afternoon)]} transition-all`}
          title={`${day} afternoon: ${timeOfDay.afternoon} visit${timeOfDay.afternoon !== 1 ? 's' : ''}`}
        />
        {/* Evening */}
        <div
          className={`flex-1 ${isToday && currentTimeOfDay === 'evening' ? bgColors[3] : bgColors[getIntensity(timeOfDay.evening)]} transition-all`}
          title={`${day} evening: ${timeOfDay.evening} visit${timeOfDay.evening !== 1 ? 's' : ''}`}
        />
      </div>
      <p className="text-xs text-muted-foreground">{day}</p>
      {totalVisits > 0 && (
        <p className="text-xs font-medium text-foreground">{totalVisits}</p>
      )}
    </div>
  );
};
