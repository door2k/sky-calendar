import { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
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
  isSameDay,
  parseISO,
  getDay,
} from 'date-fns';
import { isLastFridayOfMonth } from '../lib/dateUtils';
import { ThemePicker } from '../components/ThemePicker';
import { ActivityPopup } from '../components/ActivityPopup';
import { AIAssistant } from '../components/AIAssistant';
import { useTheme } from '../hooks/useTheme';
import { usePeople } from '../hooks/usePeople';
import { useActivities } from '../hooks/useActivities';
import { useMonthSchedule } from '../hooks/useSchedule';
import { useI18n, useFormatDate, LanguageToggle } from '../lib/i18n';
import type { Activity, DaySchedule, SaturdaySchedule } from '../types';

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export function MonthView() {
  const { month } = useParams<{ month?: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isViewMode = searchParams.has('view');
  const { t, translateActivity, translateReason } = useI18n();
  const formatDate = useFormatDate();

  const WEEKDAYS_I18N = [t('sun'), t('mon'), t('tue'), t('wed'), t('thu'), t('fri'), t('sat')];

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
  const todayRef = useRef<HTMLDivElement>(null);
  const today = useMemo(() => new Date(), []);

  // Get the current week start (for AI Assistant context)
  const currentWeekStart = useMemo(() => {
    return startOfWeek(new Date(), { weekStartsOn: 0 });
  }, []);

  // Scroll to today on mount
  useEffect(() => {
    if (todayRef.current) {
      todayRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [monthData]);

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

  const viewSuffix = isViewMode ? '?view' : '';

  const handlePrevMonth = () => {
    const prev = subMonths(currentMonth, 1);
    navigate(`/month/${format(prev, 'yyyy-MM')}${viewSuffix}`);
  };

  const handleNextMonth = () => {
    const next = addMonths(currentMonth, 1);
    navigate(`/month/${format(next, 'yyyy-MM')}${viewSuffix}`);
  };

  const handleDayClick = (date: Date) => {
    const weekStart = startOfWeek(date, { weekStartsOn: 0 });
    navigate(`/week/${format(weekStart, 'yyyy-MM-dd')}${isViewMode ? '?view' : ''}`);
  };

  const handlePrint = () => {
    navigate(`/print/month/${format(currentMonth, 'yyyy-MM')}`);
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl md:text-3xl font-bold">{t('skys_month')}</h1>
          <div className="flex items-center gap-4">
            <LanguageToggle />
            <div className="px-3 py-1.5 rounded-full text-sm font-medium" style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
              {t('today')}: {formatDate(new Date(), 'EEEE, MMM d')}
            </div>
            {!isViewMode && <ThemePicker currentTheme={currentTheme} onSelectTheme={selectTheme} />}
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
            {formatDate(currentMonth, 'MMMM yyyy').toUpperCase()}
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
            {WEEKDAYS_I18N.map((day) => (
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
              const isLastFri = isLastFridayOfMonth(date);
              const isSaturdayLike = isSat || isLastFri;
              const schedule = getScheduleForDate(date);
              const satSchedule = getSaturdayScheduleForDate(date);
              const isNoGan = schedule?.is_no_gan || isLastFri;
              const isToday = isSameDay(date, today);

              return (
                <div
                  key={dateStr}
                  ref={isToday ? todayRef : undefined}
                  onClick={() => handleDayClick(date)}
                  className={`
                    min-h-[80px] p-2 border-t border-l cursor-pointer
                    hover:bg-gray-50 transition-colors
                    ${!isCurrentMonth ? 'bg-gray-50 text-gray-400' : ''}
                    ${isSaturdayLike ? 'bg-opacity-50' : ''}
                    ${isNoGan && !isLastFri ? 'bg-opacity-50' : ''}
                    ${isToday ? 'ring-4 ring-yellow-400 ring-inset z-10' : ''}
                  `}
                  style={{
                    backgroundColor: isSaturdayLike
                      ? 'var(--color-saturday)'
                      : isNoGan
                      ? 'var(--color-no-gan)'
                      : undefined,
                  }}
                >
                  <div className={`text-sm font-medium ${isNoGan ? 'text-orange-700' : ''} ${isToday ? 'bg-yellow-400 rounded-full w-6 h-6 flex items-center justify-center' : ''}`}>
                    {format(date, 'd')}
                  </div>

                  {/* Last Friday badge */}
                  {isLastFri && (
                    <div className="text-xs font-bold text-orange-600 mt-1">
                      {t('no_gan')}
                      <div className="font-normal">{t('reason_last_friday')}</div>
                    </div>
                  )}

                  {/* No Gan / Holiday display */}
                  {isNoGan && !isLastFri && (
                    <div className="text-xs font-bold text-orange-600 mt-1">
                      {schedule?.no_gan_reason === 'Holiday' ? (
                        <>{t('holiday_label')}</>
                      ) : (
                        <>{t('no_gan')}</>
                      )}
                      {schedule?.no_gan_reason && (
                        <div className="font-normal">{translateReason(schedule.no_gan_reason, schedule.no_gan_reason_he)}</div>
                      )}
                    </div>
                  )}

                  {/* Gan Activity (only show on weekdays that have gan) */}
                  {!isSaturdayLike && !isNoGan && schedule?.gan_activity && (
                    <div className="text-xs mt-1 truncate">
                      <span className="text-green-700">🏫 {translateActivity(schedule.gan_activity, schedule.gan_activity_he)}</span>
                    </div>
                  )}

                  {/* Activities */}
                  <div className="mt-1 space-y-0.5">
                    {/* Explicitly assigned after-gan activity */}
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
                          {getActivityById(schedule.after_gan_activity_id)?.icon || '🎯'} {translateActivity(getActivityById(schedule.after_gan_activity_id)?.name || ''  , getActivityById(schedule.after_gan_activity_id)?.name_he)}
                        </span>
                      </div>
                    )}

                    {/* Recurring activities for this day of week (if not already shown via explicit assignment) */}
                    {!isSaturdayLike && getRecurringActivitiesForDay(date)
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
                            {activity.icon || '○'} {translateActivity(activity.name)}
                          </span>
                        </div>
                      ))}

                    {/* Saturday/Last Friday activities */}
                    {isSaturdayLike && satSchedule?.activities?.map((act, idx) => {
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
                            {activity?.icon || '🎯'} {translateActivity(act.custom_name || activity?.name || ''  , satSchedule?.activities_he?.[idx]?.custom_name_he || activity?.name_he)}
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
        <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <span>🏫</span>
            <span>{t('gan_activity')}</span>
          </div>
          <div className="flex items-center gap-1">
            <span>🎯</span>
            <span>{t('after_gan_activity')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-purple-600">○</span>
            <span>{t('recurring')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: 'var(--color-no-gan)' }}
            />
            <span>{t('no_gan_holiday')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: 'var(--color-saturday)' }}
            />
            <span>{t('saturday_last_friday')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded ring-2 ring-yellow-400" />
            <span>{t('today')}</span>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-center gap-4 mt-6 no-print">
          <Link
            to={`/week${isViewMode ? '?view' : ''}`}
            className="px-4 py-2 rounded-lg border hover:bg-gray-50"
          >
            {t('week_view')}
          </Link>
          <button
            onClick={handlePrint}
            className="px-4 py-2 rounded-lg border hover:bg-gray-50"
          >
            {t('print')}
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
      {!isViewMode && (
        <AIAssistant
          people={people}
          activities={activities}
          currentWeekStart={currentWeekStart}
          schedules={monthData?.daySchedules || []}
        />
      )}
    </div>
  );
}
