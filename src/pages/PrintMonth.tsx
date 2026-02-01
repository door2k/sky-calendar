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
  getDay,
} from 'date-fns';
import { isLastFridayOfMonth } from '../lib/dateUtils';
import { useActivities } from '../hooks/useActivities';
import { useMonthSchedule } from '../hooks/useSchedule';
import { useTheme } from '../hooks/useTheme';
import { useI18n, useFormatDate } from '../lib/i18n';
import type { Activity, SaturdayActivity } from '../types';

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

// Fun colors for each day header
const DAY_COLORS = [
  '#FF6B6B', // Sunday - coral
  '#4ECDC4', // Monday - teal
  '#FFE66D', // Tuesday - yellow
  '#95E1D3', // Wednesday - mint
  '#DDA0DD', // Thursday - plum
  '#F38181', // Friday - salmon
  '#AA96DA', // Saturday - lavender
];

const WEEKDAY_EMOJIS = ['🌈', '🚀', '🌟', '🦋', '🎨', '🎉', '🌸'];

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
  const { t, translateActivity, translateReason, translateDayName } = useI18n();
  const formatDate = useFormatDate();

  const themeEmoji = currentTheme?.emoji || '✨';

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

  // Get recurring activities for a specific day of the week
  const getRecurringActivitiesForDay = (date: Date): Activity[] => {
    const dayOfWeek = getDay(date);
    const dayName = DAY_NAMES[dayOfWeek];
    return activities.filter(
      (a) => a.is_recurring && a.recurrence_day?.toLowerCase() === dayName
    );
  };

  // Collect all activities for the month
  const monthActivities = useMemo(() => {
    const activityMap = new Map<string, { activity: Activity; count: number }>();

    monthData?.daySchedules.forEach((day) => {
      if (day.after_gan_activity_id) {
        const activity = getActivityById(day.after_gan_activity_id);
        if (activity) {
          const existing = activityMap.get(activity.id);
          if (existing) {
            existing.count++;
          } else {
            activityMap.set(activity.id, { activity, count: 1 });
          }
        }
      }
    });

    // Add recurring activities
    activities
      .filter((a) => a.is_recurring && a.recurrence_day)
      .forEach((activity) => {
        if (!activityMap.has(activity.id)) {
          activityMap.set(activity.id, { activity, count: 0 });
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

  const WEEKDAYS = [t('sun'), t('mon'), t('tue'), t('wed'), t('thu'), t('fri'), t('sat')];

  return (
    <div className="p-4 max-w-4xl mx-auto bg-white print:p-2">
      {/* Back button (hidden in print) */}
      <button
        onClick={() => navigate(-1)}
        className="mb-4 px-4 py-2 border rounded no-print hover:bg-gray-50"
      >
        {t('back')}
      </button>

      {/* Fun Header */}
      <div className="relative mb-6">
        <div
          className="text-center py-6 rounded-2xl shadow-lg"
          style={{
            background: `linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)`,
            color: 'white',
          }}
        >
          <div className="text-4xl mb-2">
            {themeEmoji} {themeEmoji} {themeEmoji}
          </div>
          <h1 className="text-4xl font-black tracking-wide">
            {t('skys_adventure_month')}
          </h1>
          <p className="text-2xl mt-2 font-bold opacity-90">
            {formatDate(currentMonth, 'MMMM yyyy').toUpperCase()}
          </p>
          <div className="text-4xl mt-2">
            {themeEmoji} {themeEmoji} {themeEmoji}
          </div>
        </div>
        {/* Decorative corners */}
        <div className="absolute -top-2 -left-2 text-3xl">🌟</div>
        <div className="absolute -top-2 -right-2 text-3xl">🌟</div>
        <div className="absolute -bottom-2 -left-2 text-3xl">⭐</div>
        <div className="absolute -bottom-2 -right-2 text-3xl">⭐</div>
      </div>

      {/* Calendar Grid */}
      <div className="rounded-2xl overflow-hidden shadow-lg mb-6">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7">
          {WEEKDAYS.map((day, idx) => (
            <div
              key={day}
              className="p-2 text-center font-bold text-white"
              style={{ backgroundColor: DAY_COLORS[idx] }}
            >
              <div className="text-xl">{WEEKDAY_EMOJIS[idx]}</div>
              <div className="text-sm">{day}</div>
            </div>
          ))}
        </div>

        {/* Calendar Days */}
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

            const assignedActivity = schedule?.after_gan_activity_id
              ? getActivityById(schedule.after_gan_activity_id)
              : null;

            const recurringActivities = !isSat
              ? getRecurringActivitiesForDay(date).filter(
                  (a) => a.id !== schedule?.after_gan_activity_id
                )
              : [];

            return (
              <div
                key={dateStr}
                className={`
                  min-h-[90px] p-1.5 border-t border-l relative
                  ${!isCurrentMonth ? 'bg-gray-100' : 'bg-white'}
                `}
                style={{
                  backgroundColor: !isCurrentMonth
                    ? '#f3f4f6'
                    : isSat
                    ? '#F3E8FF'
                    : isNoGan
                    ? '#FEF3C7'
                    : undefined,
                }}
              >
                {/* Date number with fun styling */}
                <div
                  className={`
                    inline-flex items-center justify-center w-7 h-7 rounded-full font-bold text-sm
                    ${!isCurrentMonth ? 'text-gray-400' : 'text-gray-800'}
                  `}
                  style={{
                    backgroundColor: isCurrentMonth ? `${DAY_COLORS[dayOfWeek]}30` : undefined,
                  }}
                >
                  {format(date, 'd')}
                </div>

                {/* No Gan Badge */}
                {isNoGan && isCurrentMonth && (
                  <div className="absolute top-1 right-1">
                    <span className="inline-block px-1.5 py-0.5 bg-orange-500 text-white text-xs font-bold rounded-full">
                      🏠
                    </span>
                  </div>
                )}

                {/* Last Friday Badge */}
                {isLastFri && isCurrentMonth && (
                  <div className="text-xs font-bold text-orange-600 mt-0.5">
                    {t('last_friday_label')}
                  </div>
                )}

                {/* No Gan Reason */}
                {isNoGan && !isLastFri && schedule?.no_gan_reason && isCurrentMonth && (
                  <div className="text-xs text-orange-600 mt-0.5 truncate">
                    {translateReason(schedule.no_gan_reason)}
                  </div>
                )}

                {/* Activities */}
                {isCurrentMonth && (
                  <div className="mt-1 space-y-0.5">
                    {/* Assigned activity */}
                    {assignedActivity && (
                      <div
                        className="text-xs px-1.5 py-0.5 rounded-full truncate text-white font-medium"
                        style={{ backgroundColor: 'var(--color-primary)' }}
                      >
                        🎯 {translateActivity(assignedActivity.name)}
                      </div>
                    )}

                    {/* Recurring activities */}
                    {recurringActivities.slice(0, 1).map((activity) => (
                      <div
                        key={activity.id}
                        className="text-xs px-1.5 py-0.5 rounded-full truncate bg-purple-200 text-purple-800 font-medium"
                      >
                        ○ {translateActivity(activity.name)}
                      </div>
                    ))}

                    {/* Saturday activities */}
                    {isSat &&
                      satSchedule?.activities?.slice(0, 2).map((act: SaturdayActivity, idx: number) => {
                        const activity = getActivityById(act.activity_id);
                        return (
                          <div
                            key={idx}
                            className="text-xs px-1.5 py-0.5 rounded-full truncate bg-purple-500 text-white font-medium"
                          >
                            🎯 {translateActivity(act.custom_name || activity?.name || '')}
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Fun Legend */}
      <div className="flex flex-wrap justify-center gap-4 mb-6 p-4 rounded-2xl bg-gray-50">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white shadow">
          <span
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: 'var(--color-primary)' }}
          />
          <span className="text-sm font-medium">{t('activity')}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white shadow">
          <span className="w-4 h-4 rounded-full bg-purple-200" />
          <span className="text-sm font-medium">{t('recurring')}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white shadow">
          <span className="w-4 h-4 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs">
            🏠
          </span>
          <span className="text-sm font-medium">{t('no_gan')}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white shadow">
          <span className="w-4 h-4 rounded-full bg-purple-100" />
          <span className="text-sm font-medium">{t('saturday')}</span>
        </div>
      </div>

      {/* Activity Details */}
      {monthActivities.length > 0 && (
        <div className="rounded-2xl overflow-hidden shadow-lg"
          style={{ backgroundColor: 'var(--color-background)' }}>
          <div className="p-4">
            <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
              <span className="text-2xl">🗺️</span>
              {t('this_months_adventures')}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {monthActivities.map(({ activity }) => (
                <div
                  key={activity.id}
                  className="p-3 rounded-xl bg-white shadow border-l-4"
                  style={{ borderColor: 'var(--color-primary)' }}
                >
                  <div className="font-bold">{translateActivity(activity.name)}</div>
                  {activity.is_recurring && activity.recurrence_day && (
                    <div className="text-sm text-purple-600 flex items-center gap-1">
                      <span>🔄</span>
                      {t('every')} {translateDayName(activity.recurrence_day)}
                      {activity.default_time && ` @ ${activity.default_time}`}
                    </div>
                  )}
                  {activity.address && (
                    <div className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                      <span>📍</span>
                      <span className="truncate">{activity.address}</span>
                    </div>
                  )}
                  {activity.contact_phone && (
                    <div className="text-sm text-gray-600 flex items-center gap-1">
                      <span>📞</span> {activity.contact_phone}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Fun Footer */}
      <div className="text-center mt-6 text-gray-400 text-sm">
        {t('made_with_love')}
      </div>
    </div>
  );
}
