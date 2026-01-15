import { useState } from 'react';
import type { Activity } from '../types';

interface AddActivityModalProps {
  onSave: (activity: Omit<Activity, 'id'>) => void;
  onClose: () => void;
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

function generateMapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export function AddActivityModal({ onSave, onClose }: AddActivityModalProps) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [note, setNote] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceDay, setRecurrenceDay] = useState('');
  const [defaultTime, setDefaultTime] = useState('');

  const handleSave = () => {
    if (!name.trim()) return;

    onSave({
      name: name.trim(),
      address: address.trim() || undefined,
      maps_url: address.trim() ? generateMapsUrl(address.trim()) : undefined,
      contact_phone: contactPhone.trim() || undefined,
      note: note.trim() || undefined,
      is_recurring: isRecurring,
      recurrence_day: isRecurring && recurrenceDay ? recurrenceDay.toLowerCase() : undefined,
      default_time: isRecurring && defaultTime ? defaultTime : undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h2 className="text-xl font-bold">Add New Activity</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded-lg p-2"
              placeholder="Activity name"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full border rounded-lg p-2"
              placeholder="Address (auto-generates Google Maps link)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Contact Phone</label>
            <input
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="w-full border rounded-lg p-2"
              placeholder="Phone number"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full border rounded-lg p-2 h-20"
              placeholder="Any notes about this activity..."
            />
          </div>

          <div className="border-t pt-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="rounded"
              />
              <span className="font-medium">Recurring activity</span>
            </label>

            {isRecurring && (
              <div className="mt-3 space-y-3 pl-6">
                <div>
                  <label className="block text-sm font-medium mb-1">Day of Week</label>
                  <select
                    value={recurrenceDay}
                    onChange={(e) => setRecurrenceDay(e.target.value)}
                    className="w-full border rounded-lg p-2"
                  >
                    <option value="">Select day...</option>
                    {DAYS_OF_WEEK.map((day) => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Default Time</label>
                  <input
                    type="time"
                    value={defaultTime}
                    onChange={(e) => setDefaultTime(e.target.value)}
                    className="w-full border rounded-lg p-2"
                  />
                </div>
              </div>
            )}
          </div>
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
            disabled={!name.trim()}
            className="flex-1 px-4 py-2 rounded-lg text-white disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
