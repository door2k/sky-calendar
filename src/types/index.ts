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
  dropoff_person_id?: string;
  gan_activity?: string;
  pickup_person_id?: string;
  after_gan_activity_id?: string;
  after_gan_time?: string;
  bedtime_person_id?: string;
  is_no_gan: boolean;
  no_gan_reason?: string;
  notes?: string;
  gan_activity_he?: string;
  no_gan_reason_he?: string;
  notes_he?: string;
  created_by?: string;
  updated_by?: string;
  family_dinner_person_id?: string; // For Friday family dinner
  family_dinner_time?: string; // Default "16:00"
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
  notes?: string;
  notes_he?: string;
  activities_he?: SaturdayActivity[];
  created_by?: string;
  updated_by?: string;
  family_dinner_person_id?: string; // For last Friday family dinner
  family_dinner_time?: string; // Default "16:00"
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
