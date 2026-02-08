import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'edge' };

const DAY_ICAL: Record<string, string> = {
  sunday: 'SU',
  monday: 'MO',
  tuesday: 'TU',
  wednesday: 'WE',
  thursday: 'TH',
  friday: 'FR',
  saturday: 'SA',
};

const DAY_NUM: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
};

function escapeICS(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function formatICSDate(dateStr: string, timeStr?: string | null): string {
  const [y, m, d] = dateStr.split('-');
  if (timeStr) {
    const [h, min] = timeStr.split(':');
    return `${y}${m}${d}T${h.padStart(2, '0')}${min.padStart(2, '0')}00`;
  }
  return `${y}${m}${d}T160000`;
}

function formatICSEndDate(dateStr: string, timeStr?: string | null): string {
  const [y, m, d] = dateStr.split('-');
  if (timeStr) {
    const [h, min] = timeStr.split(':');
    const hour = (parseInt(h) + 1) % 24;
    return `${y}${m}${d}T${String(hour).padStart(2, '0')}${min.padStart(2, '0')}00`;
  }
  return `${y}${m}${d}T170000`;
}

/** Find the first occurrence of a given weekday on or after 2025-09-01 */
function getFirstOccurrence(dayName: string): string {
  const start = new Date(2025, 8, 1); // Sep 1, 2025
  const targetDay = DAY_NUM[dayName.toLowerCase()];
  if (targetDay === undefined) return '2025-09-01';
  const diff = (targetDay - start.getDay() + 7) % 7;
  const first = new Date(start);
  first.setDate(first.getDate() + diff);
  const y = first.getFullYear();
  const m = String(first.getMonth() + 1).padStart(2, '0');
  const d = String(first.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

interface Activity {
  id: string;
  name: string;
  icon?: string;
  address?: string;
  note?: string;
  is_recurring: boolean;
  recurrence_day?: string;
  default_time?: string;
}

interface DaySchedule {
  date: string;
  after_gan_activity_id?: string;
  after_gan_time?: string;
}

interface SaturdaySchedule {
  date: string;
  activities?: { activity_id: string; time?: string; custom_name?: string }[];
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return new Response('Server configuration error', { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const [activitiesRes, daySchedulesRes, satSchedulesRes] = await Promise.all([
    supabase.from('activities').select('*'),
    supabase.from('day_schedules').select('date, after_gan_activity_id, after_gan_time').not('after_gan_activity_id', 'is', null),
    supabase.from('saturday_schedules').select('date, activities'),
  ]);

  if (activitiesRes.error) return new Response(`DB error: ${activitiesRes.error.message}`, { status: 500 });
  if (daySchedulesRes.error) return new Response(`DB error: ${daySchedulesRes.error.message}`, { status: 500 });
  if (satSchedulesRes.error) return new Response(`DB error: ${satSchedulesRes.error.message}`, { status: 500 });

  const activities: Activity[] = activitiesRes.data || [];
  const daySchedules: DaySchedule[] = daySchedulesRes.data || [];
  const satSchedules: SaturdaySchedule[] = satSchedulesRes.data || [];

  const activityMap = new Map(activities.map(a => [a.id, a]));
  const events: string[] = [];

  // 1. Recurring activities → weekly RRULE events
  for (const activity of activities) {
    if (!activity.is_recurring || !activity.recurrence_day) continue;

    const dayCode = DAY_ICAL[activity.recurrence_day.toLowerCase()];
    if (!dayCode) continue;

    const firstDate = getFirstOccurrence(activity.recurrence_day);
    const dtStart = formatICSDate(firstDate, activity.default_time);
    const dtEnd = formatICSEndDate(firstDate, activity.default_time);
    const summary = `${activity.icon || '🎯'} ${activity.name}`;

    const lines = [
      'BEGIN:VEVENT',
      `UID:recurring-${activity.id}@sky-calendar`,
      `DTSTART;TZID=Asia/Jerusalem:${dtStart}`,
      `DTEND;TZID=Asia/Jerusalem:${dtEnd}`,
      `RRULE:FREQ=WEEKLY;BYDAY=${dayCode}`,
      `SUMMARY:${escapeICS(summary)}`,
    ];
    if (activity.address) lines.push(`LOCATION:${escapeICS(activity.address)}`);
    if (activity.note) lines.push(`DESCRIPTION:${escapeICS(activity.note)}`);
    lines.push('END:VEVENT');
    events.push(lines.join('\r\n'));
  }

  // 2. Explicitly scheduled weekday after-gan activities (one-time)
  for (const schedule of daySchedules) {
    const activity = activityMap.get(schedule.after_gan_activity_id!);
    if (!activity) continue;

    // Skip if this activity already recurs on this same day of week (RRULE covers it)
    if (activity.is_recurring && activity.recurrence_day) {
      const dayOfWeek = new Date(schedule.date + 'T12:00:00').getDay();
      const recurringDay = DAY_NUM[activity.recurrence_day.toLowerCase()];
      if (dayOfWeek === recurringDay) continue;
    }

    const time = schedule.after_gan_time || activity.default_time;
    const dtStart = formatICSDate(schedule.date, time);
    const dtEnd = formatICSEndDate(schedule.date, time);
    const summary = `${activity.icon || '🎯'} ${activity.name}`;

    const lines = [
      'BEGIN:VEVENT',
      `UID:day-${schedule.date}-${activity.id}@sky-calendar`,
      `DTSTART;TZID=Asia/Jerusalem:${dtStart}`,
      `DTEND;TZID=Asia/Jerusalem:${dtEnd}`,
      `SUMMARY:${escapeICS(summary)}`,
    ];
    if (activity.address) lines.push(`LOCATION:${escapeICS(activity.address)}`);
    lines.push('END:VEVENT');
    events.push(lines.join('\r\n'));
  }

  // 3. Saturday activities
  for (const schedule of satSchedules) {
    const satActivities = schedule.activities || [];
    for (const act of satActivities) {
      const activity = activityMap.get(act.activity_id);
      const name = act.custom_name || activity?.name || 'Activity';
      const icon = activity?.icon || '🎯';
      const time = act.time || activity?.default_time;
      const dtStart = formatICSDate(schedule.date, time);
      const dtEnd = formatICSEndDate(schedule.date, time);

      const lines = [
        'BEGIN:VEVENT',
        `UID:sat-${schedule.date}-${act.activity_id}@sky-calendar`,
        `DTSTART;TZID=Asia/Jerusalem:${dtStart}`,
        `DTEND;TZID=Asia/Jerusalem:${dtEnd}`,
        `SUMMARY:${escapeICS(`${icon} ${name}`)}`,
      ];
      if (activity?.address) lines.push(`LOCATION:${escapeICS(activity.address)}`);
      lines.push('END:VEVENT');
      events.push(lines.join('\r\n'));
    }
  }

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Sky Calendar//sky-calendar.vercel.app//EN',
    "X-WR-CALNAME:Sky's Schedule",
    'X-WR-TIMEZONE:Asia/Jerusalem',
    'BEGIN:VTIMEZONE',
    'TZID:Asia/Jerusalem',
    'BEGIN:STANDARD',
    'DTSTART:19701025T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
    'TZOFFSETFROM:+0300',
    'TZOFFSETTO:+0200',
    'TZNAME:IST',
    'END:STANDARD',
    'BEGIN:DAYLIGHT',
    'DTSTART:19700329T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1FR',
    'TZOFFSETFROM:+0200',
    'TZOFFSETTO:+0300',
    'TZNAME:IDT',
    'END:DAYLIGHT',
    'END:VTIMEZONE',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');

  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="sky-schedule.ics"',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
