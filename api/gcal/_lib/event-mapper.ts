import { computeHash } from './hash.js';

const TIMEZONE = 'Asia/Jerusalem';

// Google Calendar color IDs
const COLOR = {
  blueberry: '9',   // dropoff
  sage: '2',        // gan activity
  tangerine: '6',   // pickup
  grape: '3',       // after-gan / saturday activity
  tomato: '11',     // no-gan
} as const;

interface Person {
  id: string;
  name: string;
}

interface Activity {
  id: string;
  name: string;
  is_recurring?: boolean;
  recurrence_day?: string;
  default_time?: string;
  icon?: string;
}

interface DaySchedule {
  date: string;
  dropoff_person_id?: string;
  gan_activity?: string;
  pickup_person_id?: string;
  after_gan_activity_id?: string;
  after_gan_time?: string;
  bedtime_person_id?: string;
  is_no_gan: boolean;
  no_gan_reason?: string;
}

interface SaturdayActivity {
  activity_id: string;
  time?: string;
  custom_name?: string;
}

interface SaturdaySchedule {
  date: string;
  activities: SaturdayActivity[];
}

export interface GCalEventSpec {
  eventType: string;
  eventIndex: number;
  summary: string;
  colorId: string;
  startDateTime?: string;  // ISO for timed events
  endDateTime?: string;
  startDate?: string;      // YYYY-MM-DD for all-day events
  endDate?: string;
  description?: string;
  hash: string;
  extendedProperties: {
    private: Record<string, string>;
  };
}

function toISO(date: string, time: string): string {
  return `${date}T${time}:00`;
}

function addMinutes(date: string, time: string, minutes: number): string {
  const d = new Date(`${date}T${time}:00`);
  d.setMinutes(d.getMinutes() + minutes);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${date}T${h}:${m}:00`;
}

function addHours(date: string, time: string, hours: number): string {
  return addMinutes(date, time, hours * 60);
}

function makeExtProps(table: string, date: string, type: string, index: number) {
  return {
    private: {
      sky_source: 'sky-calendar',
      sky_table: table,
      sky_date: date,
      sky_type: type,
      sky_index: String(index),
    },
  };
}

function personName(id: string | undefined, people: Person[]): string {
  if (!id) return '';
  return people.find(p => p.id === id)?.name ?? '';
}

function activityName(id: string | undefined, activities: Activity[]): string {
  if (!id) return '';
  return activities.find(a => a.id === id)?.name ?? '';
}

export function mapDayScheduleToEvents(
  schedule: DaySchedule,
  people: Person[],
  activities: Activity[],
): GCalEventSpec[] {
  const events: GCalEventSpec[] = [];
  const date = schedule.date;
  const table = 'day_schedules';

  // No-Gan: all-day event
  if (schedule.is_no_gan) {
    const reason = schedule.no_gan_reason || 'No Gan';
    const hashData = { type: 'no_gan', date, reason };
    // All-day event: endDate is the NEXT day
    const nextDay = new Date(date + 'T00:00:00');
    nextDay.setDate(nextDay.getDate() + 1);
    const endDate = nextDay.toISOString().split('T')[0];

    events.push({
      eventType: 'no_gan',
      eventIndex: 0,
      summary: `❌ No Gan — ${reason}`,
      colorId: COLOR.tomato,
      startDate: date,
      endDate,
      hash: computeHash(hashData),
      extendedProperties: makeExtProps(table, date, 'no_gan', 0),
    });
  }

  // Dropoff
  if (schedule.dropoff_person_id) {
    const name = personName(schedule.dropoff_person_id, people);
    const hashData = { type: 'dropoff', date, person: schedule.dropoff_person_id };
    events.push({
      eventType: 'dropoff',
      eventIndex: 0,
      summary: `🌅 Dropoff — ${name}`,
      colorId: COLOR.blueberry,
      startDateTime: toISO(date, '07:30'),
      endDateTime: addMinutes(date, '07:30', 30),
      hash: computeHash(hashData),
      extendedProperties: makeExtProps(table, date, 'dropoff', 0),
    });
  }

  // Gan Activity
  if (schedule.gan_activity && !schedule.is_no_gan) {
    const hashData = { type: 'gan_activity', date, activity: schedule.gan_activity };
    events.push({
      eventType: 'gan_activity',
      eventIndex: 0,
      summary: `🏫 Gan — ${schedule.gan_activity}`,
      colorId: COLOR.sage,
      startDateTime: toISO(date, '08:00'),
      endDateTime: addHours(date, '08:00', 5),
      hash: computeHash(hashData),
      extendedProperties: makeExtProps(table, date, 'gan_activity', 0),
    });
  }

  // Pickup
  if (schedule.pickup_person_id) {
    const name = personName(schedule.pickup_person_id, people);
    const pickupTime = schedule.after_gan_time || '16:00';
    const hashData = { type: 'pickup', date, person: schedule.pickup_person_id, time: pickupTime };
    events.push({
      eventType: 'pickup',
      eventIndex: 0,
      summary: `🌆 Pickup — ${name}`,
      colorId: COLOR.tangerine,
      startDateTime: toISO(date, pickupTime),
      endDateTime: addMinutes(date, pickupTime, 30),
      hash: computeHash(hashData),
      extendedProperties: makeExtProps(table, date, 'pickup', 0),
    });
  }

  // After-Gan Activity
  if (schedule.after_gan_activity_id) {
    const name = activityName(schedule.after_gan_activity_id, activities);
    const actTime = schedule.after_gan_time || '16:30';
    const hashData = { type: 'after_gan', date, activity: schedule.after_gan_activity_id, time: actTime };
    events.push({
      eventType: 'after_gan',
      eventIndex: 0,
      summary: `🥋 ${name}`,
      colorId: COLOR.grape,
      startDateTime: toISO(date, actTime),
      endDateTime: addHours(date, actTime, 1),
      hash: computeHash(hashData),
      extendedProperties: makeExtProps(table, date, 'after_gan', 0),
    });
  }

  // Recurring activities for this day of the week
  const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayOfWeek = new Date(date + 'T00:00:00').getDay();
  const dayName = DAY_NAMES[dayOfWeek];
  const recurringForDay = activities.filter(
    a => a.is_recurring && a.recurrence_day?.toLowerCase() === dayName
      && a.id !== schedule.after_gan_activity_id, // skip if already explicitly assigned
  );

  recurringForDay.forEach((act, index) => {
    const actTime = act.default_time || '16:30';
    const icon = act.icon || '🔁';
    const hashData = { type: 'recurring_activity', date, activity: act.id, time: actTime };
    events.push({
      eventType: 'recurring_activity',
      eventIndex: index,
      summary: `${icon} ${act.name}`,
      colorId: COLOR.grape,
      startDateTime: toISO(date, actTime),
      endDateTime: addHours(date, actTime, 1),
      hash: computeHash(hashData),
      extendedProperties: makeExtProps(table, date, 'recurring_activity', index),
    });
  });

  return events;
}

export function mapSaturdayScheduleToEvents(
  schedule: SaturdaySchedule,
  activities: Activity[],
): GCalEventSpec[] {
  const events: GCalEventSpec[] = [];
  const date = schedule.date;
  const table = 'saturday_schedules';

  if (!schedule.activities || schedule.activities.length === 0) return events;

  schedule.activities.forEach((act, index) => {
    const name = act.custom_name || activityName(act.activity_id, activities);
    const time = act.time || '10:00';
    const hashData = { type: 'saturday_activity', date, activity_id: act.activity_id, time, index };
    events.push({
      eventType: 'saturday_activity',
      eventIndex: index,
      summary: `🎯 ${name}`,
      colorId: COLOR.grape,
      startDateTime: toISO(date, time),
      endDateTime: addHours(date, time, 1),
      hash: computeHash(hashData),
      extendedProperties: makeExtProps(table, date, 'saturday_activity', index),
    });
  });

  return events;
}

export function toGoogleEvent(spec: GCalEventSpec) {
  const event: Record<string, unknown> = {
    summary: spec.summary,
    colorId: spec.colorId,
    extendedProperties: spec.extendedProperties,
  };

  if (spec.startDateTime) {
    event.start = { dateTime: spec.startDateTime, timeZone: TIMEZONE };
    event.end = { dateTime: spec.endDateTime, timeZone: TIMEZONE };
  } else if (spec.startDate) {
    event.start = { date: spec.startDate };
    event.end = { date: spec.endDate };
  }

  if (spec.description) {
    event.description = spec.description;
  }

  return event;
}
