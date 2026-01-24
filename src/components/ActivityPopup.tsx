import { useState } from 'react';
import type { Activity } from '../types';
import { useUpdateActivity } from '../hooks/useActivities';

interface ActivityPopupProps {
  activity: Activity;
  onClose: () => void;
}

export function ActivityPopup({ activity, onClose }: ActivityPopupProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(activity.name);
  const [address, setAddress] = useState(activity.address || '');
  const [mapsUrl, setMapsUrl] = useState(activity.maps_url || '');
  const [contactPhone, setContactPhone] = useState(activity.contact_phone || '');
  const [note, setNote] = useState(activity.note || '');
  const [defaultTime, setDefaultTime] = useState(activity.default_time || '');

  const updateActivity = useUpdateActivity();

  const handleSave = () => {
    updateActivity.mutate(
      {
        id: activity.id,
        name,
        address: address || null,
        maps_url: mapsUrl || null,
        contact_phone: contactPhone || null,
        note: note || null,
        default_time: defaultTime || null,
      },
      {
        onSuccess: () => {
          setIsEditing(false);
        },
      }
    );
  };

  const handleCancel = () => {
    setName(activity.name);
    setAddress(activity.address || '');
    setMapsUrl(activity.maps_url || '');
    setContactPhone(activity.contact_phone || '');
    setNote(activity.note || '');
    setDefaultTime(activity.default_time || '');
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-4 border-b">
          {isEditing ? (
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-xl font-bold border rounded px-2 py-1 w-full mr-2"
            />
          ) : (
            <h2 className="text-xl font-bold">{activity.name}</h2>
          )}
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none ml-2"
          >
            ×
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Address */}
          <div>
            <div className="flex items-start gap-2">
              <span>📍</span>
              {isEditing ? (
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Address"
                    className="border rounded px-2 py-1 w-full text-sm"
                  />
                  <input
                    type="text"
                    value={mapsUrl}
                    onChange={(e) => setMapsUrl(e.target.value)}
                    placeholder="Google Maps URL"
                    className="border rounded px-2 py-1 w-full text-sm"
                  />
                </div>
              ) : activity.address ? (
                <div>
                  <div>{activity.address}</div>
                  {activity.maps_url && (
                    <a
                      href={activity.maps_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm"
                    >
                      Open in Google Maps
                    </a>
                  )}
                </div>
              ) : (
                <span className="text-gray-400 italic">No address</span>
              )}
            </div>
          </div>

          {/* Phone */}
          <div className="flex items-center gap-2">
            <span>📞</span>
            {isEditing ? (
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="Contact phone"
                className="border rounded px-2 py-1 flex-1 text-sm"
              />
            ) : activity.contact_phone ? (
              <a
                href={`tel:${activity.contact_phone}`}
                className="text-blue-600 hover:underline"
              >
                {activity.contact_phone}
              </a>
            ) : (
              <span className="text-gray-400 italic">No phone</span>
            )}
          </div>

          {/* Default Time */}
          <div className="flex items-center gap-2">
            <span>🕐</span>
            {isEditing ? (
              <input
                type="time"
                value={defaultTime}
                onChange={(e) => setDefaultTime(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              />
            ) : activity.default_time ? (
              <span>{activity.default_time}</span>
            ) : (
              <span className="text-gray-400 italic">No default time</span>
            )}
          </div>

          {/* Note */}
          <div className="flex items-start gap-2">
            <span>📝</span>
            {isEditing ? (
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Notes"
                rows={3}
                className="border rounded px-2 py-1 flex-1 text-sm"
              />
            ) : activity.note ? (
              <div className="text-gray-700">{activity.note}</div>
            ) : (
              <span className="text-gray-400 italic">No notes</span>
            )}
          </div>

          {/* Recurring info (read-only) */}
          {activity.is_recurring && activity.recurrence_day && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>🔄</span>
              <span>
                Every {activity.recurrence_day}
                {activity.default_time && ` at ${activity.default_time}`}
              </span>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="p-4 border-t flex justify-end gap-2">
          {isEditing ? (
            <>
              <button
                onClick={handleCancel}
                className="px-4 py-2 rounded border hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={updateActivity.isPending}
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {updateActivity.isPending ? 'Saving...' : 'Save'}
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200"
            >
              Edit Activity
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
