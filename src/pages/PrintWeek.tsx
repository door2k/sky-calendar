import { useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { startOfWeek, addDays, format, parseISO } from 'date-fns';
import { usePeople } from '../hooks/usePeople';
import { useActivities } from '../hooks/useActivities';
import { useWeekSchedule } from '../hooks/useSchedule';
import { useTheme } from '../hooks/useTheme';
import { PersonAvatar } from '../components/PersonAvatar';
import type { Activity, SaturdayActivity, Person } from '../types';

export function PrintWeek() {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();
  const { currentTheme } = useTheme();

  const weekStart = useMemo(() => {
    if (date) {
      return startOfWeek(parseISO(date), { weekStartsOn: 0 });
    }
    return startOfWeek(new Date(), { weekStartsOn: 0 });
  }, [date]);

  const { data: people = [] } = usePeople();
  const { data: activities = [] } = useActivities();
  const { data: weekData } = useWeekSchedule(weekStart);

  // Get theme emoji
  const themeEmoji = currentTheme?.emoji || '';

  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const getPerson = (id?: string): Person | null => {
    if (!id) return null;
    return people.find((p) => p.id === id) || null;
  };

  const getActivity = (id?: string) => {
    if (!id) return null;
    return activities.find((a) => a.id === id);
  };

  const renderPerson = (id?: string) => {
    const person = getPerson(id);
    if (!person) return <span>—</span>;
    return <PersonAvatar person={person} size="sm" />;
  };

  // Auto-print on load
  useEffect(() => {
    const timer = setTimeout(() => {
      window.print();
    }, 500);
    return () => clearTimeout(timer);
  }, [weekData]);

  const weekEndDate = addDays(weekStart, 6);

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
          {themeEmoji} SKY'S WEEK {themeEmoji}
        </h1>
        <p className="text-lg opacity-90">
          {format(weekStart, 'MMMM d')} - {format(weekEndDate, 'd, yyyy')}
        </p>
      </div>

      {/* Schedule Table */}
      <table className="w-full border-collapse border text-sm mb-6">
        <thead>
          <tr style={{ backgroundColor: 'var(--color-secondary)' }}>
            <th className="border p-2 text-left w-24"></th>
            {weekDates.slice(0, 6).map((date) => (
              <th key={format(date, 'yyyy-MM-dd')} className="border p-2 text-center">
                <div className="font-bold">{format(date, 'EEE').toUpperCase()}</div>
                <div className="text-xl">{format(date, 'd')}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr style={{ backgroundColor: 'var(--color-gan)' }}>
            <td className="border p-2 font-medium">🌅 Drop-off</td>
            {weekData?.days.slice(0, 6).map((day, idx) => (
              <td
                key={idx}
                className={`border p-2 ${day?.is_no_gan ? 'line-through text-gray-400' : ''}`}
              >
                <div className="flex justify-center">
                  {renderPerson(day?.dropoff_person_id)}
                </div>
              </td>
            ))}
          </tr>
          <tr>
            <td className="border p-2 font-medium">🏫 Gan</td>
            {weekData?.days.slice(0, 6).map((day, idx) => (
              <td
                key={idx}
                className="border p-2 text-center"
                style={{ backgroundColor: day?.is_no_gan ? 'var(--color-no-gan)' : undefined }}
              >
                {day?.is_no_gan ? (
                  <span className="text-orange-600 font-bold">
                    NO GAN
                    {day.no_gan_reason && <div className="text-xs font-normal">{day.no_gan_reason}</div>}
                  </span>
                ) : (
                  day?.gan_activity || '—'
                )}
              </td>
            ))}
          </tr>
          <tr style={{ backgroundColor: 'var(--color-gan)' }}>
            <td className="border p-2 font-medium">🌆 Pickup</td>
            {weekData?.days.slice(0, 6).map((day, idx) => (
              <td
                key={idx}
                className={`border p-2 ${day?.is_no_gan ? 'line-through text-gray-400' : ''}`}
              >
                <div className="flex justify-center">
                  {renderPerson(day?.pickup_person_id)}
                </div>
              </td>
            ))}
          </tr>
          <tr>
            <td className="border p-2 font-medium">🎯 Activity</td>
            {weekData?.days.slice(0, 6).map((day, idx) => {
              const activity = getActivity(day?.after_gan_activity_id);
              return (
                <td key={idx} className="border p-2 text-center">
                  {activity ? (
                    <div>
                      <span className="font-medium">{activity.name}</span>
                      {day?.after_gan_time && (
                        <div className="text-xs text-gray-500">{day.after_gan_time}</div>
                      )}
                    </div>
                  ) : (
                    '—'
                  )}
                </td>
              );
            })}
          </tr>
          <tr>
            <td className="border p-2 font-medium">🌙 Bedtime</td>
            {weekData?.days.slice(0, 6).map((day, idx) => (
              <td key={idx} className="border p-2">
                <div className="flex justify-center">
                  {renderPerson(day?.bedtime_person_id)}
                </div>
              </td>
            ))}
          </tr>
        </tbody>
      </table>

      {/* Saturday */}
      <div
        className="mb-6 p-4 rounded-lg"
        style={{ backgroundColor: 'var(--color-saturday)' }}
      >
        <div className="font-bold text-lg">
          🌟 SATURDAY {format(weekDates[6], 'd')} 🌟
        </div>
        {weekData?.saturday?.activities && weekData.saturday.activities.length > 0 ? (
          <div className="mt-2 space-y-1">
            {weekData.saturday.activities.map((act: SaturdayActivity, idx: number) => {
              const activity = getActivity(act.activity_id);
              return (
                <div key={idx} className="flex items-center gap-2">
                  <span>🎯</span>
                  <span className="font-medium">{act.custom_name || activity?.name}</span>
                  {act.time && <span className="text-gray-600">— {act.time}</span>}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-gray-500 italic">No activities planned</div>
        )}
        {weekData?.saturday?.notes && (
          <div className="mt-2 text-sm text-gray-600">{weekData.saturday.notes}</div>
        )}
      </div>

      {/* Activity Details */}
      {weekActivities.length > 0 && (
        <div className="border-t pt-4">
          <div className="font-bold mb-3 text-lg">📍 Activities this week:</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {weekActivities.map(({ activity, days, time }) => (
              <div
                key={activity.id}
                className="p-2 rounded border-l-4"
                style={{ borderColor: 'var(--color-primary)', backgroundColor: 'var(--color-background)' }}
              >
                <div className="font-bold">{activity.name}</div>
                <div className="text-sm text-gray-600">
                  {days.join(', ')} {time && `at ${time}`}
                </div>
                {activity.address && (
                  <div className="text-sm">📍 {activity.address}</div>
                )}
                {activity.contact_phone && (
                  <div className="text-sm">📞 {activity.contact_phone}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
