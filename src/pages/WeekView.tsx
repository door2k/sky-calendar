import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { startOfWeek, addWeeks, subWeeks, addDays, format, parseISO } from 'date-fns';
import { DayCard } from '../components/DayCard';
import { ThemePicker } from '../components/ThemePicker';
import { ActivityPopup } from '../components/ActivityPopup';
import { EditDayModal } from '../components/EditDayModal';
import { AddActivityModal } from '../components/AddActivityModal';
import { useTheme } from '../hooks/useTheme';
import { usePeople } from '../hooks/usePeople';
import { useActivities, useCreateActivity } from '../hooks/useActivities';
import { useWeekSchedule, useUpdateDaySchedule, useUpdateSaturdaySchedule } from '../hooks/useSchedule';
import type { Activity, DaySchedule, SaturdaySchedule } from '../types';

export function WeekView() {
  const { date } = useParams<{ date?: string }>();
  const navigate = useNavigate();

  const weekStart = useMemo(() => {
    if (date) {
      return startOfWeek(parseISO(date), { weekStartsOn: 0 });
    }
    return startOfWeek(new Date(), { weekStartsOn: 0 });
  }, [date]);

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

  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const handlePrevWeek = () => {
    const prev = subWeeks(weekStart, 1);
    navigate(`/week/${format(prev, 'yyyy-MM-dd')}`);
  };

  const handleNextWeek = () => {
    const next = addWeeks(weekStart, 1);
    navigate(`/week/${format(next, 'yyyy-MM-dd')}`);
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
            <Link
              to={`/month/${format(weekStart, 'yyyy-MM')}`}
              className="px-4 py-2 rounded-lg border hover:bg-gray-50"
            >
              Month View
            </Link>
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-lg border hover:bg-gray-50"
            >
              Print
            </button>
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
        />
      )}
    </div>
  );
}
