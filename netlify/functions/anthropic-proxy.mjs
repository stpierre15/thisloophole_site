import { getDeployStore } from '@netlify/blobs';
import { SYSTEM_PROMPT } from './system-prompt.mjs';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const TURNSTILE_VERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MODEL = (process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514').trim();
const MAX_OUTPUT_TOKENS = Math.min(
  1200,
  Math.max(256, parseInt(process.env.ANTHROPIC_MAX_OUTPUT_TOKENS || '768', 10))
);
const MAX_USER_CHARS = Math.min(
  12000,
  Math.max(500, parseInt(process.env.LOOPHOLE_MAX_QUESTION_CHARS || '6000', 10))
);
const RATE_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || String(15 * 60 * 1000), 10);
const RATE_MAX = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10', 10);
const RATE_DAY_MAX = parseInt(process.env.RATE_LIMIT_DAILY_MAX || '40', 10);

function corsJson(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

function clientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return (
    request.headers.get('x-nf-client-connection-ip') ||
    request.headers.get('client-ip') ||
    'unknown'
  );
}

async function verifyTurnstile(secret, token, ip) {
  const fd = new FormData();
  fd.append('secret', secret);
  fd.append('response', token);
  if (ip && ip !== 'unknown') fd.append('remoteip', ip);
  const r = await fetch(TURNSTILE_VERIFY, { method: 'POST', body: fd });
  const data = await r.json().catch(() => ({}));
  return data.success === true;
}

async function checkRateLimit(ip) {
  if (ip === 'unknown') return { ok: true };
  try {
    const store = getDeployStore('loophole-guard');
    const now = Date.now();
    const shortKey = `short:${ip}`;
    let short = await store.get(shortKey, { type: 'json' });
    if (!short || typeof short !== 'object') short = { windowStart: now, count: 0 };
    if (now - short.windowStart > RATE_WINDOW_MS) {
      short.windowStart = now;
      short.count = 0;
    }
    if (short.count >= RATE_MAX) {
      return {
        ok: false,
        reason: 'Too many requests from your network. Please wait about 15 minutes and try again.',
      };
    }
    short.count += 1;
    await store.setJSON(shortKey, short);

    const day = new Date().toISOString().slice(0, 10);
    const dayKey = `day:${ip}:${day}`;
    let dayRec = await store.get(dayKey, { type: 'json' });
    if (!dayRec || typeof dayRec !== 'object') dayRec = { count: 0 };
    if (dayRec.count >= RATE_DAY_MAX) {
      return { ok: false, reason: 'Daily limit reached. Try again tomorrow.' };
    }
    dayRec.count += 1;
    await store.setJSON(dayKey, dayRec);
    return { ok: true };
  } catch (e) {
    console.error('Rate limit / Blobs error:', e);
    return { ok: true };
  }
}

function totalUserChars(messages) {
  let n = 0;
  for (const m of messages) {
    if (!m) continue;
    const c = m.content;
    if (typeof c === 'string') n += c.length;
    else if (Array.isArray(c)) {
      for (const p of c) {
        if (p && typeof p.text === 'string') n += p.text.length;
      }
    }
  }
  return n;
}

export default async function handler(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }

  if (request.method !== 'POST') {
    return corsJson(405, { error: { message: 'Method not allowed' } });
  }

  const ip = clientIp(request);
  const rl = await checkRateLimit(ip);
  if (!rl.ok) {
    return corsJson(429, { error: { message: rl.reason } });
  }

  const key = (process.env.ANTHROPIC_API_KEY || '').trim();
  if (!key) {
    return corsJson(500, {
      error: {
        message:
          'ANTHROPIC_API_KEY is not set. In Netlify: Site settings → Environment variables.',
      },
    });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return corsJson(400, { error: { message: 'Invalid JSON body' } });
  }

  const turnstileSecret = (process.env.TURNSTILE_SECRET_KEY || '').trim();
  if (turnstileSecret) {
    const token = body.turnstileToken;
    if (!token || typeof token !== 'string') {
      return corsJson(400, {
        error: { message: 'Missing verification. Please complete the check below and try again.' },
      });
    }
    const ok = await verifyTurnstile(turnstileSecret, token, ip);
    if (!ok) {
      return corsJson(403, {
        error: { message: 'Verification failed. Refresh the page and try again.' },
      });
    }
  }

  const { messages } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return corsJson(400, { error: { message: 'Missing messages array' } });
  }

  const chars = totalUserChars(messages);
  if (chars > MAX_USER_CHARS) {
    return corsJson(400, {
      error: { message: `Question too long (max ${MAX_USER_CHARS} characters).` },
    });
  }

  if (chars < 1) {
    return corsJson(400, { error: { message: 'Empty question.' } });
  }

  const upstream = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      system: SYSTEM_PROMPT,
      messages,
    }),
  });

  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}
