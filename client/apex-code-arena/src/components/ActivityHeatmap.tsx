import { useMemo } from "react";

const ActivityHeatmap = () => {
  const intensityColors = [
    "bg-muted border-foreground/20",
    "bg-primary/30 border-foreground/30",
    "bg-primary/50 border-foreground/40",
    "bg-primary/70 border-foreground/50",
    "bg-primary border-foreground",
  ];

  const dayLabels = ["Mon", "Wed", "Fri"];

  // Generate 365 days of activity data starting from Mar 1, 2025
  const { weeks, dayData } = useMemo(() => {
    const startDate = new Date(2025, 2, 1); // March 1, 2025
    const weeksArray = [];
    const dayDataMap = new Map();
    
    let currentWeek = [];
    let currentDate = new Date(startDate);
    
    // Fill in empty days at the start to align with the correct day of week
    const startDayOfWeek = startDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const daysToAdd = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1; // Convert to Monday = 0
    
    for (let i = 0; i < daysToAdd; i++) {
      currentWeek.push(null);
    }
    
    // Generate 365 days of data
    for (let day = 0; day < 365; day++) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const submissions = Math.floor(Math.random() * 15); // 0-14 submissions
      const intensity = submissions === 0 ? 0 : Math.min(Math.floor(submissions / 3) + 1, 4);
      
      dayDataMap.set(dateStr, { submissions, intensity, date: new Date(currentDate) });
      currentWeek.push({ dateStr, intensity });
      
      // If week is complete (7 days), push it and start a new week
      if (currentWeek.length === 7) {
        weeksArray.push(currentWeek);
        currentWeek = [];
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Push remaining days
    if (currentWeek.length > 0) {
      // Fill the rest of the week with null
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeksArray.push(currentWeek);
    }
    
    return { weeks: weeksArray, dayData: dayDataMap };
  }, []);

  // Month headers
  const months = ["Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb"];
  const monthPositions = useMemo(() => {
    const positions = [];
    let weekIndex = 0;
    const startDate = new Date(2025, 2, 1);
    const startDayOfWeek = startDate.getDay() === 0 ? 6 : startDate.getDay() - 1;
    
    for (let month = 0; month < 12; month++) {
      const monthDate = new Date(2025, 2 + month, 1);
      if (month >= 10) monthDate.setFullYear(2026); // Jan and Feb are in 2026
      
      const daysSinceStart = Math.floor((monthDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      weekIndex = Math.floor((daysSinceStart + startDayOfWeek) / 7);
      positions.push(weekIndex);
    }
    
    return positions;
  }, []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="w-full overflow-hidden">
      <div className="flex items-start gap-3 overflow-x-auto pb-2">
        {/* Main heatmap section */}
        <div className="flex-shrink-0">
          <div className="flex gap-2">
            {/* Days label */}
            <div className="flex flex-col justify-start pt-5 w-10 flex-shrink-0">
              {dayLabels.map((day, idx) => (
                <div
                  key={day}
                  className="h-8 font-body text-xs font-bold text-muted-foreground flex items-center"
                  style={{ marginTop: idx === 0 ? 0 : "4px" }}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Heatmap grid */}
            <div className="flex-shrink-0">
              {/* Month headers */}
              <div className="flex gap-1 px-1 pb-1 relative h-5">
                {months.map((month, i) => (
                  <div
                    key={`${month}-${i}`}
                    className="absolute font-body text-xs font-bold text-foreground whitespace-nowrap"
                    style={{ left: `${monthPositions[i] * 16 + 4}px` }}
                  >
                    {month}
                  </div>
                ))}
              </div>

              {/* Grid */}
              <div className="flex gap-1">
                {weeks.map((week, weekIdx) => (
                  <div key={weekIdx} className="flex flex-col gap-1">
                    {week.map((day, dayIdx) => {
                      if (!day) {
                        return <div key={`${weekIdx}-${dayIdx}`} className="w-3 h-3" />;
                      }
                      const data = dayData.get(day.dateStr);
                      return (
                        <div
                          key={`${weekIdx}-${dayIdx}`}
                          className={`w-3 h-3 border rounded ${intensityColors[day.intensity]} transition-colors cursor-pointer hover:ring-2 hover:ring-foreground`}
                          title={`${formatDate(day.dateStr)}\n${data?.submissions || 0} submissions`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-1 pt-5 flex-shrink-0 ml-2">
          <p className="font-body text-xs text-muted-foreground">Less</p>
          <div className="flex flex-col gap-1">
            {intensityColors.map((color, i) => (
              <div key={i} className={`w-3 h-3 border rounded ${color}`} />
            ))}
          </div>
          <p className="font-body text-xs text-muted-foreground">More</p>
        </div>
      </div>
    </div>
  );
};

export default ActivityHeatmap;
