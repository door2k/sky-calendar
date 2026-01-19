import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { startOfWeek, addWeeks, addDays, format, parseISO, isSameDay } from 'date-fns';
import { DayCard } from '../components/DayCard';
import { ThemePicker } from '../components/ThemePicker';
import { ActivityPopup } from '../components/ActivityPopup';
import { EditDayModal } from '../components/EditDayModal';
import { AddActivityModal } from '../components/AddActivityModal';
import { AIAssistant } from '../components/AIAssistant';
import { useTheme } from '../hooks/useTheme';
import { usePeople } from '../hooks/usePeople';
import { useActivities, useCreateActivity } from '../hooks/useActivities';
import { useWeekSchedule, useUpdateDaySchedule, useUpdateSaturdaySchedule } from '../hooks/useSchedule';
import type { Activity, DaySchedule, SaturdaySchedule } from '../types';

export function WeekView() {
  const { date } = useParams<{ date?: string }>();
  const navigate = useNavigate();
  const [weekOffset, setWeekOffset] = useState(0);

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

  const today = useMemo(() => new Date(), []);
  const currentWeekStart = useMemo(() => startOfWeek(today, { weekStartsOn: 0 }), [today]);
  const isCurrentWeek = isSameDay(weekStart, currentWeekStart);

  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const handlePrevWeek = () => {
    if (date) {
      // If we have a date param (from bookmark), navigate away to use state-based nav
      navigate('/week');
      setWeekOffset(effectiveOffset - 1);
    } else {
      setWeekOffset((prev) => prev - 1);
    }
  };

  const handleNextWeek = () => {
    if (date) {
      // If we have a date param (from bookmark), navigate away to use state-based nav
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

  const handleSaveDay = (data: Partial<DaySchedule> | Partial<SaturdaySchedule>) => {
    if ('activities' in data) {
      updateSaturday.mutate(data as Partial<SaturdaySchedule> & { date: string });
    } else {
      updateDay.mutate(data as Partial<DaySchedule> & { date: string });
    }
  };

  const handlePrint = () => {
    navigate(`/print/week/${format(weekStart, 'yyyy-MM-dd')}`);
  };

  const handlePrintCombined = () => {
    navigate(`/print/combined/${format(weekStart, 'yyyy-MM-dd')}`);
  };

  const weekEndDate = addDays(weekStart, 6);

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Sky's Week</h1>
            <p className="text-gray-600">
              {format(weekStart, 'MMM d')} - {format(weekEndDate, 'MMM d, yyyy')}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="px-3 py-1.5 rounded-full text-sm font-medium" style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
              Today: {format(new Date(), 'EEEE, MMM d')}
            </div>
            <ThemePicker currentTheme={currentTheme} onSelectTheme={selectTheme} />
          </div>
        </div>

        {/* Day Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-4">
          {weekDates.slice(0, 6).map((dayDate, index) => (
            <DayCard
              key={format(dayDate, 'yyyy-MM-dd')}
              date={dayDate}
              schedule={weekData?.days[index] || null}
              people={people}
              activities={activities}
              onEdit={() => setEditingDate(dayDate)}
              onActivityClick={setSelectedActivity}
              isToday={isSameDay(dayDate, today)}
            />
          ))}
        </div>

        {/* Saturday Card */}
        <DayCard
          date={weekDates[6]}
          schedule={null}
          saturdaySchedule={weekData?.saturday || null}
          people={people}
          activities={activities}
          onEdit={() => setEditingDate(weekDates[6])}
          onActivityClick={setSelectedActivity}
          isToday={isSameDay(weekDates[6], today)}
        />

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6 no-print">
          <button
            onClick={handlePrevWeek}
            className="px-4 py-2 rounded-lg border hover:bg-gray-50"
          >
            Previous Week
          </button>
          <div className="flex gap-2">
            {!isCurrentWeek && (
              <button
                onClick={handleGoToThisWeek}
                className="px-4 py-2 rounded-lg border hover:bg-gray-50 font-medium"
                style={{ backgroundColor: 'var(--color-primary)', color: 'white', border: 'none' }}
              >
                This Week
              </button>
            )}
            <Link
              to={`/month/${format(weekStart, 'yyyy-MM')}`}
              className="px-4 py-2 rounded-lg border hover:bg-gray-50"
            >
              Month View
            </Link>
            <div className="relative group">
              <button className="px-4 py-2 rounded-lg border hover:bg-gray-50">
                Print ▾
              </button>
              <div className="absolute right-0 mt-1 bg-white border rounded-lg shadow-lg hidden group-hover:block z-10 min-w-32">
                <button
                  onClick={handlePrint}
                  className="block w-full px-4 py-2 text-left hover:bg-gray-50 text-sm"
                >
                  Week Only
                </button>
                <button
                  onClick={handlePrintCombined}
                  className="block w-full px-4 py-2 text-left hover:bg-gray-50 text-sm"
                >
                  Week + Month
                </button>
              </div>
            </div>
          </div>
          <button
            onClick={handleNextWeek}
            className="px-4 py-2 rounded-lg border hover:bg-gray-50"
          >
            Next Week
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

      {editingDate && (
        <EditDayModal
          date={editingDate}
          schedule={
            weekData?.days[weekDates.findIndex(
              (d) => format(d, 'yyyy-MM-dd') === format(editingDate, 'yyyy-MM-dd')
            )] || null
          }
          saturdaySchedule={weekData?.saturday || null}
          people={people}
          activities={activities}
          onSave={handleSaveDay}
          onClose={() => setEditingDate(null)}
          onAddActivity={() => setShowAddActivity(true)}
        />
      )}

      {showAddActivity && (
        <AddActivityModal
          onSave={(activity) => createActivity.mutate(activity)}
          onClose={() => setShowAddActivity(false)}
          people={people}
        />
      )}

      {/* AI Assistant */}
      <AIAssistant
        people={people}
        activities={activities}
        currentWeekStart={weekStart}
        schedules={weekData?.days.filter((d): d is DaySchedule => d !== null)}
      />
    </div>
  );
}
