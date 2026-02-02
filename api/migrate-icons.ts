// One-time migration: Add icon column to activities table and backfill existing activities
// Run once by hitting GET /api/migrate-icons, then delete this file.

import { createClient } from '@supabase/supabase-js';

const ICON_RULES: Array<{ keywords: string[]; icon: string }> = [
  { keywords: ['soccer', 'football', 'כדורגל'], icon: '⚽' },
  { keywords: ['basketball', 'כדורסל'], icon: '🏀' },
  { keywords: ['swimming', 'swim', 'pool', 'שחייה', 'בריכה'], icon: '🏊' },
  { keywords: ['tennis', 'טניס'], icon: '🎾' },
  { keywords: ['gymnastics', 'gym', 'התעמלות'], icon: '🤸' },
  { keywords: ['karate', 'martial', 'judo', 'ninja', 'קראטה', 'נינג\'ה'], icon: '🥋' },
  { keywords: ['dance', 'dancing', 'ballet', 'ריקוד', 'בלט'], icon: '💃' },
  { keywords: ['hip hop', 'hiphop', 'היפ הופ'], icon: '🎤' },
  { keywords: ['yoga', 'יוגה'], icon: '🧘' },
  { keywords: ['bike', 'cycling', 'אופניים'], icon: '🚴' },
  { keywords: ['music', 'מוזיקה', 'מוסיקה'], icon: '🎵' },
  { keywords: ['piano', 'פסנתר'], icon: '🎹' },
  { keywords: ['guitar', 'גיטרה'], icon: '🎸' },
  { keywords: ['art', 'paint', 'drawing', 'craft', 'אומנות', 'ציור', 'יצירה'], icon: '🎨' },
  { keywords: ['theater', 'theatre', 'drama', 'תיאטרון', 'דרמה'], icon: '🎭' },
  { keywords: ['book', 'read', 'library', 'ספר', 'קריאה', 'ספריה'], icon: '📚' },
  { keywords: ['science', 'מדע'], icon: '🔬' },
  { keywords: ['birthday', 'יום הולדת', 'יומולדת'], icon: '🎂' },
  { keywords: ['party', 'מסיבה'], icon: '🎉' },
  { keywords: ['playdate', 'play date', 'friend', 'חבר', 'משחק'], icon: '👫' },
  { keywords: ['park', 'playground', 'גן משחקים', 'פארק'], icon: '🛝' },
  { keywords: ['zoo', 'גן חיות'], icon: '🦁' },
  { keywords: ['movie', 'cinema', 'סרט', 'קולנוע'], icon: '🎬' },
  { keywords: ['pizza', 'פיצה'], icon: '🍕' },
  { keywords: ['ice cream', 'גלידה'], icon: '🍦' },
  { keywords: ['cook', 'baking', 'בישול', 'אפייה'], icon: '👨‍🍳' },
  { keywords: ['beach', 'sea', 'חוף', 'ים'], icon: '🏖️' },
  { keywords: ['hike', 'hiking', 'nature', 'טיול', 'טבע'], icon: '🥾' },
  { keywords: ['horse', 'riding', 'סוס', 'רכיבה'], icon: '🐴' },
  { keywords: ['doctor', 'dentist', 'רופא', 'שיניים'], icon: '🏥' },
  { keywords: ['shop', 'shopping', 'קניות'], icon: '🛍️' },
];

function getActivityIcon(name: string): string {
  const lower = name.toLowerCase();
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

  // Step 1: Add icon column (will fail silently if already exists via RPC, so we use a workaround)
  // We can't ALTER TABLE via the JS client, so we try to update with icon field.
  // The column must be added manually first via SQL Editor:
  // ALTER TABLE activities ADD COLUMN IF NOT EXISTS icon text;

  // Step 2: Backfill existing activities
  const { data: activities, error: fetchError } = await supabase
    .from('activities')
    .select('id, name, icon');

  if (fetchError) {
    return new Response(JSON.stringify({ error: fetchError.message }), { status: 500 });
  }

  const results: Array<{ id: string; name: string; icon: string }> = [];

  for (const activity of activities || []) {
    if (activity.icon) continue; // Already has icon
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
