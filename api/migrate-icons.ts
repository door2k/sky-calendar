// One-time migration: backfill activity icons.
// Run by hitting GET /api/migrate-icons.

import { createClient } from '@supabase/supabase-js';

// Exact-match rules (word-boundary) for short Hebrew words
const EXACT_RULES: Array<{ keywords: string[]; icon: string }> = [
  { keywords: ['ים'], icon: '🏖️' },
  { keywords: ['גן חיות'], icon: '🦁' },
];

// Substring rules in priority order (specific before generic)
const ICON_RULES: Array<{ keywords: string[]; icon: string }> = [
  { keywords: ['show and tell'], icon: '🎪' },
  { keywords: ['birthday', 'יום הולדת', 'יומולדת'], icon: '🎂' },
  { keywords: ['pizza', 'פיצה'], icon: '🍕' },
  { keywords: ['party', 'מסיבה'], icon: '🎉' },
  { keywords: ['safari'], icon: '🦒' },
  { keywords: ['plane', 'planes', 'flying', 'מטוסים', 'מטוס', 'טיסה'], icon: '✈️' },
  { keywords: ['bat', 'bats', 'עטלף', 'עטלפים'], icon: '🦇' },
  { keywords: ['playdate', 'play date', 'play dating'], icon: '👫' },
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
  { keywords: ['music', 'מוזיקה', 'מוסיקה'], icon: '🎵' },
  { keywords: ['piano', 'פסנתר'], icon: '🎹' },
  { keywords: ['guitar', 'גיטרה'], icon: '🎸' },
  { keywords: ['drum', 'תופים'], icon: '🥁' },
  { keywords: ['art', 'paint', 'drawing', 'craft', 'אומנות', 'ציור', 'יצירה'], icon: '🎨' },
  { keywords: ['theater', 'theatre', 'drama', 'תיאטרון', 'דרמה'], icon: '🎭' },
  { keywords: ['sing', 'singing', 'choir', 'שירה', 'מקהלה'], icon: '🎤' },
  { keywords: ['book', 'read', 'library', 'ספר', 'קריאה', 'ספריה'], icon: '📚' },
  { keywords: ['science', 'מדע'], icon: '🔬' },
  { keywords: ['math', 'חשבון', 'מתמטיקה'], icon: '🔢' },
  { keywords: ['computer', 'coding', 'מחשב', 'תכנות'], icon: '💻' },
  { keywords: ['english', 'אנגלית'], icon: '🇬🇧' },
  { keywords: ['hebrew', 'עברית'], icon: '🇮🇱' },
  { keywords: ['lesson', 'class', 'tutor', 'שיעור'], icon: '📝' },
  { keywords: ['friend', 'חבר', 'משחק'], icon: '👫' },
  { keywords: ['park', 'playground', 'גן משחקים', 'פארק'], icon: '🛝' },
  { keywords: ['zoo', 'גן חיות'], icon: '🦁' },
  { keywords: ['circus', 'קרקס'], icon: '🎪' },
  { keywords: ['movie', 'cinema', 'סרט', 'קולנוע'], icon: '🎬' },
  { keywords: ['show', 'performance', 'הופעה', 'הצגה'], icon: '🎪' },
  { keywords: ['ice cream', 'גלידה'], icon: '🍦' },
  { keywords: ['cook', 'baking', 'בישול', 'אפייה'], icon: '👨‍🍳' },
  { keywords: ['restaurant', 'מסעדה'], icon: '🍽️' },
  { keywords: ['beach', 'sea', 'חוף'], icon: '🏖️' },
  { keywords: ['hike', 'hiking', 'nature', 'טיול', 'טבע'], icon: '🥾' },
  { keywords: ['garden', 'plant', 'planting', 'גינה', 'שתילה', 'נטיעה'], icon: '🌱' },
  { keywords: ['animal', 'pet', 'חיה', 'חיות'], icon: '🐾' },
  { keywords: ['horse', 'riding', 'סוס', 'רכיבה'], icon: '🐴' },
  { keywords: ['doctor', 'dentist', 'medical', 'רופא', 'שיניים', 'רפואי'], icon: '🏥' },
  { keywords: ['haircut', 'hair', 'תספורת', 'שיער'], icon: '💇' },
  { keywords: ['shop', 'shopping', 'קניות'], icon: '🛍️' },
  { keywords: ['travel', 'trip', 'flight', 'נסיעה'], icon: '✈️' },
  { keywords: ['sleep', 'nap', 'שינה', 'תנומה'], icon: '😴' },
  { keywords: ['photo', 'camera', 'צילום', 'מצלמה'], icon: '📸' },
];

function getActivityIcon(name: string): string {
  const lower = name.toLowerCase();

  for (const rule of EXACT_RULES) {
    for (const keyword of rule.keywords) {
      const re = new RegExp(`(?:^|\\s|[^\\u0590-\\u05FF])${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:$|\\s|[^\\u0590-\\u05FF])`);
      if (re.test(lower)) {
        return rule.icon;
      }
    }
  }

  for (const rule of ICON_RULES) {
    for (const keyword of rule.keywords) {
      if (lower.includes(keyword)) {
        return rule.icon;
      }
    }
  }
  return '🎯';
}

export default async function handler(req: Request): Promise<Response> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return new Response(JSON.stringify({ error: 'Missing Supabase credentials' }), { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: activities, error: fetchError } = await supabase
    .from('activities')
    .select('id, name, icon');

  if (fetchError) {
    return new Response(JSON.stringify({ error: fetchError.message }), { status: 500 });
  }

  const results: Array<{ id: string; name: string; icon: string }> = [];

  for (const activity of activities || []) {
    const icon = getActivityIcon(activity.name);
    const { error } = await supabase
      .from('activities')
      .update({ icon })
      .eq('id', activity.id);

    if (error) {
      return new Response(JSON.stringify({ error: `Failed to update ${activity.name}: ${error.message}` }), { status: 500 });
    }
    results.push({ id: activity.id, name: activity.name, icon });
  }

  return new Response(JSON.stringify({
    message: `Backfilled ${results.length} activities with icons`,
    results,
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const config = {
  runtime: 'edge',
};
