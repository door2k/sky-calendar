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
import { useTheme } from '../hooks/useTheme';
import type { Activity, SaturdayActivity } from '../types';

export function PrintMonth() {
  const { month } = useParams<{ month: string }>();
  const navigate = useNavigate();
  const { currentTheme } = useTheme();

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

  const themeEmoji = currentTheme?.emoji || '';

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

      {/* Header with theme styling */}
      <div
        className="text-center mb-6 p-4 rounded-lg"
        style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
      >
        <h1 className="text-3xl font-bold">
          {themeEmoji} SKY'S MONTH {themeEmoji}
        </h1>
        <p className="text-xl opacity-90">{format(currentMonth, 'MMMM yyyy')}</p>
      </div>

      {/* Calendar Grid */}
      <table className="w-full border-collapse border text-sm mb-6">
        <thead>
          <tr style={{ backgroundColor: 'var(--color-secondary)' }}>
            {WEEKDAYS.map((day) => (
              <th key={day} className="border p-2 text-center font-bold">
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
                      ${!isCurrentMonth ? 'text-gray-400' : ''}
                    `}
                    style={{
                      backgroundColor: !isCurrentMonth
                        ? '#f9fafb'
                        : isSat
                        ? 'var(--color-saturday)'
                        : isNoGan
                        ? 'var(--color-no-gan)'
                        : undefined,
                    }}
                  >
                    <div className="font-bold">{format(date, 'd')}</div>

                    {isNoGan && (
                      <div className="text-xs font-bold text-orange-600">
                        NO GAN
                        {schedule?.no_gan_reason && (
                          <div className="font-normal text-orange-500">{schedule.no_gan_reason}</div>
                        )}
                      </div>
                    )}

                    {schedule?.after_gan_activity_id && (
                      <div className="text-xs">
                        <span className="inline-block px-1 rounded" style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
                          {getActivityById(schedule.after_gan_activity_id)?.name}
                        </span>
                      </div>
                    )}

                    {isSat && satSchedule?.activities?.map((act: SaturdayActivity, idx: number) => (
                      <div key={idx} className="text-xs">
                        <span className="inline-block px-1 rounded" style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
                          {act.custom_name || getActivityById(act.activity_id)?.name}
                        </span>
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
      <div className="flex flex-wrap gap-6 text-sm mb-6">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: 'var(--color-no-gan)' }} />
          <span>No Gan</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: 'var(--color-saturday)' }} />
          <span>Saturday</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: 'var(--color-primary)' }} />
          <span>Activity</span>
        </div>
      </div>

      {/* Activity Details */}
      {monthActivities.length > 0 && (
        <div className="border-t pt-4">
          <div className="font-bold mb-3 text-lg">📍 Activity Details:</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {monthActivities.map(({ activity }) => (
              <div
                key={activity.id}
                className="p-2 rounded border-l-4"
                style={{ borderColor: 'var(--color-primary)', backgroundColor: 'var(--color-background)' }}
              >
                <div className="font-bold">{activity.name}</div>
                {activity.is_recurring && activity.recurrence_day && (
                  <div className="text-sm text-gray-600">
                    {activity.recurrence_day}s {activity.default_time && `at ${activity.default_time}`}
                  </div>
                )}
                {activity.address && (
                  <div className="text-sm">📍 {activity.address}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
