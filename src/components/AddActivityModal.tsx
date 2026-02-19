import { useState } from 'react';
import type { Activity, Person } from '../types';
import { useI18n } from '../lib/i18n';
import { PersonPicker } from './PersonPicker';

interface AddActivityModalProps {
  onSave: (activity: Omit<Activity, 'id'>) => Promise<void>;
  onClose: () => void;
  people?: Person[];
}

function generateMapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export function AddActivityModal({ onSave, onClose, people = [] }: AddActivityModalProps) {
  const { t, translateName } = useI18n();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [note, setNote] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceDay, setRecurrenceDay] = useState('');
  const [defaultTime, setDefaultTime] = useState('');
  const [createdBy, setCreatedBy] = useState('');
  const [associatedPersonIds, setAssociatedPersonIds] = useState<string[]>([]);

  const DAYS_OF_WEEK = [
    { value: 'Sunday', label: t('sunday') },
    { value: 'Monday', label: t('monday') },
    { value: 'Tuesday', label: t('tuesday') },
    { value: 'Wednesday', label: t('wednesday') },
    { value: 'Thursday', label: t('thursday') },
    { value: 'Friday', label: t('friday') },
  ];

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim()) return;

    setSaving(true);
    setSaveError(null);
    try {
      await onSave({
        name: name.trim(),
        address: address.trim() || undefined,
        maps_url: address.trim() ? generateMapsUrl(address.trim()) : undefined,
        contact_phone: contactPhone.trim() || undefined,
        note: note.trim() || undefined,
        is_recurring: isRecurring,
        recurrence_day: isRecurring && recurrenceDay ? recurrenceDay.toLowerCase() : undefined,
        default_time: isRecurring && defaultTime ? defaultTime : undefined,
        created_by: createdBy || undefined,
        associated_person_ids: associatedPersonIds.length > 0 ? associatedPersonIds : undefined,
      });
      onClose();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h2 className="text-xl font-bold">{t('add_new_activity')}</h2>
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
              {t('name')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded-lg p-2"
              placeholder={t('activity_name')}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t('address')}</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full border rounded-lg p-2"
              placeholder={t('address_auto_maps')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t('contact_phone')}</label>
            <input
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="w-full border rounded-lg p-2"
              placeholder={t('phone_number')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t('notes')}</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full border rounded-lg p-2 h-20"
              placeholder={t('any_notes_activity')}
            />
          </div>

          {people.length > 0 && (
            <PersonPicker
              people={people}
              selectedIds={associatedPersonIds}
              onChange={setAssociatedPersonIds}
            />
          )}

          <div className="border-t pt-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="rounded"
              />
              <span className="font-medium">{t('recurring_activity')}</span>
            </label>

            {isRecurring && (
              <div className="mt-3 space-y-3 pl-6">
                <div>
                  <label className="block text-sm font-medium mb-1">{t('day_of_week')}</label>
                  <select
                    value={recurrenceDay}
                    onChange={(e) => setRecurrenceDay(e.target.value)}
                    className="w-full border rounded-lg p-2"
                  >
                    <option value="">{t('select_day')}</option>
                    {DAYS_OF_WEEK.map((day) => (
                      <option key={day.value} value={day.value}>{day.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">{t('default_time')}</label>
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

        <div className="p-4 border-t sticky bottom-0 bg-white space-y-3">
          {people.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-1">{t('whos_adding')}</label>
              <select
                value={createdBy}
                onChange={(e) => setCreatedBy(e.target.value)}
                className="w-full border rounded-lg p-2"
              >
                <option value="">{t('select_person_optional')}</option>
                {people.map((p) => (
                  <option key={p.id} value={p.name}>{translateName(p.name)}</option>
                ))}
              </select>
            </div>
          )}
          {saveError && (
            <div className="text-red-600 text-sm mb-2">{saveError}</div>
          )}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              {t('cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={!name.trim() || saving}
              className="flex-1 px-4 py-2 rounded-lg text-white disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              {saving ? t('saving') : t('save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
