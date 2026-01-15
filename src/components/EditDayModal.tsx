import { useState } from 'react';
import { format, isSaturday } from 'date-fns';
import type { DaySchedule, SaturdaySchedule, Person, Activity } from '../types';

interface EditDayModalProps {
  date: Date;
  schedule: DaySchedule | null;
  saturdaySchedule: SaturdaySchedule | null;
  people: Person[];
  activities: Activity[];
  onSave: (data: Partial<DaySchedule> | Partial<SaturdaySchedule>) => void;
  onClose: () => void;
  onAddActivity: () => void;
}

const NO_GAN_REASONS = ['Holiday', 'Staff Training', 'Last Friday', 'Other'];

export function EditDayModal({
  date,
  schedule,
  saturdaySchedule,
  people,
  activities,
  onSave,
  onClose,
  onAddActivity,
}: EditDayModalProps) {
  const isSat = isSaturday(date);
  const dateStr = format(date, 'yyyy-MM-dd');

  // Weekday state
  const [dropoffPersonId, setDropoffPersonId] = useState(schedule?.dropoff_person_id || '');
  const [ganActivity, setGanActivity] = useState(schedule?.gan_activity || '');
  const [pickupPersonId, setPickupPersonId] = useState(schedule?.pickup_person_id || '');
  const [afterGanActivityId, setAfterGanActivityId] = useState(schedule?.after_gan_activity_id || '');
  const [afterGanTime, setAfterGanTime] = useState(schedule?.after_gan_time || '');
  const [bedtimePersonId, setBedtimePersonId] = useState(schedule?.bedtime_person_id || '');
  const [isNoGan, setIsNoGan] = useState(schedule?.is_no_gan || false);
  const [noGanReason, setNoGanReason] = useState(schedule?.no_gan_reason || '');
  const [notes, setNotes] = useState(schedule?.notes || '');

  // Saturday state
  const [satActivities, setSatActivities] = useState(saturdaySchedule?.activities || []);
  const [satNotes, setSatNotes] = useState(saturdaySchedule?.notes || '');

  const handleSave = () => {
    if (isSat) {
      onSave({
        date: dateStr,
        activities: satActivities,
        notes: satNotes || undefined,
      });
    } else {
      onSave({
        date: dateStr,
        dropoff_person_id: dropoffPersonId || undefined,
        gan_activity: ganActivity || undefined,
        pickup_person_id: pickupPersonId || undefined,
        after_gan_activity_id: afterGanActivityId || undefined,
        after_gan_time: afterGanTime || undefined,
        bedtime_person_id: bedtimePersonId || undefined,
        is_no_gan: isNoGan,
        no_gan_reason: isNoGan ? noGanReason : undefined,
        notes: notes || undefined,
      });
    }
    onClose();
  };

  const addSaturdayActivity = () => {
    setSatActivities([...satActivities, { activity_id: '', time: '' }]);
  };

  const removeSaturdayActivity = (index: number) => {
    setSatActivities(satActivities.filter((_, i) => i !== index));
  };

  const updateSaturdayActivity = (index: number, field: string, value: string) => {
    const updated = [...satActivities];
    updated[index] = { ...updated[index], [field]: value };
    setSatActivities(updated);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h2 className="text-xl font-bold">
            Edit {format(date, 'EEEE, MMM d')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-4 space-y-4">
          {isSat ? (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">Activities</label>
                <div className="space-y-2">
                  {satActivities.map((act, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <select
                        value={act.activity_id}
                        onChange={(e) => updateSaturdayActivity(idx, 'activity_id', e.target.value)}
                        className="flex-1 border rounded-lg p-2"
                      >
                        <option value="">Select activity...</option>
                        {activities.map((a) => (
                          <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={act.time || ''}
                        onChange={(e) => updateSaturdayActivity(idx, 'time', e.target.value)}
                        placeholder="Time"
                        className="w-24 border rounded-lg p-2"
                      />
                      <button
                        onClick={() => removeSaturdayActivity(idx)}
                        className="text-red-500 hover:text-red-700"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={addSaturdayActivity}
                  className="mt-2 text-sm text-blue-600 hover:underline"
                >
                  + Add activity
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  value={satNotes}
                  onChange={(e) => setSatNotes(e.target.value)}
                  className="w-full border rounded-lg p-2 h-20"
                  placeholder="Any notes for this day..."
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Drop-off</label>
                <select
                  value={dropoffPersonId}
                  onChange={(e) => setDropoffPersonId(e.target.value)}
                  className="w-full border rounded-lg p-2"
                >
                  <option value="">Select person...</option>
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Gan Activity</label>
                <input
                  type="text"
                  value={ganActivity}
                  onChange={(e) => setGanActivity(e.target.value)}
                  className="w-full border rounded-lg p-2"
                  placeholder="e.g., Music, Art, Sports"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Pickup</label>
                <select
                  value={pickupPersonId}
                  onChange={(e) => setPickupPersonId(e.target.value)}
                  className="w-full border rounded-lg p-2"
                >
                  <option value="">Select person...</option>
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">After-Gan Activity</label>
                <select
                  value={afterGanActivityId}
                  onChange={(e) => setAfterGanActivityId(e.target.value)}
                  className="w-full border rounded-lg p-2"
                >
                  <option value="">No activity</option>
                  {activities.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
                <button
                  onClick={onAddActivity}
                  className="mt-1 text-sm text-blue-600 hover:underline"
                >
                  + Add new activity
                </button>
                {afterGanActivityId && (
                  <input
                    type="text"
                    value={afterGanTime}
                    onChange={(e) => setAfterGanTime(e.target.value)}
                    className="w-full border rounded-lg p-2 mt-2"
                    placeholder="Time (e.g., 17:15)"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Bedtime</label>
                <select
                  value={bedtimePersonId}
                  onChange={(e) => setBedtimePersonId(e.target.value)}
                  className="w-full border rounded-lg p-2"
                >
                  <option value="">Select person...</option>
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="border-t pt-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isNoGan}
                    onChange={(e) => setIsNoGan(e.target.checked)}
                    className="rounded"
                  />
                  <span className="font-medium">No Gan this day</span>
                </label>
                {isNoGan && (
                  <select
                    value={noGanReason}
                    onChange={(e) => setNoGanReason(e.target.value)}
                    className="w-full border rounded-lg p-2 mt-2"
                  >
                    <option value="">Select reason...</option>
                    {NO_GAN_REASONS.map((reason) => (
                      <option key={reason} value={reason}>{reason}</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full border rounded-lg p-2 h-20"
                  placeholder="Any notes for this day..."
                />
              </div>
            </>
          )}
        </div>

        <div className="flex gap-2 p-4 border-t sticky bottom-0 bg-white">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 rounded-lg text-white"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
