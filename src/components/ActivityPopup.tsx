import type { Activity } from '../types';

interface ActivityPopupProps {
  activity: Activity;
  onClose: () => void;
}

export function ActivityPopup({ activity, onClose }: ActivityPopupProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold">{activity.name}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-4 space-y-4">
          {activity.address && (
            <div>
              <div className="flex items-start gap-2">
                <span>📍</span>
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
              </div>
            </div>
          )}

          {activity.contact_phone && (
            <div className="flex items-center gap-2">
              <span>📞</span>
              <a
                href={`tel:${activity.contact_phone}`}
                className="text-blue-600 hover:underline"
              >
                {activity.contact_phone}
              </a>
            </div>
          )}

          {activity.note && (
            <div className="flex items-start gap-2">
              <span>📝</span>
              <div className="text-gray-700">{activity.note}</div>
            </div>
          )}

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
      </div>
    </div>
  );
}
