import { format, isSaturday, isFriday } from 'date-fns';
import { isLastFridayOfMonth } from '../lib/dateUtils';
import type { DaySchedule, SaturdaySchedule, Person, Activity } from '../types';
import { PersonAvatar } from './PersonAvatar';

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
}: DayCardProps) {
  const dayName = format(date, 'EEEE').toUpperCase();
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
    return <PersonAvatar person={person} size="sm" />;
  };

  const getActivity = (id?: string) => {
    if (!id) return null;
    return activities.find((a) => a.id === id);
  };

  // Render Saturday-style card for Saturdays and last Fridays
  if (renderAsSaturdayStyle) {
    // Use the appropriate schedule based on day type
    const scheduleToUse = isSat ? saturdaySchedule : lastFridaySchedule;

    return (
      <div
        onClick={onEdit}
        className={`rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow ${
          isSat ? 'col-span-full' : ''
        } ${isToday ? 'ring-4 ring-yellow-400 shadow-lg' : ''}`}
        style={{ backgroundColor: 'var(--color-saturday)' }}
      >
        <div className="font-bold text-lg mb-2">
          {dayName} {dayNumber}
          {isLastFri && !isSat && (
            <span className="ml-2 text-sm font-normal text-orange-700 bg-orange-100 px-2 py-0.5 rounded">
              Last Friday - No Gan
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
                    {act.custom_name || activity?.name || 'Activity'}
                  </span>
                  {act.time && <span className="text-gray-600">— {act.time}</span>}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-gray-500 italic">No activities planned</div>
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
                <span className="text-sm font-medium text-gray-600">Family Dinner</span>
                <div className="flex items-center gap-2">
                  {scheduleToUse?.family_dinner_person_id ? (
                    <>
                      <PersonAvatar
                        person={getPerson(scheduleToUse.family_dinner_person_id)!}
                        size="xl"
                        showName={false}
                      />
                      <span className="text-lg font-medium">
                        {getPerson(scheduleToUse.family_dinner_person_id)?.name}
                      </span>
                    </>
                  ) : (
                    <span className="text-gray-400 italic">Not assigned</span>
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
      onClick={onEdit}
      className={`rounded-lg overflow-hidden cursor-pointer hover:shadow-md transition-shadow ${
        isNoGan ? 'ring-2 ring-orange-400' : ''
      } ${isToday ? 'ring-4 ring-yellow-400 shadow-lg' : ''}`}
      style={{ backgroundColor: isNoGan ? 'var(--color-no-gan)' : 'white' }}
    >
      {isNoGan && (
        <div className="bg-orange-400 text-white text-center py-1 font-bold text-sm">
          NO GAN
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
                  <span className="text-xs text-gray-500">Family Dinner</span>
                  <div className="flex items-center gap-2">
                    {schedule?.family_dinner_person_id ? (
                      <>
                        <PersonAvatar
                          person={getPerson(schedule.family_dinner_person_id)!}
                          size="xl"
                          showName={false}
                        />
                        <span className="font-medium">
                          {getPerson(schedule.family_dinner_person_id)?.name}
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
