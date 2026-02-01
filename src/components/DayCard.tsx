import { format, isSaturday, isFriday, getDay } from 'date-fns';
import { isLastFridayOfMonth } from '../lib/dateUtils';
import { useI18n, useFormatDate } from '../lib/i18n';
import type { DaySchedule, SaturdaySchedule, Person, Activity } from '../types';
import { PersonAvatar } from './PersonAvatar';

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

interface DayCardProps {
  date: Date;
  schedule: DaySchedule | null;
  saturdaySchedule?: SaturdaySchedule | null;
  people: Person[];
  activities: Activity[];
  onEdit: () => void;
  onActivityClick: (activity: Activity) => void;
  isToday?: boolean;
  isLastFriday?: boolean; // When true, render like Saturday
  lastFridaySchedule?: SaturdaySchedule | null; // Schedule for last Friday
  readOnly?: boolean;
}

export function DayCard({
  date,
  schedule,
  saturdaySchedule,
  people,
  activities,
  onEdit,
  onActivityClick,
  isToday = false,
  isLastFriday = false,
  lastFridaySchedule,
  readOnly = false,
}: DayCardProps) {
  const { t, translateName } = useI18n();
  const formatDate = useFormatDate();
  const dayName = formatDate(date, 'EEEE').toUpperCase();
  const dayNumber = format(date, 'd');
  const isSat = isSaturday(date);
  const isFri = isFriday(date);

  // Check if this is actually the last Friday (auto-detect if not passed)
  const isLastFri = isLastFriday || isLastFridayOfMonth(date);

  // Determine if this day should be rendered like Saturday
  const renderAsSaturdayStyle = isSat || isLastFri;

  const getPerson = (id?: string): Person | null => {
    if (!id) return null;
    return people.find((p) => p.id === id) || null;
  };

  const renderPerson = (id?: string) => {
    const person = getPerson(id);
    if (!person) return <span>—</span>;
    return <PersonAvatar person={person} size="sm" translateName={translateName} />;
  };

  const getActivity = (id?: string) => {
    if (!id) return null;
    return activities.find((a) => a.id === id);
  };

  // Get recurring activities for this day of the week
  const getRecurringActivitiesForDay = (): Activity[] => {
    const dayOfWeek = getDay(date);
    const dayName = DAY_NAMES[dayOfWeek];
    return activities.filter(
      (a) => a.is_recurring && a.recurrence_day?.toLowerCase() === dayName
    );
  };

  // Render Saturday-style card for Saturdays and last Fridays
  if (renderAsSaturdayStyle) {
    // Use the appropriate schedule based on day type
    const scheduleToUse = isSat ? saturdaySchedule : lastFridaySchedule;

    return (
      <div
        onClick={readOnly ? undefined : onEdit}
        className={`rounded-lg p-4 ${readOnly ? '' : 'cursor-pointer hover:shadow-md'} transition-shadow ${
          isSat ? 'col-span-full' : ''
        } ${isToday ? 'ring-4 ring-yellow-400 shadow-lg' : ''}`}
        style={{ backgroundColor: 'var(--color-saturday)' }}
      >
        <div className="font-bold text-lg mb-2">
          {dayName} {dayNumber}
          {isLastFri && !isSat && (
            <span className="ml-2 text-sm font-normal text-orange-700 bg-orange-100 px-2 py-0.5 rounded">
              {t('last_friday_no_gan')}
            </span>
          )}
        </div>
        {scheduleToUse?.activities && scheduleToUse.activities.length > 0 ? (
          <div className="space-y-1">
            {scheduleToUse.activities.map((act, idx) => {
              const activity = getActivity(act.activity_id);
              return (
                <div
                  key={idx}
                  className="flex items-center gap-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (activity) onActivityClick(activity);
                  }}
                >
                  <span>🎯</span>
                  <span className={activity ? 'cursor-pointer hover:underline' : ''}>
                    {act.custom_name || activity?.name || t('activity')}
                  </span>
                  {act.time && <span className="text-gray-600">— {act.time}</span>}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-gray-500 italic">{t('no_activities_planned')}</div>
        )}
        {scheduleToUse?.notes && (
          <div className="mt-2 text-sm text-gray-600">{scheduleToUse.notes}</div>
        )}
        {/* Family Dinner for last Fridays */}
        {isLastFri && !isSat && (
          <div className="mt-3 pt-3 border-t border-orange-200">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🍽️</span>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-600">{t('family_dinner')}</span>
                <div className="flex items-center gap-2">
                  {scheduleToUse?.family_dinner_person_id ? (
                    <>
                      <PersonAvatar
                        person={getPerson(scheduleToUse.family_dinner_person_id)!}
                        size="xl"
                        showName={false}
                      />
                      <span className="text-lg font-medium">
                        {translateName(getPerson(scheduleToUse.family_dinner_person_id)?.name || '')}
                      </span>
                    </>
                  ) : (
                    <span className="text-gray-400 italic">{t('not_assigned')}</span>
                  )}
                  {scheduleToUse?.family_dinner_time && (
                    <span className="text-gray-600 ml-2">
                      @ {scheduleToUse.family_dinner_time}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const isNoGan = schedule?.is_no_gan;
  const afterGanActivity = getActivity(schedule?.after_gan_activity_id);

  return (
    <div
      onClick={readOnly ? undefined : onEdit}
      className={`rounded-lg overflow-hidden ${readOnly ? '' : 'cursor-pointer hover:shadow-md'} transition-shadow ${
        isNoGan ? 'ring-2 ring-orange-400' : ''
      } ${isToday ? 'ring-4 ring-yellow-400 shadow-lg' : ''}`}
      style={{ backgroundColor: isNoGan ? 'var(--color-no-gan)' : 'white' }}
    >
      {isNoGan && (
        <div className="bg-orange-400 text-white text-center py-1 font-bold text-sm">
          {t('no_gan')}
        </div>
      )}
      <div className="p-3">
        <div className="text-center mb-3">
          <div className="font-bold">{dayName}</div>
          <div className="text-2xl">{dayNumber}</div>
          {isNoGan && schedule?.no_gan_reason && (
            <div className="text-sm text-orange-700">{schedule.no_gan_reason}</div>
          )}
        </div>

        <div className="space-y-2 text-sm">
          <div
            className={`flex items-center gap-2 p-2 rounded ${isNoGan ? 'line-through text-gray-400' : ''}`}
            style={{ backgroundColor: isNoGan ? 'transparent' : 'var(--color-gan)' }}
          >
            <span>🌅</span>
            {renderPerson(schedule?.dropoff_person_id)}
          </div>

          <div
            className={`flex items-center gap-2 p-2 rounded ${isNoGan ? 'line-through text-gray-400' : ''}`}
            style={{ backgroundColor: isNoGan ? 'transparent' : 'var(--color-gan)' }}
          >
            <span>🏫</span>
            <span>{schedule?.gan_activity || '—'}</span>
          </div>

          <div
            className={`flex items-center gap-2 p-2 rounded ${isNoGan ? 'line-through text-gray-400' : ''}`}
            style={{ backgroundColor: isNoGan ? 'transparent' : 'var(--color-gan)' }}
          >
            <span>🌆</span>
            {renderPerson(schedule?.pickup_person_id)}
          </div>

          <div className="flex items-center gap-2 p-2 rounded bg-gray-50">
            <span>🎯</span>
            {afterGanActivity ? (
              <span
                className="cursor-pointer hover:underline"
                onClick={(e) => {
                  e.stopPropagation();
                  onActivityClick(afterGanActivity);
                }}
              >
                {afterGanActivity.name}
                {schedule?.after_gan_time && (
                  <span className="text-gray-500 ml-1">{schedule.after_gan_time}</span>
                )}
                <span className="ml-1">▸</span>
              </span>
            ) : (
              <span>—</span>
            )}
          </div>

          {/* Recurring activities for this day (if not already shown via explicit assignment) */}
          {getRecurringActivitiesForDay()
            .filter((a) => a.id !== schedule?.after_gan_activity_id)
            .map((activity) => (
              <div
                key={activity.id}
                className="flex items-center gap-2 p-2 rounded bg-purple-50"
                onClick={(e) => {
                  e.stopPropagation();
                  onActivityClick(activity);
                }}
              >
                <span className="text-purple-600">○</span>
                <span className="cursor-pointer hover:underline text-purple-700">
                  {activity.name}
                  {activity.default_time && (
                    <span className="text-purple-500 ml-1">{activity.default_time}</span>
                  )}
                  <span className="ml-1">▸</span>
                </span>
              </div>
            ))}

          <div className="flex items-center gap-2 p-2 rounded bg-gray-50">
            <span>🌙</span>
            {renderPerson(schedule?.bedtime_person_id)}
          </div>

          {/* Family Dinner for regular Fridays */}
          {isFri && !isLastFri && (
            <div className="mt-2 pt-2 border-t border-gray-200">
              <div className="flex items-center gap-2 p-2 rounded bg-amber-50">
                <span>🍽️</span>
                <div className="flex flex-col flex-1">
                  <span className="text-xs text-gray-500">{t('family_dinner')}</span>
                  <div className="flex items-center gap-2">
                    {schedule?.family_dinner_person_id ? (
                      <>
                        <PersonAvatar
                          person={getPerson(schedule.family_dinner_person_id)!}
                          size="xl"
                          showName={false}
                        />
                        <span className="font-medium">
                          {translateName(getPerson(schedule.family_dinner_person_id)?.name || '')}
                        </span>
                      </>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                    {schedule?.family_dinner_time && (
                      <span className="text-gray-500 text-sm ml-auto">
                        {schedule.family_dinner_time}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
