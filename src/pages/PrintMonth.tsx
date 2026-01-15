import { useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  format,
  isSameMonth,
  isSaturday,
  parseISO,
} from 'date-fns';
import { useActivities } from '../hooks/useActivities';
import { useMonthSchedule } from '../hooks/useSchedule';
import type { Activity } from '../types';

export function PrintMonth() {
  const { month } = useParams<{ month: string }>();
  const navigate = useNavigate();

  const currentMonth = useMemo(() => {
    if (month) {
      return parseISO(`${month}-01`);
    }
    return new Date();
  }, [month]);

  const year = currentMonth.getFullYear();
  const monthNum = currentMonth.getMonth() + 1;

  const { data: activities = [] } = useActivities();
  const { data: monthData } = useMonthSchedule(year, monthNum);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const days: Date[] = [];
    let day = calendarStart;
    while (day <= calendarEnd) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentMonth]);

  const getScheduleForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return monthData?.daySchedules.find((s) => s.date === dateStr);
  };

  const getSaturdayScheduleForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return monthData?.saturdaySchedules.find((s) => s.date === dateStr);
  };

  const getActivityById = (id: string) => {
    return activities.find((a) => a.id === id);
  };

  // Collect all activities for the month
  const monthActivities = useMemo(() => {
    const activityMap = new Map<string, { activity: Activity; occurrences: string[] }>();

    monthData?.daySchedules.forEach((day) => {
      if (day.after_gan_activity_id) {
        const activity = getActivityById(day.after_gan_activity_id);
        if (activity) {
          const existing = activityMap.get(activity.id);
          const dateStr = format(parseISO(day.date), 'EEE d');
          if (existing) {
            existing.occurrences.push(dateStr);
          } else {
            activityMap.set(activity.id, { activity, occurrences: [dateStr] });
          }
        }
      }
    });

    return Array.from(activityMap.values());
  }, [monthData, activities]);

  // Auto-print on load
  useEffect(() => {
    const timer = setTimeout(() => {
      window.print();
    }, 500);
    return () => clearTimeout(timer);
  }, [monthData]);

  const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  return (
    <div className="p-8 max-w-4xl mx-auto bg-white print:p-4">
      {/* Back button (hidden in print) */}
      <button
        onClick={() => navigate(-1)}
        className="mb-4 px-4 py-2 border rounded no-print"
      >
        ← Back
      </button>

      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold">SKY'S MONTH</h1>
        <p className="text-xl">{format(currentMonth, 'MMMM yyyy')}</p>
      </div>

      {/* Calendar Grid */}
      <table className="w-full border-collapse border text-sm mb-6">
        <thead>
          <tr className="bg-gray-100">
            {WEEKDAYS.map((day) => (
              <th key={day} className="border p-2 text-center">
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: Math.ceil(calendarDays.length / 7) }, (_, weekIdx) => (
            <tr key={weekIdx}>
              {calendarDays.slice(weekIdx * 7, weekIdx * 7 + 7).map((date) => {
                const dateStr = format(date, 'yyyy-MM-dd');
                const isCurrentMonth = isSameMonth(date, currentMonth);
                const isSat = isSaturday(date);
                const schedule = getScheduleForDate(date);
                const satSchedule = getSaturdayScheduleForDate(date);
                const isNoGan = schedule?.is_no_gan;

                return (
                  <td
                    key={dateStr}
                    className={`
                      border p-1 align-top h-20
                      ${!isCurrentMonth ? 'bg-gray-100 text-gray-400' : ''}
                      ${isSat ? 'bg-gray-50' : ''}
                      ${isNoGan ? 'bg-gray-200' : ''}
                    `}
                  >
                    <div className="font-medium">{format(date, 'd')}</div>

                    {isNoGan && (
                      <div className="text-xs font-bold">
                        NO GAN
                        {schedule?.no_gan_reason && (
                          <div className="font-normal">{schedule.no_gan_reason}</div>
                        )}
                      </div>
                    )}

                    {schedule?.after_gan_activity_id && (
                      <div className="text-xs">
                        {getActivityById(schedule.after_gan_activity_id)?.name}
                      </div>
                    )}

                    {isSat && satSchedule?.activities?.map((act, idx) => (
                      <div key={idx} className="text-xs">
                        {act.custom_name || getActivityById(act.activity_id)?.name}
                      </div>
                    ))}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Legend */}
      <div className="flex gap-6 text-sm mb-6">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-200 border" />
          <span>No Gan</span>
        </div>
      </div>

      {/* Activity Details */}
      {monthActivities.length > 0 && (
        <div className="border-t pt-4">
          <div className="font-bold mb-2">Activity Details:</div>
          {monthActivities.map(({ activity, occurrences }) => (
            <div key={activity.id} className="text-sm mb-1">
              • <strong>{activity.name}</strong>
              {activity.is_recurring && activity.recurrence_day && (
                <span> ({activity.recurrence_day}s {activity.default_time && `at ${activity.default_time}`})</span>
              )}
              {activity.address && ` — ${activity.address}`}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
