import { format, addDays } from 'date-fns';
import type { Person, Activity } from '../types';

export type ParsedCommand =
  | { type: 'add_activity'; activity: Omit<Activity, 'id'> }
  | { type: 'update_pickups'; assignments: { date: string; person_id: string }[] }
  | { type: 'update_dropoffs'; assignments: { date: string; person_id: string }[] }
  | { type: 'update_bedtimes'; assignments: { date: string; person_id: string }[] }
  | { type: 'set_no_gan'; date: string; reason?: string }
  | { type: 'error'; message: string };

const DAY_NAMES: Record<string, number> = {
  sun: 0, sunday: 0,
  mon: 1, monday: 1,
  tue: 2, tues: 2, tuesday: 2,
  wed: 3, wednesday: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4,
  fri: 5, friday: 5,
  sat: 6, saturday: 6,
};

function findPerson(name: string, people: Person[]): Person | undefined {
  const normalized = name.toLowerCase().trim();

  // Try exact match first
  let person = people.find(p => p.name.toLowerCase() === normalized);
  if (person) return person;

  // Try partial match (e.g., "gili" matches "Gili & Yossi")
  person = people.find(p => p.name.toLowerCase().includes(normalized));
  if (person) return person;

  // Try role match (e.g., "savta" matches Simcha or "Gili & Yossi")
  person = people.find(p => p.role.toLowerCase().includes(normalized));
  if (person) return person;

  // Try "savta gili" style matching
  if (normalized.includes('savta') && normalized.includes('gili')) {
    return people.find(p => p.name.toLowerCase().includes('gili'));
  }
  if (normalized.includes('savta') && normalized.includes('simcha')) {
    return people.find(p => p.name.toLowerCase().includes('simcha'));
  }
  if (normalized === 'savta') {
    return people.find(p => p.name.toLowerCase().includes('simcha'));
  }
  if (normalized === 'saba' || normalized.includes('saba yossi')) {
    return people.find(p => p.name.toLowerCase().includes('yossi'));
  }

  return undefined;
}

function parseTime(timeStr: string): string | undefined {
  // Handle formats: "16:30", "4:30", "4:30pm", "16.30"
  const cleaned = timeStr.toLowerCase().replace('.', ':').replace(/\s/g, '');

  // Match HH:MM or H:MM with optional am/pm
  const match = cleaned.match(/^(\d{1,2}):(\d{2})(?:am|pm)?$/);
  if (!match) return undefined;

  let hours = parseInt(match[1], 10);
  const minutes = match[2];

  // If pm and hours < 12, add 12
  if (cleaned.includes('pm') && hours < 12) {
    hours += 12;
  }
  // If am and hours = 12, set to 0
  if (cleaned.includes('am') && hours === 12) {
    hours = 0;
  }

  return `${hours.toString().padStart(2, '0')}:${minutes}`;
}

function getDateForDay(dayIndex: number, weekStart: Date): string {
  return format(addDays(weekStart, dayIndex), 'yyyy-MM-dd');
}

export function parseScheduleCommand(
  input: string,
  people: Person[],
  _activities: Activity[],
  currentWeekStart: Date
): ParsedCommand {
  const lower = input.toLowerCase().trim();

  // Pattern: "add a weekly after gan event on [day] called [name] at [time] in [location]"
  // or "add [name] on [day]s at [time]"
  const addActivityMatch = lower.match(
    /add\s+(?:a\s+)?(?:weekly\s+)?(?:after\s+gan\s+)?(?:event\s+|activity\s+)?(?:on\s+)?(\w+?)s?\s+called\s+["']?([^"']+?)["']?\s+at\s+(\d{1,2}[:.]\d{2}(?:am|pm)?)\s*(?:in\s+|at\s+)?(.+)?$/i
  );

  if (addActivityMatch) {
    const [, dayName, activityName, time, location] = addActivityMatch;
    const dayIndex = DAY_NAMES[dayName.toLowerCase()];
    const parsedTime = parseTime(time);

    if (dayIndex === undefined) {
      return { type: 'error', message: `Unknown day: ${dayName}` };
    }
    if (!parsedTime) {
      return { type: 'error', message: `Invalid time format: ${time}` };
    }

    const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayIndex];

    return {
      type: 'add_activity',
      activity: {
        name: activityName.trim(),
        address: location?.trim(),
        is_recurring: true,
        recurrence_day: dayOfWeek,
        default_time: parsedTime,
      },
    };
  }

  // Pattern: "here is next week's pickup assignment: sun: person, mon: person, ..."
  // or "[type] assignment: ..."
  const assignmentMatch = lower.match(
    /(?:here\s+is\s+)?(?:next\s+week'?s?\s+)?(?:gan\s+)?(pickup|dropoff|drop-off|bedtime)s?\s+assignment[s:]?\s*[:.]?\s*(.+)/i
  );

  if (assignmentMatch) {
    const [, assignmentType, assignmentsStr] = assignmentMatch;
    const assignments: { date: string; person_id: string }[] = [];

    // Parse "sun: person, mon: person" format
    const parts = assignmentsStr.split(/,\s*|;\s*/);

    for (const part of parts) {
      const [dayPart, personPart] = part.split(':').map(s => s.trim());
      if (!dayPart || !personPart) continue;

      const dayIndex = DAY_NAMES[dayPart.toLowerCase()];
      if (dayIndex === undefined) continue;

      const person = findPerson(personPart, people);
      if (!person) {
        return { type: 'error', message: `Unknown person: ${personPart}` };
      }

      assignments.push({
        date: getDateForDay(dayIndex, currentWeekStart),
        person_id: person.id,
      });
    }

    if (assignments.length === 0) {
      return { type: 'error', message: 'Could not parse any assignments from the input' };
    }

    const type = assignmentType.toLowerCase().replace('-', '');
    if (type === 'pickup') {
      return { type: 'update_pickups', assignments };
    } else if (type === 'dropoff') {
      return { type: 'update_dropoffs', assignments };
    } else {
      return { type: 'update_bedtimes', assignments };
    }
  }

  // Pattern: "set [day] as no gan" or "[day] is no gan"
  const noGanMatch = lower.match(
    /(?:set\s+)?(\w+)\s+(?:as\s+|is\s+)?no\s*gan(?:\s+(?:because|due\s+to|for)\s+(.+))?/i
  );

  if (noGanMatch) {
    const [, dayName, reason] = noGanMatch;
    const dayIndex = DAY_NAMES[dayName.toLowerCase()];

    if (dayIndex === undefined) {
      return { type: 'error', message: `Unknown day: ${dayName}` };
    }

    return {
      type: 'set_no_gan',
      date: getDateForDay(dayIndex, currentWeekStart),
      reason: reason?.trim(),
    };
  }

  return {
    type: 'error',
    message: 'I didn\'t understand that command. Try:\n• "pickup assignment: sun: Asaf, mon: Tamir..."\n• "add weekly event on Mondays called Hip Hop at 16:30 in Gan Meir"\n• "set Friday as no gan"',
  };
}
