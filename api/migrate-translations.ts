import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
);

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const NAME_MAP = 'Tamir=טמיר, Asaf=אסף, Ilay=אילי, Sky=סקיי, Gili=גילי, Yossi=יוסי, Simcha=שמחה, Maya=מאיה';

async function translate(fields: Record<string, string>): Promise<Record<string, string>> {
  const nonEmpty = Object.fromEntries(Object.entries(fields).filter(([, v]) => v && v.trim()));
  if (Object.keys(nonEmpty).length === 0) return {};

  const response = await client.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `Translate these values from English to Hebrew. Keep proper nouns using this map: ${NAME_MAP}. Return ONLY a JSON object with the same keys and Hebrew values. No explanation.\n\n${JSON.stringify(nonEmpty)}`,
    }],
  });

  const textContent = response.content.find((c) => c.type === 'text');
  if (!textContent || textContent.type !== 'text') throw new Error('No text response');
  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON found');
  return JSON.parse(jsonMatch[0]);
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('POST only', { status: 405 });
  }

  const results: string[] = [];

  // Migrate day_schedules
  const { data: days } = await supabase.from('day_schedules').select('*');
  for (const day of days || []) {
    const fields: Record<string, string> = {};
    if (day.gan_activity && !day.gan_activity_he) fields.gan_activity = day.gan_activity;
    if (day.no_gan_reason && !day.no_gan_reason_he) fields.no_gan_reason = day.no_gan_reason;
    if (day.notes && !day.notes_he) fields.notes = day.notes;

    if (Object.keys(fields).length > 0) {
      const he = await translate(fields);
      const update: Record<string, string> = {};
      if (he.gan_activity) update.gan_activity_he = he.gan_activity;
      if (he.no_gan_reason) update.no_gan_reason_he = he.no_gan_reason;
      if (he.notes) update.notes_he = he.notes;

      if (Object.keys(update).length > 0) {
        await supabase.from('day_schedules').update(update).eq('id', day.id);
        results.push(`day ${day.date}: ${JSON.stringify(update)}`);
      }
    }
  }

  // Migrate saturday_schedules
  const { data: sats } = await supabase.from('saturday_schedules').select('*');
  for (const sat of sats || []) {
    const update: Record<string, any> = {};

    if (sat.notes && !sat.notes_he) {
      const he = await translate({ notes: sat.notes });
      if (he.notes) update.notes_he = he.notes;
    }

    if (sat.activities && sat.activities.length > 0 && !sat.activities_he) {
      const customNames: Record<string, string> = {};
      sat.activities.forEach((act: any, idx: number) => {
        if (act.custom_name) customNames[`act_${idx}`] = act.custom_name;
      });

      if (Object.keys(customNames).length > 0) {
        const he = await translate(customNames);
        update.activities_he = sat.activities.map((act: any, idx: number) => {
          const key = `act_${idx}`;
          if (he[key]) return { ...act, custom_name_he: he[key] };
          return act;
        });
      }
    }

    if (Object.keys(update).length > 0) {
      await supabase.from('saturday_schedules').update(update).eq('id', sat.id);
      results.push(`saturday ${sat.date}: ${JSON.stringify(update)}`);
    }
  }

  // Migrate activities
  const { data: acts } = await supabase.from('activities').select('*');
  for (const act of acts || []) {
    const fields: Record<string, string> = {};
    if (act.name && !act.name_he) fields.name = act.name;
    if (act.note && !act.note_he) fields.note = act.note;
    if (act.address && !act.address_he) fields.address = act.address;

    if (Object.keys(fields).length > 0) {
      const he = await translate(fields);
      const update: Record<string, string> = {};
      if (he.name) update.name_he = he.name;
      if (he.note) update.note_he = he.note;
      if (he.address) update.address_he = he.address;

      if (Object.keys(update).length > 0) {
        await supabase.from('activities').update(update).eq('id', act.id);
        results.push(`activity ${act.name}: ${JSON.stringify(update)}`);
      }
    }
  }

  return new Response(JSON.stringify({ migrated: results.length, results }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const config = {
  runtime: 'edge',
};
