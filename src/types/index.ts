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
  is_recurring: boolean;
  recurrence_day?: string; // e.g., "wednesday"
  default_time?: string; // e.g., "17:15"
  created_by?: string;
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
  created_by?: string;
  updated_by?: string;
}

export interface SaturdayActivity {
  activity_id: string;
  time?: string;
  custom_name?: string; // For one-off activities
}

export interface SaturdaySchedule {
  id: string;
  date: string;
  activities: SaturdayActivity[];
  notes?: string;
  created_by?: string;
  updated_by?: string;
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
}
