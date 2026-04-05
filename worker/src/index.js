const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return json({ error: { message: 'Method not allowed' } }, 405);
    }

    const key =
      typeof env.ANTHROPIC_API_KEY === 'string'
        ? env.ANTHROPIC_API_KEY.trim()
        : env.ANTHROPIC_API_KEY;
    if (!key) {
      return json(
        { error: { message: 'Worker misconfigured: ANTHROPIC_API_KEY is not set.' } },
        500
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: { message: 'Invalid JSON body' } }, 400);
    }

    const { model, max_tokens, system, messages } = body;
    if (!model || !Array.isArray(messages)) {
      return json(
        { error: { message: 'Missing model or messages array' } },
        400
      );
    }

    const upstream = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: max_tokens ?? 1024,
        ...(system != null ? { system } : {}),
        messages,
      }),
    });

    const text = await upstream.text();
    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      return json(
        { error: { message: 'Anthropic returned non-JSON' } },
        502
      );
    }

    return new Response(JSON.stringify(data), {
      status: upstream.status,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  },
};

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}
