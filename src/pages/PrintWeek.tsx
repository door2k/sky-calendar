import { useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { startOfWeek, addDays, format, parseISO } from 'date-fns';
import { usePeople } from '../hooks/usePeople';
import { useActivities } from '../hooks/useActivities';
import { useWeekSchedule } from '../hooks/useSchedule';
import type { Activity } from '../types';

export function PrintWeek() {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();

  const weekStart = useMemo(() => {
    if (date) {
      return startOfWeek(parseISO(date), { weekStartsOn: 0 });
    }
    return startOfWeek(new Date(), { weekStartsOn: 0 });
  }, [date]);

  const { data: people = [] } = usePeople();
  const { data: activities = [] } = useActivities();
  const { data: weekData } = useWeekSchedule(weekStart);

  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const getPersonName = (id?: string) => {
    if (!id) return '—';
    return people.find((p) => p.id === id)?.name || '—';
  };

  const getActivity = (id?: string) => {
    if (!id) return null;
    return activities.find((a) => a.id === id);
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

      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold">SKY'S WEEK</h1>
        <p className="text-gray-600">
          {format(weekStart, 'MMMM d')} - {format(weekEndDate, 'd, yyyy')}
        </p>
      </div>

      {/* Schedule Table */}
      <table className="w-full border-collapse border text-sm mb-6">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2 text-left w-24"></th>
            {weekDates.slice(0, 6).map((date) => (
              <th key={format(date, 'yyyy-MM-dd')} className="border p-2 text-center">
                <div>{format(date, 'EEE').toUpperCase()}</div>
                <div>{format(date, 'd')}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border p-2 font-medium">Drop-off</td>
            {weekData?.days.slice(0, 6).map((day, idx) => (
              <td
                key={idx}
                className={`border p-2 text-center ${day?.is_no_gan ? 'line-through text-gray-400' : ''}`}
              >
                {getPersonName(day?.dropoff_person_id)}
              </td>
            ))}
          </tr>
          <tr>
            <td className="border p-2 font-medium">Gan</td>
            {weekData?.days.slice(0, 6).map((day, idx) => (
              <td
                key={idx}
                className={`border p-2 text-center ${day?.is_no_gan ? 'line-through text-gray-400' : ''}`}
              >
                {day?.is_no_gan ? (
                  <span className="not-italic text-orange-600 font-bold no-line-through">
                    NO GAN
                    {day.no_gan_reason && <div className="text-xs font-normal">{day.no_gan_reason}</div>}
                  </span>
                ) : (
                  day?.gan_activity || '—'
                )}
              </td>
            ))}
          </tr>
          <tr>
            <td className="border p-2 font-medium">Pickup</td>
            {weekData?.days.slice(0, 6).map((day, idx) => (
              <td
                key={idx}
                className={`border p-2 text-center ${day?.is_no_gan ? 'line-through text-gray-400' : ''}`}
              >
                {getPersonName(day?.pickup_person_id)}
              </td>
            ))}
          </tr>
          <tr>
            <td className="border p-2 font-medium">Activity</td>
            {weekData?.days.slice(0, 6).map((day, idx) => {
              const activity = getActivity(day?.after_gan_activity_id);
              return (
                <td key={idx} className="border p-2 text-center">
                  {activity ? (
                    <>
                      {activity.name}
                      {day?.after_gan_time && (
                        <div className="text-xs text-gray-500">{day.after_gan_time}</div>
                      )}
                    </>
                  ) : (
                    '—'
                  )}
                </td>
              );
            })}
          </tr>
          <tr>
            <td className="border p-2 font-medium">Bedtime</td>
            {weekData?.days.slice(0, 6).map((day, idx) => (
              <td key={idx} className="border p-2 text-center">
                {getPersonName(day?.bedtime_person_id)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>

      {/* Saturday */}
      <div className="mb-6 p-4 bg-gray-50 rounded">
        <div className="font-bold">SATURDAY {format(weekDates[6], 'd')}</div>
        {weekData?.saturday?.activities && weekData.saturday.activities.length > 0 ? (
          <div className="mt-2">
            {weekData.saturday.activities.map((act, idx) => {
              const activity = getActivity(act.activity_id);
              return (
                <div key={idx}>
                  {act.custom_name || activity?.name}
                  {act.time && ` — ${act.time}`}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-gray-500">No activities planned</div>
        )}
        {weekData?.saturday?.notes && (
          <div className="mt-2 text-sm text-gray-600">{weekData.saturday.notes}</div>
        )}
      </div>

      {/* Activity Details */}
      {weekActivities.length > 0 && (
        <div className="border-t pt-4">
          <div className="font-bold mb-2">Activities this week:</div>
          {weekActivities.map(({ activity, days, time }) => (
            <div key={activity.id} className="text-sm mb-1">
              • <strong>{activity.name}</strong> ({days.join(', ')} {time && `at ${time}`})
              {activity.address && ` — ${activity.address}`}
              {activity.contact_phone && ` 📞 ${activity.contact_phone}`}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
