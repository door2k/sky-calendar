import { useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { startOfWeek, addDays, format, parseISO, getDay } from 'date-fns';
import { usePeople } from '../hooks/usePeople';
import { useActivities } from '../hooks/useActivities';
import { useWeekSchedule } from '../hooks/useSchedule';
import { useTheme } from '../hooks/useTheme';
import { PersonAvatar } from '../components/PersonAvatar';
import type { Activity, SaturdayActivity, Person } from '../types';

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

// Fun day decorations
const DAY_VIBES = [
  { emoji: '🌈', color: '#FF6B6B' },  // Sunday - rainbow start
  { emoji: '🚀', color: '#4ECDC4' },  // Monday - blast off
  { emoji: '🌟', color: '#FFE66D' },  // Tuesday - star day
  { emoji: '🦋', color: '#95E1D3' },  // Wednesday - butterfly
  { emoji: '🎨', color: '#DDA0DD' },  // Thursday - creative
  { emoji: '🎉', color: '#F38181' },  // Friday - celebration
  { emoji: '🌸', color: '#AA96DA' },  // Saturday - relax
];

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

  const themeEmoji = currentTheme?.emoji || '✨';

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

  // Get recurring activities for a specific day of the week
  const getRecurringActivitiesForDay = (date: Date): Activity[] => {
    const dayOfWeek = getDay(date);
    const dayName = DAY_NAMES[dayOfWeek];
    return activities.filter(
      (a) => a.is_recurring && a.recurrence_day?.toLowerCase() === dayName
    );
  };

  // For print: avatar and name side by side, name truncates if needed
  const renderPersonPrint = (id?: string, size: 'sm' | 'md' = 'sm') => {
    const person = getPerson(id);
    if (!person) return <span className="text-gray-400 text-xs">—</span>;
    return (
      <div className="flex items-center gap-1.5 min-w-0">
        <div className="flex-shrink-0">
          <PersonAvatar person={person} size={size} showName={false} printSize />
        </div>
        <span className="text-xs leading-tight truncate">{person.name}</span>
      </div>
    );
  };

  // Auto-print on load - wait for images to load first
  useEffect(() => {
    if (!weekData) return;

    const waitForImages = () => {
      const images = document.querySelectorAll('img');
      const imagePromises = Array.from(images).map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve; // Don't block on failed images
        });
      });

      return Promise.all(imagePromises);
    };

    // Wait for data, then images, then print
    const timer = setTimeout(() => {
      waitForImages().then(() => {
        window.print();
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [weekData]);

  const weekEndDate = addDays(weekStart, 6);

  // Collect activities for this week (including recurring)
  const weekActivities = useMemo(() => {
    const activityMap = new Map<string, { activity: Activity; days: string[]; time?: string }>();

    weekDates.slice(0, 6).forEach((date, idx) => {
      const day = weekData?.days[idx];

      // Explicitly assigned activity
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

  return (
    <div className="p-4 max-w-4xl mx-auto bg-white print:p-2">
      {/* Back button (hidden in print) */}
      <button
        onClick={() => navigate(-1)}
        className="mb-4 px-4 py-2 border rounded no-print hover:bg-gray-50"
      >
        ← Back
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
            SKY'S AWESOME WEEK!
          </h1>
          <p className="text-xl mt-2 opacity-90">
            {format(weekStart, 'MMMM d')} - {format(weekEndDate, 'd, yyyy')}
          </p>
          <div className="text-4xl mt-2">
            {themeEmoji} {themeEmoji} {themeEmoji}
          </div>
        </div>
        {/* Decorative corners */}
        <div className="absolute -top-2 -left-2 text-3xl">⭐</div>
        <div className="absolute -top-2 -right-2 text-3xl">⭐</div>
        <div className="absolute -bottom-2 -left-2 text-3xl">🌟</div>
        <div className="absolute -bottom-2 -right-2 text-3xl">🌟</div>
      </div>

      {/* Day Cards Grid */}
      <div className="grid grid-cols-6 gap-2 mb-4">
        {weekDates.slice(0, 6).map((date, idx) => {
          const day = weekData?.days[idx];
          const isFriday = idx === 5;
          const isLastFriday = isFriday && weekData?.fridayIsLastOfMonth;
          const isNoGan = day?.is_no_gan || isLastFriday;
          const activity = getActivity(day?.after_gan_activity_id);
          const recurringActivities = getRecurringActivitiesForDay(date)
            .filter(a => a.id !== day?.after_gan_activity_id);
          const vibe = DAY_VIBES[idx];

          // For last Friday, family dinner is in saturday_schedules (lastFriday), not day_schedules
          const familyDinnerPersonId = isLastFriday
            ? weekData?.lastFriday?.family_dinner_person_id
            : day?.family_dinner_person_id;
          const familyDinnerTime = isLastFriday
            ? weekData?.lastFriday?.family_dinner_time
            : day?.family_dinner_time;

          return (
            <div
              key={format(date, 'yyyy-MM-dd')}
              className={`rounded-xl overflow-hidden shadow-md ${isNoGan ? 'ring-4 ring-orange-400' : ''}`}
              style={{ backgroundColor: isNoGan ? '#FFF3E0' : '#FAFAFA' }}
            >
              {/* Day Header */}
              <div
                className="text-center py-2 font-bold text-white"
                style={{ backgroundColor: vibe.color }}
              >
                <div className="text-2xl">{vibe.emoji}</div>
                <div className="text-sm">{format(date, 'EEE').toUpperCase()}</div>
                <div className="text-2xl font-black">{format(date, 'd')}</div>
              </div>

              {/* No Gan Banner */}
              {isNoGan && (
                <div className="bg-orange-500 text-white text-center py-1 font-bold text-sm">
                  🏠 NO GAN! 🏠
                  {isLastFriday ? (
                    <div className="text-xs font-normal">Last Friday of the Month!</div>
                  ) : day?.no_gan_reason ? (
                    <div className="text-xs font-normal">{day.no_gan_reason}</div>
                  ) : null}
                </div>
              )}

              {/* Day Content */}
              <div className="p-2 space-y-1.5 text-xs">
                {/* Drop-off */}
                <div className={`p-1.5 rounded-lg ${isNoGan ? 'opacity-40' : ''}`}
                  style={{ backgroundColor: 'var(--color-gan)' }}>
                  <div className="text-xs text-gray-500 mb-0.5">Drop-off</div>
                  {renderPersonPrint(day?.dropoff_person_id, 'sm')}
                </div>

                {/* Gan Activity - between drop-off and pickup */}
                {!isNoGan && day?.gan_activity && (
                  <div className="text-center py-1 bg-green-100 rounded-lg text-green-700 font-medium text-xs">
                    🏫 {day.gan_activity}
                  </div>
                )}

                {/* Pickup */}
                <div className={`p-1.5 rounded-lg ${isNoGan ? 'opacity-40' : ''}`}
                  style={{ backgroundColor: 'var(--color-gan)' }}>
                  <div className="text-xs text-gray-500 mb-0.5">Pickup</div>
                  {renderPersonPrint(day?.pickup_person_id, 'sm')}
                </div>

                {/* After-Gan Activity */}
                {activity && (
                  <div className="p-1.5 rounded-lg text-center font-medium text-xs"
                    style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
                    🎯 {activity.name}
                    {day?.after_gan_time && (
                      <div className="text-xs opacity-80">{day.after_gan_time}</div>
                    )}
                  </div>
                )}

                {/* Recurring Activities */}
                {recurringActivities.map((act) => (
                  <div key={act.id} className="p-1.5 rounded-lg text-center font-medium bg-purple-100 text-purple-700 text-xs">
                    ○ {act.name}
                    {act.default_time && (
                      <div className="text-xs opacity-80">{act.default_time}</div>
                    )}
                  </div>
                ))}

                {/* Bedtime */}
                <div className="p-1.5 rounded-lg bg-indigo-100">
                  <div className="text-xs text-gray-500 mb-0.5">Bedtime</div>
                  {renderPersonPrint(day?.bedtime_person_id, 'sm')}
                </div>

                {/* Friday Family Dinner */}
                {isFriday && (
                  <div className="p-1.5 rounded-lg bg-amber-100 border-2 border-amber-300">
                    <div className="text-xs text-amber-700 mb-0.5">
                      Family Dinner {familyDinnerTime && `@ ${familyDinnerTime}`}
                    </div>
                    {familyDinnerPersonId ? (
                      renderPersonPrint(familyDinnerPersonId, 'sm')
                    ) : (
                      <span className="text-amber-400 text-xs">TBD</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Saturday Special Card */}
      <div
        className="rounded-2xl overflow-hidden shadow-lg mb-4"
        style={{
          background: `linear-gradient(135deg, ${DAY_VIBES[6].color} 0%, #E8DAEF 100%)`,
        }}
      >
        <div className="p-4">
          <div className="flex items-center justify-center gap-3 mb-3">
            <span className="text-4xl">🌸</span>
            <h2 className="text-2xl font-black text-purple-800">
              SATURDAY {format(weekDates[6], 'd')}
            </h2>
            <span className="text-4xl">🌸</span>
          </div>

          {weekData?.saturday?.activities && weekData.saturday.activities.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {weekData.saturday.activities.map((act: SaturdayActivity, idx: number) => {
                const activity = getActivity(act.activity_id);
                return (
                  <div key={idx} className="bg-white/80 rounded-xl p-3 text-center shadow">
                    <span className="text-2xl">🎯</span>
                    <div className="font-bold text-purple-800">{act.custom_name || activity?.name}</div>
                    {act.time && <div className="text-sm text-purple-600">{act.time}</div>}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-4">
              <span className="text-4xl">😴</span>
              <div className="text-purple-700 font-medium mt-2">Rest & relax day!</div>
            </div>
          )}

          {weekData?.saturday?.notes && (
            <div className="mt-3 p-2 bg-white/60 rounded-lg text-sm text-purple-800">
              📝 {weekData.saturday.notes}
            </div>
          )}
        </div>
      </div>

      {/* Activity Details */}
      {weekActivities.length > 0 && (
        <div className="rounded-2xl overflow-hidden shadow-lg"
          style={{ backgroundColor: 'var(--color-background)' }}>
          <div className="p-4">
            <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
              <span className="text-2xl">📍</span>
              Where to go this week:
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {weekActivities.map(({ activity, days, time }) => (
                <div
                  key={activity.id}
                  className="p-3 rounded-xl bg-white shadow border-l-4"
                  style={{ borderColor: 'var(--color-primary)' }}
                >
                  <div className="font-bold text-lg">{activity.name}</div>
                  <div className="text-sm text-gray-600 flex items-center gap-1">
                    <span>📅</span> {days.join(', ')} {time && `@ ${time}`}
                  </div>
                  {activity.address && (
                    <div className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                      <span>📍</span> {activity.address}
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
        Made with 💜 for Sky
      </div>
    </div>
  );
}
