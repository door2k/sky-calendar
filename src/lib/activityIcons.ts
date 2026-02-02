// Maps activity names to topic-related emoji icons.
// Called at activity creation/save time to assign an icon.

const ICON_RULES: Array<{ keywords: string[]; icon: string }> = [
  // Sports & Physical
  { keywords: ['soccer', 'football', 'כדורגל'], icon: '⚽' },
  { keywords: ['basketball', 'כדורסל'], icon: '🏀' },
  { keywords: ['swimming', 'swim', 'pool', 'שחייה', 'בריכה'], icon: '🏊' },
  { keywords: ['tennis', 'טניס'], icon: '🎾' },
  { keywords: ['gymnastics', 'gym', 'התעמלות'], icon: '🤸' },
  { keywords: ['karate', 'martial', 'judo', 'ninja', 'קראטה', 'ג\'ודו', 'נינג\'ה'], icon: '🥋' },
  { keywords: ['dance', 'dancing', 'ballet', 'ריקוד', 'בלט'], icon: '💃' },
  { keywords: ['hip hop', 'hiphop', 'היפ הופ'], icon: '🎤' },
  { keywords: ['yoga', 'יוגה'], icon: '🧘' },
  { keywords: ['bike', 'cycling', 'אופניים'], icon: '🚴' },
  { keywords: ['run', 'running', 'ריצה'], icon: '🏃' },
  { keywords: ['climb', 'climbing', 'טיפוס'], icon: '🧗' },

  // Arts & Music
  { keywords: ['music', 'מוזיקה', 'מוסיקה'], icon: '🎵' },
  { keywords: ['piano', 'פסנתר'], icon: '🎹' },
  { keywords: ['guitar', 'גיטרה'], icon: '🎸' },
  { keywords: ['drum', 'תופים'], icon: '🥁' },
  { keywords: ['art', 'paint', 'drawing', 'craft', 'אומנות', 'ציור', 'יצירה'], icon: '🎨' },
  { keywords: ['theater', 'theatre', 'drama', 'תיאטרון', 'דרמה'], icon: '🎭' },
  { keywords: ['sing', 'singing', 'choir', 'שירה', 'מקהלה'], icon: '🎤' },

  // Learning & Education
  { keywords: ['book', 'read', 'library', 'ספר', 'קריאה', 'ספריה'], icon: '📚' },
  { keywords: ['science', 'מדע'], icon: '🔬' },
  { keywords: ['math', 'חשבון', 'מתמטיקה'], icon: '🔢' },
  { keywords: ['computer', 'coding', 'מחשב', 'תכנות'], icon: '💻' },
  { keywords: ['english', 'אנגלית'], icon: '🇬🇧' },
  { keywords: ['hebrew', 'עברית'], icon: '🇮🇱' },
  { keywords: ['lesson', 'class', 'tutor', 'שיעור'], icon: '📝' },

  // Social & Events
  { keywords: ['birthday', 'יום הולדת', 'יומולדת'], icon: '🎂' },
  { keywords: ['party', 'מסיבה'], icon: '🎉' },
  { keywords: ['playdate', 'play date', 'friend', 'חבר', 'משחק'], icon: '👫' },
  { keywords: ['park', 'playground', 'גן משחקים', 'פארק'], icon: '🛝' },
  { keywords: ['zoo', 'גן חיות'], icon: '🦁' },
  { keywords: ['circus', 'קרקס'], icon: '🎪' },
  { keywords: ['movie', 'cinema', 'סרט', 'קולנוע'], icon: '🎬' },
  { keywords: ['show', 'performance', 'הופעה', 'הצגה'], icon: '🎪' },

  // Food
  { keywords: ['pizza', 'פיצה'], icon: '🍕' },
  { keywords: ['ice cream', 'גלידה'], icon: '🍦' },
  { keywords: ['cook', 'baking', 'בישול', 'אפייה'], icon: '👨‍🍳' },
  { keywords: ['restaurant', 'מסעדה'], icon: '🍽️' },

  // Nature & Outdoors
  { keywords: ['beach', 'sea', 'חוף', 'ים'], icon: '🏖️' },
  { keywords: ['hike', 'hiking', 'nature', 'טיול', 'טבע'], icon: '🥾' },
  { keywords: ['garden', 'plant', 'גינה', 'שתילה'], icon: '🌱' },
  { keywords: ['animal', 'pet', 'חיה', 'חיות'], icon: '🐾' },
  { keywords: ['horse', 'riding', 'סוס', 'רכיבה'], icon: '🐴' },

  // Other
  { keywords: ['doctor', 'dentist', 'medical', 'רופא', 'שיניים', 'רפואי'], icon: '🏥' },
  { keywords: ['haircut', 'hair', 'תספורת', 'שיער'], icon: '💇' },
  { keywords: ['shop', 'shopping', 'קניות'], icon: '🛍️' },
  { keywords: ['travel', 'trip', 'flight', 'נסיעה', 'טיסה'], icon: '✈️' },
  { keywords: ['sleep', 'nap', 'שינה', 'תנומה'], icon: '😴' },
  { keywords: ['photo', 'camera', 'צילום', 'מצלמה'], icon: '📸' },
];

const DEFAULT_ICON = '🎯';

export function getActivityIcon(name: string): string {
  const lower = name.toLowerCase();
  for (const rule of ICON_RULES) {
    for (const keyword of rule.keywords) {
      if (lower.includes(keyword)) {
        return rule.icon;
      }
    }
  }
  return DEFAULT_ICON;
}

/** Ask the AI to suggest an emoji for an activity name. */
export async function suggestActivityIcon(name: string): Promise<string> {
  const res = await fetch('/api/suggest-icon', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error(`suggest-icon API returned ${res.status}`);
  const { icon } = await res.json();
  return icon || DEFAULT_ICON;
}

/**
 * Get icon for an activity: keyword match first, AI fallback second.
 * Always returns an icon (never the default target unless AI also fails).
 */
export async function resolveActivityIcon(name: string): Promise<string> {
  const keywordIcon = getActivityIcon(name);
  if (keywordIcon !== DEFAULT_ICON) return keywordIcon;
  try {
    return await suggestActivityIcon(name);
  } catch {
    return DEFAULT_ICON;
  }
}
