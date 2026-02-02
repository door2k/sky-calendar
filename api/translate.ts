import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface RequestBody {
  fields: Record<string, string>;
}

const NAME_MAP = 'Tamir=טמיר, Asaf=אסף, Ilay=אילי, Sky=סקאי, Gili=גילי, Yossi=יוסי, Simcha=שמחה, Maya=מאיה';

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body: RequestBody = await req.json();
    const { fields } = body;

    if (!fields || Object.keys(fields).length === 0) {
      return new Response(JSON.stringify({ translations: {} }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const fieldEntries = Object.entries(fields).filter(([, v]) => v && v.trim());
    if (fieldEntries.length === 0) {
      return new Response(JSON.stringify({ translations: {} }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const fieldsJson = JSON.stringify(Object.fromEntries(fieldEntries));

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Translate these values from English to Hebrew. Keep proper nouns using this map: ${NAME_MAP}. Return ONLY a JSON object with the same keys and Hebrew values. No explanation.

${fieldsJson}`,
        },
      ],
    });

    const textContent = response.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response');
    }

    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const translations = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify({ translations }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Translate API error:', error);
    return new Response(
      JSON.stringify({
        error: 'Translation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

export const config = {
  runtime: 'edge',
};
