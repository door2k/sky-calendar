import { useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  startOfWeek,
  addDays,
  startOfMonth,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  isSameMonth,
  isSaturday,
  getDay,
} from 'date-fns';
import { isLastFridayOfMonth } from '../lib/dateUtils';
import { usePeople } from '../hooks/usePeople';
import { useActivities } from '../hooks/useActivities';
import { useWeekSchedule, useMonthSchedule } from '../hooks/useSchedule';
import { useTheme } from '../hooks/useTheme';
import { PersonAvatar } from '../components/PersonAvatar';
import type { Activity, SaturdayActivity, Person } from '../types';

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

// Fun colors for each day
const DAY_COLORS = [
  '#FF6B6B', // Sunday
  '#4ECDC4', // Monday
  '#FFE66D', // Tuesday
  '#95E1D3', // Wednesday
  '#DDA0DD', // Thursday
  '#F38181', // Friday
  '#AA96DA', // Saturday
];

const WEEKDAY_EMOJIS = ['🌈', '🚀', '🌟', '🦋', '🎨', '🎉', '🌸'];

export function PrintCombined() {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();
  const { currentTheme } = useTheme();

  const weekStart = useMemo(() => {
    if (date) {
      return startOfWeek(parseISO(date), { weekStartsOn: 0 });
    }
    return startOfWeek(new Date(), { weekStartsOn: 0 });
  }, [date]);

  const currentMonth = useMemo(() => startOfMonth(weekStart), [weekStart]);
  const year = currentMonth.getFullYear();
  const monthNum = currentMonth.getMonth() + 1;

  const { data: people = [] } = usePeople();
  const { data: activities = [] } = useActivities();
  const { data: weekData } = useWeekSchedule(weekStart);
  const { data: monthData } = useMonthSchedule(year, monthNum);

  const themeEmoji = currentTheme?.emoji || '✨';

  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

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

  const getPerson = (id?: string): Person | null => {
    if (!id) return null;
    return people.find((p) => p.id === id) || null;
  };

  const renderPerson = (id?: string) => {
    const person = getPerson(id);
    if (!person) return <span className="text-gray-300">—</span>;
    return <PersonAvatar person={person} size="sm" printSize />;
  };

  const getActivity = (id?: string): Activity | undefined => {
    if (!id) return undefined;
    return activities.find((a) => a.id === id);
  };

  const getScheduleForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return monthData?.daySchedules.find((s) => s.date === dateStr);
  };

  const getSaturdayScheduleForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return monthData?.saturdaySchedules.find((s) => s.date === dateStr);
  };

  // Get recurring activities for a specific day of the week
  const getRecurringActivitiesForDay = (date: Date): Activity[] => {
    const dayOfWeek = getDay(date);
    const dayName = DAY_NAMES[dayOfWeek];
    return activities.filter(
      (a) => a.is_recurring && a.recurrence_day?.toLowerCase() === dayName
    );
  };

  // Collect activities for this week
  const weekActivities = useMemo(() => {
    const activityMap = new Map<string, { activity: Activity; days: string[]; time?: string }>();

    weekDates.slice(0, 6).forEach((date, idx) => {
      const day = weekData?.days[idx];

      if (day?.after_gan_activity_id) {
        const activity = getActivity(day.after_gan_activity_id);
        if (activity) {
          const existing = activityMap.get(activity.id);
          if (existing) {
            existing.days.push(format(date, 'EEE'));
            if (day.after_gan_time) existing.time = day.after_gan_time;
          } else {
            activityMap.set(activity.id, {
              activity,
              days: [format(date, 'EEE')],
              time: day.after_gan_time || activity.default_time,
            });
          }
        }
      }

      // Recurring activities
      const recurringActivities = getRecurringActivitiesForDay(date);
      recurringActivities.forEach((activity) => {
        if (activity.id !== day?.after_gan_activity_id) {
          const existing = activityMap.get(activity.id);
          if (existing) {
            if (!existing.days.includes(format(date, 'EEE'))) {
              existing.days.push(format(date, 'EEE'));
            }
          } else {
            activityMap.set(activity.id, {
              activity,
              days: [format(date, 'EEE')],
              time: activity.default_time,
            });
          }
        }
      });
    });

    return Array.from(activityMap.values());
  }, [weekData, activities, weekDates]);

  // Auto-print on load
  useEffect(() => {
    const timer = setTimeout(() => {
      window.print();
    }, 500);
    return () => clearTimeout(timer);
  }, [weekData, monthData]);

  const weekEndDate = addDays(weekStart, 6);
  const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  return (
    <div className="p-3 max-w-4xl mx-auto bg-white print:p-2">
      {/* Back button (hidden in print) */}
      <button
        onClick={() => navigate(-1)}
        className="mb-3 px-4 py-2 border rounded no-print hover:bg-gray-50"
      >
        ← Back
      </button>

      {/* Fun Header */}
      <div className="relative mb-4">
        <div
          className="text-center py-4 rounded-2xl shadow-lg"
          style={{
            background: `linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)`,
            color: 'white',
          }}
        >
          <div className="text-3xl mb-1">
            {themeEmoji} {themeEmoji} {themeEmoji}
          </div>
          <h1 className="text-3xl font-black">SKY'S SCHEDULE</h1>
          <p className="text-lg opacity-90">
            Week of {format(weekStart, 'MMMM d')} - {format(weekEndDate, 'd, yyyy')}
          </p>
        </div>
        <div className="absolute -top-1 -left-1 text-2xl">⭐</div>
        <div className="absolute -top-1 -right-1 text-2xl">⭐</div>
      </div>

      {/* Weekly Schedule - Compact Cards */}
      <div className="grid grid-cols-6 gap-1.5 mb-3">
        {weekDates.slice(0, 6).map((date, idx) => {
          const day = weekData?.days[idx];
          const isNoGan = day?.is_no_gan;
          const activity = getActivity(day?.after_gan_activity_id);
          const recurringActivities = getRecurringActivitiesForDay(date)
            .filter(a => a.id !== day?.after_gan_activity_id);
          const vibe = { color: DAY_COLORS[idx], emoji: WEEKDAY_EMOJIS[idx] };
          const isFriday = idx === 5;

          return (
            <div
              key={format(date, 'yyyy-MM-dd')}
              className={`rounded-lg overflow-hidden shadow ${isNoGan ? 'ring-2 ring-orange-400' : ''}`}
              style={{ backgroundColor: isNoGan ? '#FEF3C7' : '#FAFAFA' }}
            >
              {/* Day Header */}
              <div
                className="text-center py-1 text-white font-bold"
                style={{ backgroundColor: vibe.color }}
              >
                <span className="text-lg">{vibe.emoji}</span>
                <div style={{ fontSize: '10px' }}>{format(date, 'EEE').toUpperCase()}</div>
                <div className="text-lg font-black leading-tight">{format(date, 'd')}</div>
              </div>

              {isNoGan && (
                <div className="bg-orange-500 text-white text-center py-0.5 font-bold" style={{ fontSize: '9px' }}>
                  🏠 NO GAN
                </div>
              )}

              <div className="p-1.5 space-y-1" style={{ fontSize: '9px' }}>
                <div className={`flex items-center gap-1 p-1 rounded ${isNoGan ? 'opacity-40' : ''}`}
                  style={{ backgroundColor: 'var(--color-gan)' }}>
                  <span>🌅</span>
                  {renderPerson(day?.dropoff_person_id)}
                </div>

                <div className={`flex items-center gap-1 p-1 rounded ${isNoGan ? 'opacity-40' : ''}`}
                  style={{ backgroundColor: 'var(--color-gan)' }}>
                  <span>🌆</span>
                  {renderPerson(day?.pickup_person_id)}
                </div>

                {activity && (
                  <div className="p-1 rounded text-center text-white font-medium"
                    style={{ backgroundColor: 'var(--color-primary)' }}>
                    🎯 {activity.name}
                  </div>
                )}

                {recurringActivities.slice(0, 1).map((act) => (
                  <div key={act.id} className="p-1 rounded text-center bg-purple-100 text-purple-700 font-medium">
                    ○ {act.name}
                  </div>
                ))}

                <div className="flex items-center gap-1 p-1 rounded bg-indigo-50">
                  <span>🌙</span>
                  {renderPerson(day?.bedtime_person_id)}
                </div>

                {isFriday && day?.family_dinner_person_id && (
                  <div className="p-1 rounded bg-amber-100 border border-amber-300 text-center">
                    <span>🍽️</span>
                    {renderPerson(day.family_dinner_person_id)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Saturday Compact */}
      <div
        className="rounded-xl p-3 mb-3 shadow"
        style={{ background: `linear-gradient(135deg, ${DAY_COLORS[6]} 0%, #E8DAEF 100%)` }}
      >
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-2xl">🌸</span>
          <span className="text-xl font-black text-purple-800">
            SATURDAY {format(weekDates[6], 'd')}
          </span>
          <span className="text-2xl">🌸</span>
        </div>
        {weekData?.saturday?.activities && weekData.saturday.activities.length > 0 ? (
          <div className="flex flex-wrap justify-center gap-2">
            {weekData.saturday.activities.map((act: SaturdayActivity, idx: number) => {
              const activity = getActivity(act.activity_id);
              return (
                <div key={idx} className="bg-white/80 rounded-lg px-3 py-1.5 text-center shadow text-sm">
                  <span className="font-bold text-purple-800">{act.custom_name || activity?.name}</span>
                  {act.time && <span className="text-purple-600 ml-1">@ {act.time}</span>}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center text-purple-700">😴 Rest day!</div>
        )}
      </div>

      {/* Monthly Calendar - Compact */}
      <div className="rounded-xl overflow-hidden shadow mb-3">
        <div className="text-center py-2 font-bold text-lg"
          style={{ backgroundColor: 'var(--color-secondary)' }}>
          📅 {format(currentMonth, 'MMMM yyyy')}
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7">
          {WEEKDAYS.map((day, idx) => (
            <div
              key={day}
              className="p-1 text-center text-white font-bold"
              style={{ backgroundColor: DAY_COLORS[idx], fontSize: '10px' }}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 bg-gray-50">
          {calendarDays.map((date) => {
            const dateStr = format(date, 'yyyy-MM-dd');
            const isCurrentMonth = isSameMonth(date, currentMonth);
            const isSat = isSaturday(date);
            const isLastFri = isLastFridayOfMonth(date);
            const schedule = getScheduleForDate(date);
            const satSchedule = getSaturdayScheduleForDate(date);
            const isNoGan = schedule?.is_no_gan || isLastFri;
            const dayOfWeek = getDay(date);

            return (
              <div
                key={dateStr}
                className={`
                  min-h-[50px] p-1 border-t border-l relative
                  ${!isCurrentMonth ? 'bg-gray-100 text-gray-400' : ''}
                `}
                style={{
                  backgroundColor: !isCurrentMonth
                    ? '#f3f4f6'
                    : isSat
                    ? '#F3E8FF'
                    : isNoGan
                    ? '#FEF3C7'
                    : '#ffffff',
                }}
              >
                <div
                  className="inline-flex items-center justify-center w-5 h-5 rounded-full font-bold"
                  style={{
                    fontSize: '10px',
                    backgroundColor: isCurrentMonth ? `${DAY_COLORS[dayOfWeek]}30` : undefined,
                  }}
                >
                  {format(date, 'd')}
                </div>

                {isNoGan && isCurrentMonth && (
                  <span className="absolute top-0.5 right-0.5 text-xs">🏠</span>
                )}

                {isCurrentMonth && schedule?.after_gan_activity_id && (
                  <div
                    className="mt-0.5 px-1 rounded text-white truncate"
                    style={{ fontSize: '8px', backgroundColor: 'var(--color-primary)' }}
                  >
                    {getActivity(schedule.after_gan_activity_id)?.name}
                  </div>
                )}

                {isCurrentMonth && isSat && satSchedule?.activities?.slice(0, 1).map((act: SaturdayActivity, idx: number) => (
                  <div
                    key={idx}
                    className="mt-0.5 px-1 rounded bg-purple-500 text-white truncate"
                    style={{ fontSize: '8px' }}
                  >
                    {act.custom_name || getActivity(act.activity_id)?.name}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Activity Details - Compact */}
      {weekActivities.length > 0 && (
        <div className="rounded-xl p-3 shadow" style={{ backgroundColor: 'var(--color-background)' }}>
          <div className="font-bold mb-2 flex items-center gap-1">
            <span>📍</span> Where to go:
          </div>
          <div className="grid grid-cols-2 gap-2">
            {weekActivities.map(({ activity, days, time }) => (
              <div
                key={activity.id}
                className="p-2 rounded-lg bg-white shadow text-sm border-l-3"
                style={{ borderLeftWidth: '3px', borderColor: 'var(--color-primary)' }}
              >
                <div className="font-bold">{activity.name}</div>
                <div className="text-gray-600" style={{ fontSize: '10px' }}>
                  {days.join(', ')} {time && `@ ${time}`}
                </div>
                {activity.address && (
                  <div className="text-gray-500 truncate" style={{ fontSize: '10px' }}>
                    📍 {activity.address}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center mt-4 text-gray-400" style={{ fontSize: '10px' }}>
        Made with 💜 for Sky
      </div>
    </div>
  );
}
