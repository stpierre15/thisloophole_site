const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: cors, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: cors,
      body: JSON.stringify({ error: { message: 'Method not allowed' } }),
    };
  }

  const key = (process.env.ANTHROPIC_API_KEY || '').trim();
  if (!key) {
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({
        error: {
          message:
            'ANTHROPIC_API_KEY is not set. In Netlify: Site settings → Environment variables.',
        },
      }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return {
      statusCode: 400,
      headers: cors,
      body: JSON.stringify({ error: { message: 'Invalid JSON body' } }),
    };
  }

  const { model, max_tokens, system, messages } = body;
  if (!model || !Array.isArray(messages)) {
    return {
      statusCode: 400,
      headers: cors,
      body: JSON.stringify({ error: { message: 'Missing model or messages array' } }),
    };
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
  return {
    statusCode: upstream.status,
    headers: cors,
    body: text,
  };
};
