import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { startOfWeek, addWeeks, addDays, format, parseISO, isSameDay } from 'date-fns';
import { DayCard } from '../components/DayCard';
import { ThemePicker } from '../components/ThemePicker';
import { ActivityPopup } from '../components/ActivityPopup';
import { EditDayModal } from '../components/EditDayModal';
import { AddActivityModal } from '../components/AddActivityModal';
import { AIAssistant } from '../components/AIAssistant';
import { GCalSyncStatus } from '../components/GCalSyncStatus';
import { useTheme } from '../hooks/useTheme';
import { usePeople } from '../hooks/usePeople';
import { useActivities, useCreateActivity } from '../hooks/useActivities';
import { useWeekSchedule, useUpdateDaySchedule, useUpdateSaturdaySchedule } from '../hooks/useSchedule';
import { useI18n, useFormatDate, LanguageToggle } from '../lib/i18n';
import type { Activity, DaySchedule, SaturdaySchedule } from '../types';

export function WeekView() {
  const { date } = useParams<{ date?: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isViewMode = searchParams.has('view');
  const [weekOffset, setWeekOffset] = useState(0);
  const { t } = useI18n();
  const formatDate = useFormatDate();

  // If date param exists (from bookmark/direct link), calculate initial offset
  const initialWeekStart = useMemo(() => {
    return startOfWeek(new Date(), { weekStartsOn: 0 });
  }, []);

  // When date param changes, sync the offset (for backward compatibility)
  const syncedOffset = useMemo(() => {
    if (date) {
      const targetWeek = startOfWeek(parseISO(date), { weekStartsOn: 0 });
      const diffTime = targetWeek.getTime() - initialWeekStart.getTime();
      const diffWeeks = Math.round(diffTime / (7 * 24 * 60 * 60 * 1000));
      return diffWeeks;
    }
    return weekOffset;
  }, [date, initialWeekStart, weekOffset]);

  // Use synced offset if date param exists, otherwise use state offset
  const effectiveOffset = date ? syncedOffset : weekOffset;

  const weekStart = useMemo(() => {
    return addWeeks(initialWeekStart, effectiveOffset);
  }, [initialWeekStart, effectiveOffset]);

  const { currentTheme, selectTheme } = useTheme();
  const { data: people = [] } = usePeople();
  const { data: activities = [] } = useActivities();
  const { data: weekData } = useWeekSchedule(weekStart);
  const updateDay = useUpdateDaySchedule();
  const updateSaturday = useUpdateSaturdaySchedule();
  const createActivity = useCreateActivity();

  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [editingDate, setEditingDate] = useState<Date | null>(null);
  const [showAddActivity, setShowAddActivity] = useState(false);
  const todayRef = useRef<HTMLDivElement>(null);

  const today = useMemo(() => new Date(), []);
  const currentWeekStart = useMemo(() => startOfWeek(today, { weekStartsOn: 0 }), [today]);
  const isCurrentWeek = isSameDay(weekStart, currentWeekStart);

  // Scroll to today on mount
  useEffect(() => {
    if (todayRef.current && isCurrentWeek) {
      todayRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [weekData, isCurrentWeek]);

  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const handlePrevWeek = () => {
    if (date) {
      navigate('/week');
      setWeekOffset(effectiveOffset - 1);
    } else {
      setWeekOffset((prev) => prev - 1);
    }
  };

  const handleNextWeek = () => {
    if (date) {
      navigate('/week');
      setWeekOffset(effectiveOffset + 1);
    } else {
      setWeekOffset((prev) => prev + 1);
    }
  };

  const handleGoToThisWeek = () => {
    if (date) {
      navigate('/week');
    }
    setWeekOffset(0);
  };

  const queryClient = useQueryClient();

  const handleSaveDay = async (data: Partial<DaySchedule> | Partial<SaturdaySchedule>) => {
    if ('activities' in data) {
      await updateSaturday.mutateAsync(data as Partial<SaturdaySchedule> & { date: string });
    } else {
      await updateDay.mutateAsync(data as Partial<DaySchedule> & { date: string });
    }
    // Wait for cache to refetch so reopening the modal shows fresh data
    await queryClient.invalidateQueries({ queryKey: ['schedule'] });
  };

  const handlePrint = () => {
    navigate(`/print/week/${format(weekStart, 'yyyy-MM-dd')}`);
  };

  const handlePrintCombined = () => {
    navigate(`/print/combined/${format(weekStart, 'yyyy-MM-dd')}`);
  };

  const [calendarCopied, setCalendarCopied] = useState(false);
  const handleSubscribeCalendar = useCallback(() => {
    const webcalUrl = `webcal://${window.location.host}/api/calendar`;
    const googleUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl)}`;
    window.open(googleUrl, '_blank');
  }, []);
  const handleCopyCalendarLink = useCallback(() => {
    const calUrl = `${window.location.origin}/api/calendar`;
    navigator.clipboard.writeText(calUrl).then(() => {
      setCalendarCopied(true);
      setTimeout(() => setCalendarCopied(false), 2000);
    });
  }, []);

  const weekEndDate = addDays(weekStart, 6);

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{t('skys_week')}</h1>
            <p className="text-gray-600">
              {formatDate(weekStart, 'MMM d')} - {formatDate(weekEndDate, 'MMM d, yyyy')}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <LanguageToggle />
            <div className="px-3 py-1.5 rounded-full text-sm font-medium" style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
              {t('today')}: {formatDate(new Date(), 'EEEE, MMM d')}
            </div>
            {!isViewMode && <ThemePicker currentTheme={currentTheme} onSelectTheme={selectTheme} />}
          </div>
          <GCalSyncStatus />
        </div>

        {/* Day Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-4">
          {weekDates.slice(0, 6).map((dayDate, index) => {
            const isToday = isSameDay(dayDate, today);
            return (
              <div key={format(dayDate, 'yyyy-MM-dd')} ref={isToday ? todayRef : undefined}>
                <DayCard
                  date={dayDate}
                  schedule={weekData?.days[index] || null}
                  people={people}
                  activities={activities}
                  onEdit={() => setEditingDate(dayDate)}
                  onActivityClick={setSelectedActivity}
                  isToday={isToday}
                  isLastFriday={index === 5 && weekData?.fridayIsLastOfMonth}
                  lastFridaySchedule={index === 5 ? weekData?.lastFriday : undefined}
                  readOnly={isViewMode}
                />
              </div>
            );
          })}
        </div>

        {/* Saturday Card */}
        <div ref={isSameDay(weekDates[6], today) ? todayRef : undefined}>
          <DayCard
            date={weekDates[6]}
            schedule={null}
            saturdaySchedule={weekData?.saturday || null}
            people={people}
            activities={activities}
            onEdit={() => setEditingDate(weekDates[6])}
            onActivityClick={setSelectedActivity}
            isToday={isSameDay(weekDates[6], today)}
            readOnly={isViewMode}
          />
        </div>

        {/* Navigation */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6 mb-20 no-print">
          <button
            onClick={handlePrevWeek}
            className="w-full sm:w-auto px-4 py-2 rounded-lg border hover:bg-gray-50"
          >
            {t('previous_week')}
          </button>
          <div className="flex flex-wrap justify-center gap-2">
            {!isCurrentWeek && (
              <button
                onClick={handleGoToThisWeek}
                className="px-4 py-2 rounded-lg border hover:bg-gray-50 font-medium"
                style={{ backgroundColor: 'var(--color-primary)', color: 'white', border: 'none' }}
              >
                {t('this_week')}
              </button>
            )}
            <Link
              to={`/month/${format(weekStart, 'yyyy-MM')}${isViewMode ? '?view' : ''}`}
              className="px-4 py-2 rounded-lg border hover:bg-gray-50"
            >
              {t('month_view')}
            </Link>
            <div className="relative group">
              <button className="px-4 py-2 rounded-lg border hover:bg-gray-50">
                {t('print_dropdown')}
              </button>
              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 sm:bottom-auto sm:top-full sm:mt-1 sm:right-0 sm:left-auto sm:translate-x-0 bg-white border rounded-lg shadow-lg hidden group-hover:block z-10 min-w-32">
                <button
                  onClick={handlePrint}
                  className="block w-full px-4 py-2 text-left hover:bg-gray-50 text-sm"
                >
                  {t('week_only')}
                </button>
                <button
                  onClick={handlePrintCombined}
                  className="block w-full px-4 py-2 text-left hover:bg-gray-50 text-sm"
                >
                  {t('week_plus_month')}
                </button>
              </div>
            </div>
            <div className="relative group">
              <button
                onClick={handleSubscribeCalendar}
                className="px-4 py-2 rounded-lg border hover:bg-gray-50"
              >
                {t('google_calendar')} 📅
              </button>
              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 sm:bottom-auto sm:top-full sm:mt-1 sm:right-0 sm:left-auto sm:translate-x-0 bg-white border rounded-lg shadow-lg hidden group-hover:block z-10 min-w-40">
                <button
                  onClick={(e) => { e.stopPropagation(); handleSubscribeCalendar(); }}
                  className="block w-full px-4 py-2 text-left hover:bg-gray-50 text-sm"
                >
                  {t('subscribe_calendar')}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleCopyCalendarLink(); }}
                  className="block w-full px-4 py-2 text-left hover:bg-gray-50 text-sm"
                >
                  {calendarCopied ? t('calendar_link_copied') : 'Copy link'}
                </button>
              </div>
            </div>
          </div>
          <button
            onClick={handleNextWeek}
            className="w-full sm:w-auto px-4 py-2 rounded-lg border hover:bg-gray-50"
          >
            {t('next_week')}
          </button>
        </div>
      </div>

      {/* Modals */}
      {selectedActivity && (
        <ActivityPopup
          activity={selectedActivity}
          onClose={() => setSelectedActivity(null)}
        />
      )}

      {!isViewMode && editingDate && (
        <EditDayModal
          date={editingDate}
          schedule={
            weekData?.days[weekDates.findIndex(
              (d) => format(d, 'yyyy-MM-dd') === format(editingDate, 'yyyy-MM-dd')
            )] || null
          }
          saturdaySchedule={weekData?.saturday || null}
          lastFridaySchedule={weekData?.lastFriday || null}
          people={people}
          activities={activities}
          onSave={handleSaveDay}
          onClose={() => setEditingDate(null)}
          onCreateActivity={async (name: string) => {
            const result = await createActivity.mutateAsync({ name, is_recurring: false });
            return result;
          }}
        />
      )}

      {!isViewMode && showAddActivity && (
        <AddActivityModal
          onSave={async (activity) => { await createActivity.mutateAsync(activity); }}
          onClose={() => setShowAddActivity(false)}
          people={people}
        />
      )}

      {/* AI Assistant */}
      {!isViewMode && (
        <AIAssistant
          people={people}
          activities={activities}
          currentWeekStart={weekStart}
          schedules={weekData?.days.filter((d): d is DaySchedule => d !== null)}
        />
      )}
    </div>
  );
}
