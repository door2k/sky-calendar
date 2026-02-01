import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { format as dateFnsFormat } from 'date-fns';

export type Language = 'en' | 'he';

const translations = {
  en: {
    // WeekView
    'skys_week': "Sky's Week",
    'today': 'Today',
    'previous_week': 'Previous Week',
    'next_week': 'Next Week',
    'this_week': 'This Week',
    'month_view': 'Month View',
    'week_view': 'Week View',
    'print_dropdown': 'Print ▾',
    'week_only': 'Week Only',
    'week_plus_month': 'Week + Month',
    'print': 'Print',

    // MonthView
    'skys_month': "Sky's Month",

    // Legend
    'gan_activity': 'Gan Activity',
    'after_gan_activity': 'After-Gan Activity',
    'recurring': 'Recurring',
    'no_gan_holiday': 'No Gan / Holiday',
    'saturday_last_friday': 'Saturday / Last Friday',

    // DayCard
    'last_friday_no_gan': 'Last Friday - No Gan',
    'no_gan': 'NO GAN',
    'no_activities_planned': 'No activities planned',
    'activity': 'Activity',
    'family_dinner': 'Family Dinner',
    'not_assigned': 'Not assigned',

    // EditDayModal
    'edit': 'Edit',
    'dropoff': 'Drop-off',
    'pickup': 'Pickup',
    'bedtime': 'Bedtime',
    'no_gan_this_day': 'No Gan this day',
    'notes': 'Notes',
    'whos_updating': "Who's updating this?",
    'select_person': 'Select person...',
    'select_person_optional': 'Select person (optional)...',
    'select_reason': 'Select reason...',
    'activities': 'Activities',
    'add_activity': '+ Add activity',
    'last_friday_no_gan_long': 'Last Friday of the month - No Gan',
    'whos_hosting': "Who's hosting?",
    'dinner_time': 'Dinner time',
    'cancel': 'Cancel',
    'save': 'Save',
    'saving': 'Saving...',
    'gan_activity_placeholder': 'e.g., Music, Art, Sports',
    'time_placeholder': 'Time (e.g., 17:15)',
    'notes_placeholder': 'Any notes for this day...',
    'type_activity_name': 'Type activity name...',
    'new_activity_created': 'New activity "{name}" will be created on save',

    // No Gan Reasons
    'reason_holiday': 'Holiday',
    'reason_staff_training': 'Staff Training',
    'reason_last_friday': 'Last Friday',
    'reason_other': 'Other',

    // ActivityPopup
    'open_in_maps': 'Open in Google Maps',
    'no_address': 'No address',
    'no_phone': 'No phone',
    'no_default_time': 'No default time',
    'no_notes': 'No notes',
    'every': 'Every',
    'at': 'at',
    'edit_activity': 'Edit Activity',
    'address': 'Address',
    'google_maps_url': 'Google Maps URL',
    'contact_phone': 'Contact phone',

    // AddActivityModal
    'add_new_activity': 'Add New Activity',
    'name': 'Name',
    'activity_name': 'Activity name',
    'address_auto_maps': 'Address (auto-generates Google Maps link)',
    'phone_number': 'Phone number',
    'any_notes_activity': 'Any notes about this activity...',
    'recurring_activity': 'Recurring activity',
    'day_of_week': 'Day of Week',
    'select_day': 'Select day...',
    'default_time': 'Default Time',
    'whos_adding': "Who's adding this?",

    // Days of week
    'sunday': 'Sunday',
    'monday': 'Monday',
    'tuesday': 'Tuesday',
    'wednesday': 'Wednesday',
    'thursday': 'Thursday',
    'friday': 'Friday',
    'saturday': 'Saturday',

    // Days short
    'sun': 'SUN',
    'mon': 'MON',
    'tue': 'TUE',
    'wed': 'WED',
    'thu': 'THU',
    'fri': 'FRI',
    'sat': 'SAT',

    // AI Assistant
    'schedule_assistant': 'Schedule Assistant',
    'ai_greeting': 'Hi! I\'m Sky\'s schedule assistant. Just tell me what you need in plain language, like:\n\n"Set Tamir for pickup on Monday and Tuesday"\n"Add a hip hop class on Mondays at 4:30pm in Gan Meir"\n"Mark Friday as no gan because of a holiday"',
    'listening': 'Listening...',
    'tell_me_what_you_need': 'Tell me what you need...',
    'thinking': 'Thinking...',
    'close_assistant': 'Close assistant',
    'open_assistant': 'Open assistant',
    'stop_listening': 'Stop listening',
    'start_voice_input': 'Start voice input',

    // PeopleEditor
    'people_editor': 'People Editor',
    'manage_caregivers': 'Manage caregivers and their avatars',
    'add_person': '+ Add Person',
    'new_person': 'New Person',
    'role': 'Role',
    'avatar': 'Avatar',
    'second_avatar': 'Second Avatar',
    'second_avatar_hint': '(for entries like "Gili & Yossi")',
    'image_url_placeholder': 'Image URL or upload below',
    'no_image': 'No image',
    'upload_image': 'Upload Image',
    'uploading': 'Uploading...',
    'remove': 'Remove',
    'delete': 'Delete',
    'name_placeholder': 'e.g., Asaf, Gili & Yossi',
    'role_placeholder': 'e.g., Aba, Savta, Babysitter',
    'person_created': 'Person created!',
    'changes_saved': 'Changes saved!',
    'person_deleted': 'Person deleted!',
    'image_uploaded': 'Image uploaded! Click Save to keep changes.',
    'confirm_delete': 'Are you sure you want to delete this person?',
    'loading': 'Loading...',
    'no_people_yet': 'No people yet. Click "Add Person" to create one.',
    'tip_dual_avatar': 'Tip: For entries like "Gili & Yossi" that represent two people, use the "Second Avatar" field to show both photos side by side.',

    // Print views
    'skys_awesome_week': "SKY'S AWESOME WEEK!",
    'skys_adventure_month': "SKY'S ADVENTURE MONTH!",
    'skys_schedule': "SKY'S SCHEDULE",
    'week_of': 'Week of',
    'no_gan_banner': '🏠 NO GAN! 🏠',
    'last_friday_of_month': 'Last Friday of the Month!',
    'rest_and_relax': 'Rest & relax day!',
    'rest_day': 'Rest day!',
    'where_to_go_week': 'Where to go this week:',
    'where_to_go': 'Where to go:',
    'this_months_adventures': "This Month's Adventures:",
    'made_with_love': 'Made with 💜 for Sky',
    'back': '← Back',
    'tbd': 'TBD',
    'last_fri_short': 'LAST FRI',
    'no_gan_short': 'NO GAN',
    'last_friday_label': 'Last Friday!',
    'holiday_label': '🎉 HOLIDAY',

    // People name translations (display mapping)
    'person_asaf': 'Asaf',
    'person_tamir': 'Tamir',
    'person_gili_yossi': 'Gili & Yossi',
    'person_simcha': 'Simcha',
    'person_maya': 'Maya',

    // Role translations
    'role_aba': 'Aba',
    'role_savta_saba': 'Savta & Saba',
    'role_savta': 'Savta',
    'role_babysitter': 'Babysitter',

    // Language toggle
    'language': 'עב',
  },
  he: {
    // WeekView
    'skys_week': 'השבוע של סקיי',
    'today': 'היום',
    'previous_week': 'שבוע קודם',
    'next_week': 'שבוע הבא',
    'this_week': 'השבוע',
    'month_view': 'תצוגת חודש',
    'week_view': 'תצוגת שבוע',
    'print_dropdown': 'הדפסה ▾',
    'week_only': 'שבוע בלבד',
    'week_plus_month': 'שבוע + חודש',
    'print': 'הדפסה',

    // MonthView
    'skys_month': 'החודש של סקיי',

    // Legend
    'gan_activity': 'פעילות בגן',
    'after_gan_activity': 'חוג אחרי הגן',
    'recurring': 'חוזר',
    'no_gan_holiday': 'אין גן / חג',
    'saturday_last_friday': 'שבת / שישי אחרון',

    // DayCard
    'last_friday_no_gan': 'שישי אחרון - אין גן',
    'no_gan': 'אין גן',
    'no_activities_planned': 'אין פעילויות מתוכננות',
    'activity': 'פעילות',
    'family_dinner': 'ארוחת משפחתית',
    'not_assigned': 'לא שובץ',

    // EditDayModal
    'edit': 'עריכת',
    'dropoff': 'הורדה',
    'pickup': 'איסוף',
    'bedtime': 'שינה',
    'no_gan_this_day': 'אין גן ביום הזה',
    'notes': 'הערות',
    'whos_updating': 'מי מעדכן?',
    'select_person': 'בחירת אדם...',
    'select_person_optional': 'בחירת אדם (אופציונלי)...',
    'select_reason': 'בחירת סיבה...',
    'activities': 'פעילויות',
    'add_activity': '+ הוספת פעילות',
    'last_friday_no_gan_long': 'שישי אחרון של החודש - אין גן',
    'whos_hosting': 'מי מארח?',
    'dinner_time': 'שעת ארוחה',
    'cancel': 'ביטול',
    'save': 'שמירה',
    'saving': 'שומר...',
    'gan_activity_placeholder': 'למשל: מוזיקה, אומנות, ספורט',
    'time_placeholder': 'שעה (למשל: 17:15)',
    'notes_placeholder': 'הערות ליום הזה...',
    'type_activity_name': 'שם פעילות...',
    'new_activity_created': 'פעילות חדשה "{name}" תיווצר בשמירה',

    // No Gan Reasons
    'reason_holiday': 'חג',
    'reason_staff_training': 'השתלמות צוות',
    'reason_last_friday': 'שישי אחרון',
    'reason_other': 'אחר',

    // ActivityPopup
    'open_in_maps': 'פתיחה בגוגל מפות',
    'no_address': 'אין כתובת',
    'no_phone': 'אין טלפון',
    'no_default_time': 'אין שעה ברירת מחדל',
    'no_notes': 'אין הערות',
    'every': 'כל',
    'at': 'ב',
    'edit_activity': 'עריכת פעילות',
    'address': 'כתובת',
    'google_maps_url': 'קישור גוגל מפות',
    'contact_phone': 'טלפון ליצירת קשר',

    // AddActivityModal
    'add_new_activity': 'הוספת פעילות חדשה',
    'name': 'שם',
    'activity_name': 'שם הפעילות',
    'address_auto_maps': 'כתובת (מייצרת קישור גוגל מפות אוטומטית)',
    'phone_number': 'מספר טלפון',
    'any_notes_activity': 'הערות על הפעילות...',
    'recurring_activity': 'פעילות חוזרת',
    'day_of_week': 'יום בשבוע',
    'select_day': 'בחירת יום...',
    'default_time': 'שעת ברירת מחדל',
    'whos_adding': 'מי מוסיף?',

    // Days of week
    'sunday': 'ראשון',
    'monday': 'שני',
    'tuesday': 'שלישי',
    'wednesday': 'רביעי',
    'thursday': 'חמישי',
    'friday': 'שישי',
    'saturday': 'שבת',

    // Days short
    'sun': 'א׳',
    'mon': 'ב׳',
    'tue': 'ג׳',
    'wed': 'ד׳',
    'thu': 'ה׳',
    'fri': 'ו׳',
    'sat': 'ש׳',

    // AI Assistant
    'schedule_assistant': 'עוזר לוח זמנים',
    'ai_greeting': 'שלום! אני העוזר של סקיי ללוח הזמנים. ספר/י לי מה צריך בשפה פשוטה, למשל:\n\n"תקבע את טמיר לאיסוף ביום שני ושלישי"\n"תוסיף חוג היפ הופ בימי שני ב-16:30 בגן מאיר"\n"תסמן שישי בלי גן בגלל חג"',
    'listening': 'מקשיב...',
    'tell_me_what_you_need': 'ספר/י לי מה צריך...',
    'thinking': 'חושב...',
    'close_assistant': 'סגירת עוזר',
    'open_assistant': 'פתיחת עוזר',
    'stop_listening': 'הפסקת האזנה',
    'start_voice_input': 'קלט קולי',

    // PeopleEditor
    'people_editor': 'עורך אנשים',
    'manage_caregivers': 'ניהול מטפלים והתמונות שלהם',
    'add_person': '+ הוספת אדם',
    'new_person': 'אדם חדש',
    'role': 'תפקיד',
    'avatar': 'תמונה',
    'second_avatar': 'תמונה שנייה',
    'second_avatar_hint': '(לרשומות כמו "גילי ויוסי")',
    'image_url_placeholder': 'קישור לתמונה או העלאה למטה',
    'no_image': 'אין תמונה',
    'upload_image': 'העלאת תמונה',
    'uploading': 'מעלה...',
    'remove': 'הסרה',
    'delete': 'מחיקה',
    'name_placeholder': 'למשל: אסף, גילי ויוסי',
    'role_placeholder': 'למשל: אבא, סבתא, בייביסיטר',
    'person_created': 'נוצר בהצלחה!',
    'changes_saved': 'השינויים נשמרו!',
    'person_deleted': 'נמחק בהצלחה!',
    'image_uploaded': 'התמונה הועלתה! לחצו שמירה לשמור.',
    'confirm_delete': 'האם למחוק את האדם הזה?',
    'loading': 'טוען...',
    'no_people_yet': 'אין אנשים עדיין. לחצו "הוספת אדם" ליצירה.',
    'tip_dual_avatar': 'טיפ: לרשומות כמו "גילי ויוסי" שמייצגות שני אנשים, השתמשו בשדה "תמונה שנייה" כדי להציג את שתי התמונות זו לצד זו.',

    // Print views
    'skys_awesome_week': 'השבוע המדהים של סקיי!',
    'skys_adventure_month': 'חודש ההרפתקאות של סקיי!',
    'skys_schedule': 'לוח הזמנים של סקיי',
    'week_of': 'שבוע של',
    'no_gan_banner': '🏠 !אין גן 🏠',
    'last_friday_of_month': 'שישי אחרון של החודש!',
    'rest_and_relax': 'יום מנוחה!',
    'rest_day': 'יום מנוחה!',
    'where_to_go_week': 'לאן הולכים השבוע:',
    'where_to_go': 'לאן הולכים:',
    'this_months_adventures': 'ההרפתקאות של החודש:',
    'made_with_love': 'נעשה עם 💜 בשביל סקיי',
    'back': 'חזרה ←',
    'tbd': 'טרם נקבע',
    'last_fri_short': 'שישי אחרון',
    'no_gan_short': 'אין גן',
    'last_friday_label': 'שישי אחרון!',
    'holiday_label': '🎉 חג',

    // People name translations
    'person_asaf': 'אסף',
    'person_tamir': 'טמיר',
    'person_gili_yossi': 'גילי ויוסי',
    'person_simcha': 'שמחה',
    'person_maya': 'מאיה',

    // Role translations
    'role_aba': 'אבא',
    'role_savta_saba': 'סבתא וסבא',
    'role_savta': 'סבתא',
    'role_babysitter': 'בייביסיטר',

    // Language toggle
    'language': 'EN',
  },
} as const;

// Name translation map (English → Hebrew)
const NAME_MAP_HE: Record<string, string> = {
  'Asaf': 'אסף',
  'Tamir': 'טמיר',
  'Gili & Yossi': 'גילי ויוסי',
  'Simcha': 'שמחה',
  'Maya': 'מאיה',
};

// Role translation map (English → Hebrew)
const ROLE_MAP_HE: Record<string, string> = {
  'Aba': 'אבא',
  'Savta & Saba': 'סבתא וסבא',
  'Savta': 'סבתא',
  'Saba': 'סבא',
  'Babysitter': 'בייביסיטר',
};

// No Gan reason map for translation
const REASON_MAP_EN_TO_HE: Record<string, string> = {
  'Holiday': 'חג',
  'Staff Training': 'השתלמות צוות',
  'Last Friday': 'שישי אחרון',
  'Other': 'אחר',
};

// Activity name translation map (English → Hebrew)
const ACTIVITY_MAP_HE: Record<string, string> = {
  'Music': 'מוזיקה',
  'Art': 'אומנות',
  'Sports': 'ספורט',
  'Hip Hop': 'היפ הופ',
  'Swimming': 'שחייה',
  'Ballet': 'בלט',
  'Gymnastics': 'התעמלות',
  'Soccer': 'כדורגל',
  'Tennis': 'טניס',
  'Yoga': 'יוגה',
  'Drama': 'דרמה',
  'Dance': 'ריקוד',
  'Cooking': 'בישול',
  'Karate': 'קראטה',
  'Judo': 'ג׳ודו',
  'Basketball': 'כדורסל',
  'Piano': 'פסנתר',
  'Guitar': 'גיטרה',
  'Painting': 'ציור',
  'Chess': 'שחמט',
  'Ninja': 'נינג׳ה',
  'Bats': 'עטלפים',
  'Circus': 'קרקס',
  'Trampoline': 'טרמפולינה',
  'Climbing': 'טיפוס',
  'Martial Arts': 'אומנויות לחימה',
};

// Day name translation map (for recurrence_day display)
const DAY_NAME_MAP_HE: Record<string, string> = {
  'sunday': 'ראשון',
  'monday': 'שני',
  'tuesday': 'שלישי',
  'wednesday': 'רביעי',
  'thursday': 'חמישי',
  'friday': 'שישי',
  'saturday': 'שבת',
  'Sunday': 'ראשון',
  'Monday': 'שני',
  'Tuesday': 'שלישי',
  'Wednesday': 'רביעי',
  'Thursday': 'חמישי',
  'Friday': 'שישי',
  'Saturday': 'שבת',
};

export type TranslationKey = keyof typeof translations.en;

interface I18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: TranslationKey) => string;
  isRTL: boolean;
  translateName: (name: string) => string;
  translateRole: (role: string) => string;
  translateReason: (reason: string) => string;
  translateActivity: (name: string) => string;
  translateDayName: (day: string) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

const LANG_STORAGE_KEY = 'sky-calendar-lang';

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    return (stored === 'he' || stored === 'en') ? stored : 'en';
  });

  const setLang = useCallback((newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem(LANG_STORAGE_KEY, newLang);
  }, []);

  const t = useCallback((key: TranslationKey): string => {
    return translations[lang][key] || translations.en[key] || key;
  }, [lang]);

  const isRTL = lang === 'he';

  const translateName = useCallback((name: string): string => {
    if (lang === 'en') return name;
    return NAME_MAP_HE[name] || name;
  }, [lang]);

  const translateRole = useCallback((role: string): string => {
    if (lang === 'en') return role;
    return ROLE_MAP_HE[role] || role;
  }, [lang]);

  const translateReason = useCallback((reason: string): string => {
    if (lang === 'en') return reason;
    return REASON_MAP_EN_TO_HE[reason] || reason;
  }, [lang]);

  const translateActivity = useCallback((name: string): string => {
    if (lang === 'en') return name;
    const trimmed = name.trim();
    if (ACTIVITY_MAP_HE[trimmed]) return ACTIVITY_MAP_HE[trimmed];
    // Case-insensitive exact match
    const key = Object.keys(ACTIVITY_MAP_HE).find(k => k.toLowerCase() === trimmed.toLowerCase());
    if (key) return ACTIVITY_MAP_HE[key];
    // Partial match: if the name contains a known activity as a word (e.g. "Ninja class" → "נינג׳ה")
    const lower = trimmed.toLowerCase();
    const partialKey = Object.keys(ACTIVITY_MAP_HE)
      .sort((a, b) => b.length - a.length) // longest match first
      .find(k => lower.includes(k.toLowerCase()));
    if (partialKey) return ACTIVITY_MAP_HE[partialKey];
    return name;
  }, [lang]);

  const translateDayName = useCallback((day: string): string => {
    if (lang === 'en') return day;
    return DAY_NAME_MAP_HE[day] || day;
  }, [lang]);

  // Set document direction
  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang, isRTL]);

  return (
    <I18nContext.Provider value={{ lang, setLang, t, isRTL, translateName, translateRole, translateReason, translateActivity, translateDayName }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

// Language toggle component
export function LanguageToggle() {
  const { lang, setLang, t } = useI18n();

  return (
    <button
      onClick={() => setLang(lang === 'en' ? 'he' : 'en')}
      className="px-3 py-1.5 rounded-full text-sm font-medium border hover:bg-gray-50 transition-colors"
      title={lang === 'en' ? 'עברית' : 'English'}
    >
      {t('language')}
    </button>
  );
}

// Hebrew day name by index (0=Sunday)
const HE_DAY_FULL = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const HE_MONTH_NAMES = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];

// Format date in Hebrew or English
export function useFormatDate() {
  const { lang } = useI18n();

  return useCallback((date: Date, formatStr: string): string => {
    if (lang === 'en') {
      // Use date-fns format for English
      const format = dateFnsFormat;
      return format(date, formatStr);
    }

    const day = date.getDate();
    const month = date.getMonth();
    const year = date.getFullYear();
    const dayOfWeek = date.getDay();

    switch (formatStr) {
      case 'EEEE':
        return HE_DAY_FULL[dayOfWeek];
      case 'EEEE, MMM d':
        return `${HE_DAY_FULL[dayOfWeek]}, ${day} ב${HE_MONTH_NAMES[month]}`;
      case 'EEE':
        return HE_DAY_FULL[dayOfWeek].slice(0, 3);
      case 'MMM d':
        return `${day} ב${HE_MONTH_NAMES[month]}`;
      case 'MMM d, yyyy':
        return `${day} ב${HE_MONTH_NAMES[month]} ${year}`;
      case 'MMMM d':
        return `${day} ב${HE_MONTH_NAMES[month]}`;
      case 'd, yyyy':
        return `${day}, ${year}`;
      case 'd':
        return `${day}`;
      case 'MMMM yyyy':
        return `${HE_MONTH_NAMES[month]} ${year}`;
      case 'yyyy-MM-dd':
      case 'yyyy-MM': {
        const format = dateFnsFormat;
        return format(date, formatStr);
      }
      default: {
        const format = dateFnsFormat;
        return format(date, formatStr);
      }
    }
  }, [lang]);
}
