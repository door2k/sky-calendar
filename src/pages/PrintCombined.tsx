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
} from 'date-fns';
import { usePeople } from '../hooks/usePeople';
import { useActivities } from '../hooks/useActivities';
import { useWeekSchedule, useMonthSchedule } from '../hooks/useSchedule';
import { PersonAvatar } from '../components/PersonAvatar';
import type { Activity, SaturdayActivity, Person } from '../types';

export function PrintCombined() {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();

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
    if (!person) return <span>—</span>;
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

  // Collect activities for this week
  const weekActivities = useMemo(() => {
    const activityMap = new Map<string, { activity: Activity; days: string[]; time?: string }>();

    weekData?.days.forEach((day, idx) => {
      if (day?.after_gan_activity_id) {
        const activity = getActivity(day.after_gan_activity_id);
        if (activity) {
          const existing = activityMap.get(activity.id);
          if (existing) {
            existing.days.push(format(weekDates[idx], 'EEE'));
            if (day.after_gan_time) existing.time = day.after_gan_time;
          } else {
            activityMap.set(activity.id, {
              activity,
              days: [format(weekDates[idx], 'EEE')],
              time: day.after_gan_time || activity.default_time,
            });
          }
        }
      }
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
    <div className="p-4 max-w-4xl mx-auto bg-white print:p-2">
      {/* Back button (hidden in print) */}
      <button
        onClick={() => navigate(-1)}
        className="mb-4 px-4 py-2 border rounded no-print"
      >
        ← Back
      </button>

      {/* Header */}
      <div className="text-center mb-4">
        <h1 className="text-xl font-bold">SKY'S SCHEDULE</h1>
        <p className="text-sm text-gray-600">
          Week of {format(weekStart, 'MMMM d')} - {format(weekEndDate, 'd, yyyy')}
        </p>
      </div>

      {/* Weekly Schedule Table */}
      <table className="w-full border-collapse border text-xs mb-4">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-1 text-left w-16"></th>
            {weekDates.slice(0, 6).map((date) => (
              <th key={format(date, 'yyyy-MM-dd')} className="border p-1 text-center">
                <div className="font-bold">{format(date, 'EEE').toUpperCase()}</div>
                <div>{format(date, 'd')}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border p-1 font-medium text-xs">Drop-off</td>
            {weekData?.days.slice(0, 6).map((day, idx) => (
              <td
                key={idx}
                className={`border p-1 text-xs ${day?.is_no_gan ? 'line-through text-gray-400' : ''}`}
              >
                <div className="flex justify-center">
                  {renderPerson(day?.dropoff_person_id)}
                </div>
              </td>
            ))}
          </tr>
          <tr>
            <td className="border p-1 font-medium text-xs">Gan</td>
            {weekData?.days.slice(0, 6).map((day, idx) => (
              <td
                key={idx}
                className={`border p-1 text-center text-xs ${day?.is_no_gan ? '' : ''}`}
              >
                {day?.is_no_gan ? (
                  <span className="text-orange-600 font-bold">NO GAN</span>
                ) : (
                  day?.gan_activity || '—'
                )}
              </td>
            ))}
          </tr>
          <tr>
            <td className="border p-1 font-medium text-xs">Pickup</td>
            {weekData?.days.slice(0, 6).map((day, idx) => (
              <td
                key={idx}
                className={`border p-1 text-xs ${day?.is_no_gan ? 'line-through text-gray-400' : ''}`}
              >
                <div className="flex justify-center">
                  {renderPerson(day?.pickup_person_id)}
                </div>
              </td>
            ))}
          </tr>
          <tr>
            <td className="border p-1 font-medium text-xs">Activity</td>
            {weekData?.days.slice(0, 6).map((day, idx) => {
              const activity = getActivity(day?.after_gan_activity_id);
              return (
                <td key={idx} className="border p-1 text-center text-xs">
                  {activity ? activity.name : '—'}
                </td>
              );
            })}
          </tr>
          <tr>
            <td className="border p-1 font-medium text-xs">Bedtime</td>
            {weekData?.days.slice(0, 6).map((day, idx) => (
              <td key={idx} className="border p-1 text-xs">
                <div className="flex justify-center">
                  {renderPerson(day?.bedtime_person_id)}
                </div>
              </td>
            ))}
          </tr>
          <tr className="bg-amber-50">
            <td className="border p-1 font-medium text-xs">Dinner</td>
            {weekData?.days.slice(0, 6).map((day, idx) => (
              <td key={idx} className="border p-1 text-xs text-center">
                {idx === 5 && day?.family_dinner_person_id ? (
                  <div className="flex flex-col items-center">
                    {renderPerson(day.family_dinner_person_id)}
                    {day.family_dinner_time && (
                      <div style={{ fontSize: '8px' }} className="text-gray-500">{day.family_dinner_time}</div>
                    )}
                  </div>
                ) : idx === 5 ? (
                  <span className="text-gray-400">—</span>
                ) : (
                  ''
                )}
              </td>
            ))}
          </tr>
        </tbody>
      </table>

      {/* Saturday */}
      <div className="mb-4 p-2 bg-gray-50 rounded text-sm">
        <span className="font-bold">SAT {format(weekDates[6], 'd')}: </span>
        {weekData?.saturday?.activities && weekData.saturday.activities.length > 0 ? (
          weekData.saturday.activities.map((act: SaturdayActivity, idx: number) => {
            const activity = getActivity(act.activity_id);
            return (
              <span key={idx}>
                {idx > 0 && ', '}
                {act.custom_name || activity?.name}
                {act.time && ` (${act.time})`}
              </span>
            );
          })
        ) : (
          <span className="text-gray-500">No activities</span>
        )}
      </div>

      {/* Monthly Calendar (compact) */}
      <div className="text-center mb-2">
        <h2 className="text-lg font-bold">{format(currentMonth, 'MMMM yyyy')}</h2>
      </div>

      <table className="w-full border-collapse border text-xs">
        <thead>
          <tr className="bg-gray-100">
            {WEEKDAYS.map((day) => (
              <th key={day} className="border p-1 text-center text-xs">
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
                      border p-1 align-top h-12
                      ${!isCurrentMonth ? 'bg-gray-100 text-gray-400' : ''}
                      ${isSat ? 'bg-gray-50' : ''}
                      ${isNoGan ? 'bg-orange-200 border-orange-400 border-2' : ''}
                    `}
                  >
                    <div className="font-medium text-xs">{format(date, 'd')}</div>
                    {isNoGan && <div className="text-orange-700 font-bold text-xs">NO GAN</div>}
                    {schedule?.after_gan_activity_id && (
                      <div className="truncate" style={{ fontSize: '7px' }}>
                        {getActivity(schedule.after_gan_activity_id)?.name}
                      </div>
                    )}
                    {isSat && satSchedule?.activities?.slice(0, 1).map((act: SaturdayActivity, idx: number) => (
                      <div key={idx} className="truncate" style={{ fontSize: '7px' }}>
                        {act.custom_name || getActivity(act.activity_id)?.name}
                      </div>
                    ))}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Activity Details */}
      {weekActivities.length > 0 && (
        <div className="mt-4 pt-2 border-t text-xs">
          <span className="font-bold">Activities: </span>
          {weekActivities.map(({ activity, days, time }, idx) => (
            <span key={activity.id}>
              {idx > 0 && ' | '}
              <strong>{activity.name}</strong> ({days.join(', ')}{time && ` ${time}`})
              {activity.address && ` - ${activity.address}`}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
