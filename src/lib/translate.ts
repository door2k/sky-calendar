import type { SaturdayActivity } from '../types';

export async function translateFields(
  fields: Record<string, string>
): Promise<Record<string, string>> {
  try {
    const nonEmpty = Object.fromEntries(
      Object.entries(fields).filter(([, v]) => v && v.trim())
    );
    if (Object.keys(nonEmpty).length === 0) return {};

    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: nonEmpty }),
    });

    if (!res.ok) throw new Error(`Translation API returned ${res.status}`);

    const { translations } = await res.json();
    return translations || {};
  } catch (err) {
    console.error('Translation failed:', err);
    return {};
  }
}

export async function translateSaturdayActivities(
  activities: SaturdayActivity[]
): Promise<SaturdayActivity[]> {
  const customNames: Record<string, string> = {};
  activities.forEach((act, idx) => {
    if (act.custom_name) {
      customNames[`act_${idx}`] = act.custom_name;
    }
  });

  if (Object.keys(customNames).length === 0) return activities;

  const translations = await translateFields(customNames);

  return activities.map((act, idx) => {
    const key = `act_${idx}`;
    if (translations[key]) {
      return { ...act, custom_name_he: translations[key] };
    }
    return act;
  });
}
