export interface Person {
  id: string;
  name: string;
  role: string;
  avatar_url?: string;
  avatar_url_2?: string; // For combined entries like "Gili & Yossi" - displays second avatar
}

export interface Activity {
  id: string;
  name: string;
  address?: string;
  maps_url?: string;
  contact_phone?: string;
  note?: string;
  name_he?: string;
  note_he?: string;
  address_he?: string;
  is_recurring: boolean;
  recurrence_day?: string; // e.g., "wednesday"
  default_time?: string; // e.g., "17:15"
  created_by?: string;
  icon?: string; // Emoji icon based on activity topic
}

export interface DaySchedule {
  id: string;
  date: string; // ISO date string YYYY-MM-DD
  dropoff_person_id?: string | null;
  gan_activity?: string | null;
  pickup_person_id?: string | null;
  after_gan_activity_id?: string | null;
  after_gan_time?: string | null;
  bedtime_person_id?: string | null;
  is_no_gan: boolean;
  no_gan_reason?: string | null;
  notes?: string | null;
  gan_activity_he?: string | null;
  no_gan_reason_he?: string | null;
  notes_he?: string | null;
  created_by?: string;
  updated_by?: string;
  family_dinner_person_id?: string | null;
  family_dinner_time?: string | null;
}

export interface SaturdayActivity {
  activity_id: string;
  time?: string;
  custom_name?: string; // For one-off activities
  custom_name_he?: string;
}

export interface SaturdaySchedule {
  id: string;
  date: string;
  activities: SaturdayActivity[];
  notes?: string | null;
  notes_he?: string | null;
  activities_he?: SaturdayActivity[];
  created_by?: string;
  updated_by?: string;
  family_dinner_person_id?: string | null;
  family_dinner_time?: string | null;
}

export interface Settings {
  id: string;
  current_theme?: ThemeName;
  theme_randomized_week?: string; // ISO week string
  previous_week_theme?: ThemeName;
}

export type ThemeName = 'bluey' | 'peppa' | 'spiderman' | 'blippi';

export interface Theme {
  name: ThemeName;
  displayName: string;
  emoji: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    gan: string;
    noGan: string;
    saturday: string;
  };
}

export type DayOfWeek = 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';

export interface WeekData {
  startDate: string;
  days: (DaySchedule | null)[];
  saturday: SaturdaySchedule | null;
  lastFriday?: SaturdaySchedule | null;
  fridayIsLastOfMonth?: boolean;
}
