import type { Person } from '../types';
import { useI18n } from '../lib/i18n';

interface PersonPickerProps {
  people: Person[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function PersonPicker({ people, selectedIds, onChange }: PersonPickerProps) {
  const { t, translateName } = useI18n();

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((pid) => pid !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium mb-2">{t('associated_people')}</label>
      <div className="flex flex-wrap gap-2">
        {people.map((person) => {
          const isSelected = selectedIds.includes(person.id);
          return (
            <button
              key={person.id}
              type="button"
              onClick={() => toggle(person.id)}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-full border-2 transition-colors ${
                isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {person.avatar_url ? (
                <img
                  src={person.avatar_url}
                  alt=""
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm">
                  {translateName(person.name).charAt(0)}
                </div>
              )}
              <span className="text-sm">{translateName(person.name)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
