/**
 * Serverless proxy for OpenAI chat. Keeps OPENAI_API_KEY on the server.
 * Set OPENAI_API_KEY (and optionally OPENAI_BASE_URL, OPENAI_MODEL) in Vercel.
 */

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey?.trim()) {
    return Response.json(
      { error: 'OPENAI_API_KEY is not set on the server.' },
      { status: 503 }
    );
  }

  let body: { message?: string; systemContent?: string; conversationHistory?: { role: string; content: string }[]; model?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { message, systemContent, conversationHistory = [], model } = body;
  if (!message || typeof message !== 'string') {
    return Response.json({ error: 'Missing or invalid "message".' }, { status: 400 });
  }

  const baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
  const resolvedModel = model || process.env.OPENAI_MODEL || 'gpt-4o-mini';

  const messages: { role: string; content: string }[] = [];
  if (systemContent?.trim()) {
    messages.push({ role: 'system', content: systemContent.trim() });
  }
  const history = Array.isArray(conversationHistory)
    ? conversationHistory.slice(-20).filter((m) => m?.role && m?.content)
    : [];
  for (const m of history) {
    messages.push({ role: m.role, content: String(m.content) });
  }
  messages.push({ role: 'user', content: message });

  const url = `${baseUrl}/chat/completions`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: resolvedModel,
      messages,
      max_tokens: 1024,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return Response.json(
      { error: `OpenAI API error ${res.status}: ${err.slice(0, 300)}` },
      { status: res.status >= 500 ? 502 : 400 }
    );
  }

  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = json.choices?.[0]?.message?.content?.trim();
  if (content == null) {
    return Response.json({ error: 'Empty response from OpenAI.' }, { status: 502 });
  }

  return Response.json({ content });
}
