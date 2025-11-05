interface WeeklyPresenceProps {
  visits: number[];
}

export const WeeklyPresence = ({ visits }: WeeklyPresenceProps) => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const maxVisits = Math.max(...visits, 1);

  return (
    <div className="space-y-2">
      <div className="flex gap-2 justify-between">
        {visits.map((count, index) => {
          const intensity = count === 0 ? 0 : Math.ceil((count / maxVisits) * 3);
          const bgColors = [
            'bg-muted',
            'bg-primary/30',
            'bg-primary/60',
            'bg-primary'
          ];

          return (
            <div key={index} className="flex-1 text-center">
              <div
                className={`w-full h-12 rounded-lg ${bgColors[intensity]} transition-all mb-1 flex items-end justify-center pb-1 text-xs font-medium`}
                title={`${days[index]}: ${count} visit${count !== 1 ? 's' : ''}`}
              >
                {count > 0 && <span className="opacity-70">{count}</span>}
              </div>
              <p className="text-xs text-muted-foreground">{days[index]}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
