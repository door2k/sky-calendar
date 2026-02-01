import { useState, useRef, useEffect } from 'react';
import { format, isSaturday, isFriday } from 'date-fns';
import { isLastFridayOfMonth } from '../lib/dateUtils';
import { useI18n, useFormatDate } from '../lib/i18n';
import type { DaySchedule, SaturdaySchedule, Person, Activity } from '../types';
import { PersonAvatar } from './PersonAvatar';

function ActivityAutocomplete({
  activities,
  value,
  onChange,
  placeholder = 'Type activity name...',
}: {
  activities: Activity[];
  value: string;
  onChange: (activityId: string, newName: string | null) => void;
  placeholder?: string;
}) {
  const { t, translateActivity } = useI18n();
  const selectedActivity = activities.find((a) => a.id === value);
  const [text, setText] = useState(selectedActivity ? translateActivity(selectedActivity.name) : '');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync text when value prop changes externally (e.g. cleared)
  useEffect(() => {
    if (!value) setText('');
    else {
      const act = activities.find((a) => a.id === value);
      if (act) setText(translateActivity(act.name));
    }
  }, [value, activities]);

  const filtered = text.trim()
    ? activities.filter((a) => a.name.toLowerCase().includes(text.toLowerCase()) || translateActivity(a.name).toLowerCase().includes(text.toLowerCase()))
    : activities;

  const exactMatch = activities.find((a) => a.name.toLowerCase() === text.trim().toLowerCase() || translateActivity(a.name).toLowerCase() === text.trim().toLowerCase());

  const handleSelect = (activity: Activity) => {
    setText(translateActivity(activity.name));
    setShowSuggestions(false);
    setHighlightIdx(-1);
    onChange(activity.id, null);
  };

  const handleInputChange = (newText: string) => {
    setText(newText);
    setShowSuggestions(true);
    setHighlightIdx(-1);
    // If it matches an existing activity exactly, select it
    const match = activities.find((a) => a.name.toLowerCase() === newText.trim().toLowerCase());
    if (match) {
      onChange(match.id, null);
    } else {
      // Signal that this is a new name (no existing ID)
      onChange('', newText.trim() || null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx((prev) => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && highlightIdx >= 0) {
      e.preventDefault();
      handleSelect(filtered[highlightIdx]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={text}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => setShowSuggestions(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full border rounded-lg p-2"
      />
      {showSuggestions && filtered.length > 0 && (
        <ul className="absolute z-50 w-full bg-white border rounded-lg mt-1 max-h-48 overflow-y-auto shadow-lg">
          {filtered.map((a, i) => (
            <li
              key={a.id}
              className={`px-3 py-2 cursor-pointer ${i === highlightIdx ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
              onMouseDown={() => handleSelect(a)}
            >
              {translateActivity(a.name)}
            </li>
          ))}
        </ul>
      )}
      {text.trim() && !exactMatch && !showSuggestions && (
        <div className="text-xs text-gray-500 mt-1">{t('new_activity_created').replace('{name}', text.trim())}</div>
      )}
    </div>
  );
}

interface EditDayModalProps {
  date: Date;
  schedule: DaySchedule | null;
  saturdaySchedule: SaturdaySchedule | null;
  lastFridaySchedule?: SaturdaySchedule | null;
  people: Person[];
  activities: Activity[];
  onSave: (data: Partial<DaySchedule> | Partial<SaturdaySchedule>) => void;
  onClose: () => void;
  onCreateActivity: (name: string) => Promise<Activity>;
}

export function EditDayModal({
  date,
  schedule,
  saturdaySchedule,
  lastFridaySchedule,
  people,
  activities,
  onSave,
  onClose,
  onCreateActivity,
}: EditDayModalProps) {
  const { t, translateName } = useI18n();
  const formatDate = useFormatDate();
  const isSat = isSaturday(date);
  const isFri = isFriday(date);
  const isLastFri = isLastFridayOfMonth(date);
  const useSaturdayStyle = isSat || isLastFri;
  const dateStr = format(date, 'yyyy-MM-dd');

  // Use appropriate schedule for Saturday-style days
  const satStyleSchedule = isSat ? saturdaySchedule : lastFridaySchedule;

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

  // Saturday-style state (for Saturdays and last Fridays)
  const [satActivities, setSatActivities] = useState(satStyleSchedule?.activities || []);
  const [satNotes, setSatNotes] = useState(satStyleSchedule?.notes || '');

  // Family dinner state (for Fridays)
  const [familyDinnerPersonId, setFamilyDinnerPersonId] = useState(
    isLastFri ? (satStyleSchedule?.family_dinner_person_id || '') : (schedule?.family_dinner_person_id || '')
  );
  const [familyDinnerTime, setFamilyDinnerTime] = useState(
    isLastFri ? (satStyleSchedule?.family_dinner_time || '16:00') : (schedule?.family_dinner_time || '16:00')
  );

  // Pending new activity names (not yet created in DB)
  const [pendingAfterGanName, setPendingAfterGanName] = useState<string | null>(null);
  const [pendingSatNames, setPendingSatNames] = useState<Record<number, string | null>>({});
  const [saving, setSaving] = useState(false);

  // Creator tracking state
  const [updatedBy, setUpdatedBy] = useState('');

  const NO_GAN_REASONS = [
    { value: 'Holiday', label: t('reason_holiday') },
    { value: 'Staff Training', label: t('reason_staff_training') },
    { value: 'Last Friday', label: t('reason_last_friday') },
    { value: 'Other', label: t('reason_other') },
  ];

  const handleSave = async () => {
    setSaving(true);
    try {
      await handleSaveInner();
    } finally {
      setSaving(false);
    }
  };

  const handleSaveInner = async () => {
    if (useSaturdayStyle) {
      // Create any pending new activities for Saturday slots
      const resolvedActivities = [...satActivities];
      for (const [idxStr, name] of Object.entries(pendingSatNames)) {
        if (name) {
          const created = await onCreateActivity(name);
          resolvedActivities[Number(idxStr)] = { ...resolvedActivities[Number(idxStr)], activity_id: created.id };
        }
      }

      const saveData: Partial<SaturdaySchedule> & { date: string } = {
        date: dateStr,
        activities: resolvedActivities,
        notes: satNotes || undefined,
        updated_by: updatedBy || undefined,
      };
      if (isLastFri && !isSat) {
        saveData.family_dinner_person_id = familyDinnerPersonId || undefined;
        saveData.family_dinner_time = familyDinnerTime || undefined;
      }
      onSave(saveData);
    } else {
      // Create pending after-gan activity if needed
      let resolvedActivityId = afterGanActivityId;
      if (pendingAfterGanName) {
        const created = await onCreateActivity(pendingAfterGanName);
        resolvedActivityId = created.id;
      }

      const saveData: Partial<DaySchedule> & { date: string } = {
        date: dateStr,
        dropoff_person_id: dropoffPersonId || undefined,
        gan_activity: ganActivity || undefined,
        pickup_person_id: pickupPersonId || undefined,
        after_gan_activity_id: resolvedActivityId || undefined,
        after_gan_time: afterGanTime || undefined,
        bedtime_person_id: bedtimePersonId || undefined,
        is_no_gan: isNoGan,
        no_gan_reason: isNoGan ? noGanReason : undefined,
        notes: notes || undefined,
        updated_by: updatedBy || undefined,
      };
      if (isFri) {
        saveData.family_dinner_person_id = familyDinnerPersonId || undefined;
        saveData.family_dinner_time = familyDinnerTime || undefined;
      }
      onSave(saveData);
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

  const getSelectedPerson = (id: string): Person | undefined => {
    return people.find((p) => p.id === id);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h2 className="text-xl font-bold">
            {t('edit')} {formatDate(date, 'EEEE, MMM d')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-4 space-y-4">
          {useSaturdayStyle ? (
            <>
              {isLastFri && (
                <div className="bg-orange-100 text-orange-800 px-3 py-2 rounded-lg text-sm mb-2">
                  {t('last_friday_no_gan_long')}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-2">{t('activities')}</label>
                <div className="space-y-2">
                  {satActivities.map((act, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <div className="flex-1">
                        <ActivityAutocomplete
                          activities={activities}
                          value={act.activity_id}
                          onChange={(id, newName) => {
                            updateSaturdayActivity(idx, 'activity_id', id);
                            setPendingSatNames((prev) => ({ ...prev, [idx]: newName }));
                          }}
                          placeholder={t('type_activity_name')}
                        />
                      </div>
                      <input
                        type="text"
                        value={act.time || ''}
                        onChange={(e) => updateSaturdayActivity(idx, 'time', e.target.value)}
                        placeholder={t('dinner_time')}
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
                  {t('add_activity')}
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">{t('notes')}</label>
                <textarea
                  value={satNotes}
                  onChange={(e) => setSatNotes(e.target.value)}
                  className="w-full border rounded-lg p-2 h-20"
                  placeholder={t('notes_placeholder')}
                />
              </div>

              {/* Family Dinner for last Fridays */}
              {isLastFri && !isSat && (
                <div className="border-t pt-4">
                  <label className="block text-sm font-medium mb-2">🍽️ {t('family_dinner')}</label>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">{t('whos_hosting')}</label>
                      <div className="flex items-center gap-2">
                        {familyDinnerPersonId && getSelectedPerson(familyDinnerPersonId) && (
                          <PersonAvatar person={getSelectedPerson(familyDinnerPersonId)!} size="lg" showName={false} />
                        )}
                        <select
                          value={familyDinnerPersonId}
                          onChange={(e) => {
                            console.log('[EditDayModal] Last Friday family dinner person changed:', e.target.value);
                            setFamilyDinnerPersonId(e.target.value);
                          }}
                          className="flex-1 border rounded-lg p-2"
                        >
                          <option value="">{t('select_person')}</option>
                          {people.map((p) => (
                            <option key={p.id} value={p.id}>{translateName(p.name)}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">{t('dinner_time')}</label>
                      <input
                        type="time"
                        value={familyDinnerTime}
                        onChange={(e) => setFamilyDinnerTime(e.target.value)}
                        className="border rounded-lg p-2"
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">{t('dropoff')}</label>
                <div className="flex items-center gap-2">
                  {dropoffPersonId && getSelectedPerson(dropoffPersonId) && (
                    <PersonAvatar person={getSelectedPerson(dropoffPersonId)!} size="md" showName={false} />
                  )}
                  <select
                    value={dropoffPersonId}
                    onChange={(e) => setDropoffPersonId(e.target.value)}
                    className="flex-1 border rounded-lg p-2"
                  >
                    <option value="">{t('select_person')}</option>
                    {people.map((p) => (
                      <option key={p.id} value={p.id}>{translateName(p.name)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">{t('gan_activity')}</label>
                <input
                  type="text"
                  value={ganActivity}
                  onChange={(e) => setGanActivity(e.target.value)}
                  className="w-full border rounded-lg p-2"
                  placeholder={t('gan_activity_placeholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">{t('pickup')}</label>
                <div className="flex items-center gap-2">
                  {pickupPersonId && getSelectedPerson(pickupPersonId) && (
                    <PersonAvatar person={getSelectedPerson(pickupPersonId)!} size="md" showName={false} />
                  )}
                  <select
                    value={pickupPersonId}
                    onChange={(e) => setPickupPersonId(e.target.value)}
                    className="flex-1 border rounded-lg p-2"
                  >
                    <option value="">{t('select_person')}</option>
                    {people.map((p) => (
                      <option key={p.id} value={p.id}>{translateName(p.name)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">{t('after_gan_activity')}</label>
                <ActivityAutocomplete
                  activities={activities}
                  value={afterGanActivityId}
                  onChange={(id, newName) => {
                    setAfterGanActivityId(id);
                    setPendingAfterGanName(newName);
                  }}
                  placeholder={t('type_activity_name')}
                />
                {(afterGanActivityId || pendingAfterGanName) && (
                  <input
                    type="text"
                    value={afterGanTime}
                    onChange={(e) => setAfterGanTime(e.target.value)}
                    className="w-full border rounded-lg p-2 mt-2"
                    placeholder={t('time_placeholder')}
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">{t('bedtime')}</label>
                <div className="flex items-center gap-2">
                  {bedtimePersonId && getSelectedPerson(bedtimePersonId) && (
                    <PersonAvatar person={getSelectedPerson(bedtimePersonId)!} size="md" showName={false} />
                  )}
                  <select
                    value={bedtimePersonId}
                    onChange={(e) => setBedtimePersonId(e.target.value)}
                    className="flex-1 border rounded-lg p-2"
                  >
                    <option value="">{t('select_person')}</option>
                    {people.map((p) => (
                      <option key={p.id} value={p.id}>{translateName(p.name)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="border-t pt-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isNoGan}
                    onChange={(e) => setIsNoGan(e.target.checked)}
                    className="rounded"
                  />
                  <span className="font-medium">{t('no_gan_this_day')}</span>
                </label>
                {isNoGan && (
                  <select
                    value={noGanReason}
                    onChange={(e) => setNoGanReason(e.target.value)}
                    className="w-full border rounded-lg p-2 mt-2"
                  >
                    <option value="">{t('select_reason')}</option>
                    {NO_GAN_REASONS.map((reason) => (
                      <option key={reason.value} value={reason.value}>{reason.label}</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">{t('notes')}</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full border rounded-lg p-2 h-20"
                  placeholder={t('notes_placeholder')}
                />
              </div>

              {/* Family Dinner for regular Fridays */}
              {isFri && !isLastFri && (
                <div className="border-t pt-4">
                  <label className="block text-sm font-medium mb-2">🍽️ {t('family_dinner')}</label>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">{t('whos_hosting')}</label>
                      <div className="flex items-center gap-2">
                        {familyDinnerPersonId && getSelectedPerson(familyDinnerPersonId) && (
                          <PersonAvatar person={getSelectedPerson(familyDinnerPersonId)!} size="lg" showName={false} />
                        )}
                        <select
                          value={familyDinnerPersonId}
                          onChange={(e) => setFamilyDinnerPersonId(e.target.value)}
                          className="flex-1 border rounded-lg p-2"
                        >
                          <option value="">{t('select_person')}</option>
                          {people.map((p) => (
                            <option key={p.id} value={p.id}>{translateName(p.name)}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">{t('dinner_time')}</label>
                      <input
                        type="time"
                        value={familyDinnerTime}
                        onChange={(e) => setFamilyDinnerTime(e.target.value)}
                        className="border rounded-lg p-2"
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-4 border-t sticky bottom-0 bg-white space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">{t('whos_updating')}</label>
            <select
              value={updatedBy}
              onChange={(e) => setUpdatedBy(e.target.value)}
              className="w-full border rounded-lg p-2"
            >
              <option value="">{t('select_person_optional')}</option>
              {people.map((p) => (
                <option key={p.id} value={p.name}>{translateName(p.name)}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              {t('cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
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
