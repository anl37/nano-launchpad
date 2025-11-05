import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface HeatmapWeekProps {
  meetHistory: Date[];
}

export const HeatmapWeek = ({ meetHistory }: HeatmapWeekProps) => {
  const getDayName = (index: number) => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    return days[index];
  };

  const getLastSevenDays = () => {
    const days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      days.push(date);
    }
    return days;
  };

  const countMeetingsForDay = (targetDate: Date) => {
    return meetHistory.filter(meetDate => {
      const meet = new Date(meetDate);
      return (
        meet.getDate() === targetDate.getDate() &&
        meet.getMonth() === targetDate.getMonth() &&
        meet.getFullYear() === targetDate.getFullYear()
      );
    }).length;
  };

  const getColorClass = (count: number) => {
    if (count === 0) return "bg-muted";
    if (count <= 2) return "bg-success/40";
    return "bg-success";
  };

  const lastSevenDays = getLastSevenDays();

  return (
    <TooltipProvider>
      <div className="flex gap-1">
        {lastSevenDays.map((date, index) => {
          const count = countMeetingsForDay(date);
          const dayName = getDayName(index);
          
          return (
            <Tooltip key={index}>
              <TooltipTrigger asChild>
                <div
                  className={`w-3 h-3 rounded-sm ${getColorClass(count)} transition-colors`}
                  aria-label={`${count} meets on ${dayName}`}
                />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">
                  {count === 0 ? "No meets" : `${count} meet${count > 1 ? 's' : ''}`} on {dayName}
                </p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
};
