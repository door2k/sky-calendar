import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { name } = await req.json();
  if (!name || !name.trim()) {
    return new Response(JSON.stringify({ error: 'name is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 32,
    messages: [
      {
        role: 'user',
        content: `Pick ONE emoji that best represents this kids' activity: "${name.trim()}". Reply with ONLY the emoji, nothing else.`,
      },
    ],
  });

  const textContent = response.content.find((c) => c.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response');
  }

  // Extract first emoji from response
  const emojiMatch = textContent.text.match(/\p{Emoji_Presentation}/u);
  if (!emojiMatch) {
    throw new Error('No emoji in response');
  }

  return new Response(JSON.stringify({ icon: emojiMatch[0] }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const config = {
  runtime: 'edge',
};
