import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  addDays,
  format,
  isSameMonth,
  isSaturday,
  parseISO,
  getDay,
} from 'date-fns';
import { ThemePicker } from '../components/ThemePicker';
import { ActivityPopup } from '../components/ActivityPopup';
import { AIAssistant } from '../components/AIAssistant';
import { useTheme } from '../hooks/useTheme';
import { usePeople } from '../hooks/usePeople';
import { useActivities } from '../hooks/useActivities';
import { useMonthSchedule } from '../hooks/useSchedule';
import type { Activity, DaySchedule, SaturdaySchedule } from '../types';

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export function MonthView() {
  const { month } = useParams<{ month?: string }>();
  const navigate = useNavigate();

  const currentMonth = useMemo(() => {
    if (month) {
      return parseISO(`${month}-01`);
    }
    return new Date();
  }, [month]);

  const year = currentMonth.getFullYear();
  const monthNum = currentMonth.getMonth() + 1;

  const { currentTheme, selectTheme } = useTheme();
  const { data: people = [] } = usePeople();
  const { data: activities = [] } = useActivities();
  const { data: monthData } = useMonthSchedule(year, monthNum);

  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  // Get the current week start (for AI Assistant context)
  const currentWeekStart = useMemo(() => {
    return startOfWeek(new Date(), { weekStartsOn: 0 });
  }, []);

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

  const getScheduleForDate = (date: Date): DaySchedule | undefined => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return monthData?.daySchedules.find((s) => s.date === dateStr);
  };

  const getSaturdayScheduleForDate = (date: Date): SaturdaySchedule | undefined => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return monthData?.saturdaySchedules.find((s) => s.date === dateStr);
  };

  const getActivityById = (id: string): Activity | undefined => {
    return activities.find((a) => a.id === id);
  };

  // Get recurring activities for a specific day of the week
  const getRecurringActivitiesForDay = (date: Date): Activity[] => {
    const dayOfWeek = getDay(date); // 0 = Sunday, 1 = Monday, etc.
    const dayName = DAY_NAMES[dayOfWeek];
    return activities.filter(
      (a) => a.is_recurring && a.recurrence_day?.toLowerCase() === dayName
    );
  };

  const handlePrevMonth = () => {
    const prev = subMonths(currentMonth, 1);
    navigate(`/month/${format(prev, 'yyyy-MM')}`);
  };

  const handleNextMonth = () => {
    const next = addMonths(currentMonth, 1);
    navigate(`/month/${format(next, 'yyyy-MM')}`);
  };

  const handleDayClick = (date: Date) => {
    const weekStart = startOfWeek(date, { weekStartsOn: 0 });
    navigate(`/week/${format(weekStart, 'yyyy-MM-dd')}`);
  };

  const handlePrint = () => {
    navigate(`/print/month/${format(currentMonth, 'yyyy-MM')}`);
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl md:text-3xl font-bold">Sky's Month</h1>
          <div className="flex items-center gap-4">
            <div className="px-3 py-1.5 rounded-full text-sm font-medium" style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
              Today: {format(new Date(), 'EEEE, MMM d')}
            </div>
            <ThemePicker currentTheme={currentTheme} onSelectTheme={selectTheme} />
          </div>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <button
            onClick={handlePrevMonth}
            className="px-3 py-1 rounded hover:bg-gray-100"
          >
            ◀
          </button>
          <h2 className="text-xl font-bold">
            {format(currentMonth, 'MMMM yyyy').toUpperCase()}
          </h2>
          <button
            onClick={handleNextMonth}
            className="px-3 py-1 rounded hover:bg-gray-100"
          >
            ▶
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="border rounded-lg overflow-hidden">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 bg-gray-100">
            {WEEKDAYS.map((day) => (
              <div key={day} className="p-2 text-center text-sm font-medium">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7">
            {calendarDays.map((date) => {
              const dateStr = format(date, 'yyyy-MM-dd');
              const isCurrentMonth = isSameMonth(date, currentMonth);
              const isSat = isSaturday(date);
              const schedule = getScheduleForDate(date);
              const satSchedule = getSaturdayScheduleForDate(date);
              const isNoGan = schedule?.is_no_gan;

              return (
                <div
                  key={dateStr}
                  onClick={() => handleDayClick(date)}
                  className={`
                    min-h-[80px] p-2 border-t border-l cursor-pointer
                    hover:bg-gray-50 transition-colors
                    ${!isCurrentMonth ? 'bg-gray-50 text-gray-400' : ''}
                    ${isSat ? 'bg-opacity-50' : ''}
                    ${isNoGan ? 'bg-opacity-50' : ''}
                  `}
                  style={{
                    backgroundColor: isSat
                      ? 'var(--color-saturday)'
                      : isNoGan
                      ? 'var(--color-no-gan)'
                      : undefined,
                  }}
                >
                  <div className={`text-sm font-medium ${isNoGan ? 'text-orange-700' : ''}`}>
                    {format(date, 'd')}
                  </div>

                  {isNoGan && (
                    <div className="text-xs font-bold text-orange-600 mt-1">
                      NO GAN
                      {schedule?.no_gan_reason && (
                        <div className="font-normal">{schedule.no_gan_reason}</div>
                      )}
                    </div>
                  )}

                  {/* Activities */}
                  <div className="mt-1 space-y-1">
                    {/* Explicitly assigned activity */}
                    {schedule?.after_gan_activity_id && (
                      <div
                        className="text-xs truncate"
                        onClick={(e) => {
                          e.stopPropagation();
                          const activity = getActivityById(schedule.after_gan_activity_id!);
                          if (activity) setSelectedActivity(activity);
                        }}
                      >
                        <span className="text-blue-600 hover:underline cursor-pointer">
                          ● {getActivityById(schedule.after_gan_activity_id)?.name}
                        </span>
                      </div>
                    )}

                    {/* Recurring activities for this day of week (if not already shown via explicit assignment) */}
                    {!isSat && getRecurringActivitiesForDay(date)
                      .filter((a) => a.id !== schedule?.after_gan_activity_id)
                      .map((activity) => (
                        <div
                          key={activity.id}
                          className="text-xs truncate"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedActivity(activity);
                          }}
                        >
                          <span className="text-purple-600 hover:underline cursor-pointer">
                            ○ {activity.name}
                          </span>
                        </div>
                      ))}

                    {isSat && satSchedule?.activities?.map((act, idx) => {
                      const activity = getActivityById(act.activity_id);
                      return (
                        <div
                          key={idx}
                          className="text-xs truncate"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (activity) setSelectedActivity(activity);
                          }}
                        >
                          <span className="text-blue-600 hover:underline cursor-pointer">
                            ● {act.custom_name || activity?.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-6 mt-4 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <span className="text-blue-600">●</span>
            <span>Scheduled Activity</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-purple-600">○</span>
            <span>Recurring Activity</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: 'var(--color-no-gan)' }}
            />
            <span>No Gan</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: 'var(--color-saturday)' }}
            />
            <span>Saturday</span>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-center gap-4 mt-6 no-print">
          <Link
            to="/week"
            className="px-4 py-2 rounded-lg border hover:bg-gray-50"
          >
            Week View
          </Link>
          <button
            onClick={handlePrint}
            className="px-4 py-2 rounded-lg border hover:bg-gray-50"
          >
            Print
          </button>
        </div>
      </div>

      {/* Activity Popup */}
      {selectedActivity && (
        <ActivityPopup
          activity={selectedActivity}
          onClose={() => setSelectedActivity(null)}
        />
      )}

      {/* AI Assistant */}
      <AIAssistant
        people={people}
        activities={activities}
        currentWeekStart={currentWeekStart}
        schedules={monthData?.daySchedules || []}
      />
    </div>
  );
}
