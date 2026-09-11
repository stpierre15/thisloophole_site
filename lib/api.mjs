import { inspectListing } from './product-lookup.mjs';
import { randomUUID, randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { normalizePurchase, evaluatePurchase, InputError, cents } from './engine.mjs';
import records from './catalog.mjs';
import { storage } from './storage.mjs';

const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const hash = value => createHash('sha256').update(value).digest('hex');
const equal = (a,b) => typeof a === 'string' && typeof b === 'string' && timingSafeEqual(Buffer.from(hash(a)), Buffer.from(hash(b)));
export const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
async function bodyOf(request) {
  if (request.method !== 'POST') throw Object.assign(new Error('Use POST for this request.'), { status: 405 });
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) throw Object.assign(new Error('Cross-origin requests are not accepted.'), { status: 403 });
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw Object.assign(new Error('Send purchase details as JSON.'), { status: 415 });
  const reader = request.body?.getReader();
  if (!reader) throw new InputError('Missing request body.');
  let size = 0; const parts = [];
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    size += value.byteLength;
    if (size > 12000) { await reader.cancel(); throw Object.assign(new Error('Request is too large.'), { status: 413 }); }
    parts.push(value);
  }
  let body; try { body = JSON.parse(Buffer.concat(parts).toString('utf8')); } catch { throw new InputError('Invalid request. Please try again.'); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new InputError('Invalid request.');
  return body;
}
export function endpoint(handler) {
  return async (request, context = {}, injectedStore) => {
    try { return await handler(request, context, injectedStore); }
    catch (error) {
      if (!error.status) console.error('Loophole request failed:', error.name);
      return json({ error: error.status ? error.message : 'We could not save this request. Please try again in a moment.', field: error.field || null }, error.status || 503);
    }
  };
}
export const inspectProduct = endpoint(async request => {
  const input = await bodyOf(request);
  if (typeof input.url !== 'string' || input.url.length > 1500) throw new InputError('Enter a product link.');
  return json(await inspectListing(input.url));
});
export const checkPurchase = endpoint(async (request, context, injectedStore) => {
  const input = await bodyOf(request);
  const db = injectedStore || storage(context);
  const eventId = randomUUID();
  const anonymousId = uuid(input.anonymous_id) ? input.anonymous_id : null;
  const startedAt = new Date().toISOString();
  await db.set('events/' + eventId, { id: eventId, type: 'purchase_check_started', anonymous_id: anonymousId, created_at: startedAt });
  const purchase = normalizePurchase(input);
  const result = evaluatePurchase(purchase, records);
  const feedbackToken = randomBytes(32).toString('hex');
  await db.set('purchases/' + purchase.id, { ...result, anonymous_id: anonymousId, feedback_token_hash: hash(feedbackToken) });
  // One event per request, updated after durable purchase storage to avoid counters.
  await db.set('events/' + eventId, { id: eventId, type: 'purchase_check_completed', anonymous_id: anonymousId, purchase_id: purchase.id, created_at: startedAt });
  return json({ ...result, feedback_token: feedbackToken }, 201);
});
export const captureOutcome = endpoint(async (request, context, injectedStore) => {
  const input = await bodyOf(request);
  if (!uuid(input.purchase_id)) throw new InputError('Invalid purchase reference. Run the purchase check again.');
  const token = request.headers.get('authorization')?.replace(/^Bearer /, '');
  if (!token || !/^[a-f0-9]{64}$/.test(token)) throw Object.assign(new Error('Run the purchase check again before sending feedback.'), { status: 401 });
  const db = injectedStore || storage(context);
  const row = await db.get('purchases/' + input.purchase_id);
  if (!row || !equal(row.feedback_token_hash, hash(token))) throw Object.assign(new Error('Purchase not found or feedback access expired.'), { status: 404 });
  if (!['useful','decision'].includes(input.kind)) throw new InputError('Choose a valid feedback action.');
  const key = 'outcomes/' + input.purchase_id + '/' + input.kind;
  const previous = await db.get(key);
  const now = new Date().toISOString();
  let useful = null, action = null, savings = null, success = null;
  if (input.kind === 'useful') {
    if (typeof input.useful !== 'boolean') throw new InputError('Choose Yes or No.');
    useful = input.useful;
  } else {
    if (!['bought','wait'].includes(input.action_taken)) throw new InputError('Choose whether you bought it or will wait.');
    action = input.action_taken;
    if (input.reported_savings != null && input.reported_savings !== '') {
      if (action !== 'bought' || typeof input.reported_savings !== 'number' || !Number.isFinite(input.reported_savings) || input.reported_savings < 0 || input.reported_savings > row.purchase.current_price || cents(input.reported_savings) / 100 !== input.reported_savings) throw new InputError('Reported savings must be between $0 and the original purchase price.');
      savings = input.reported_savings; success = savings > 0;
    }
  }
  if (input.loophole_id != null && !row.loopholes.some(r => r.id === input.loophole_id)) throw new InputError('Select a loophole from this purchase check.');
  const outcome = { id: previous?.id || randomUUID(), purchase_id: input.purchase_id, loophole_id: input.loophole_id || null, action_taken: action, purchase_completed: action === 'bought', reported_savings: savings, success, useful, verification_status: 'REPORTED', created_at: previous?.created_at || now, updated_at: now };
  await db.set(key, outcome);
  return json({ saved: true, outcome });
});
export async function summarizeMetrics(db) {
  const [events, purchases, outcomes, verifications] = await Promise.all(['events','purchases','outcomes','verifications'].map(p => db.list(p)));
  const votes = outcomes.filter(o => typeof o.useful === 'boolean');
  const decisions = outcomes.filter(o => o.action_taken);
  const visitors = new Map();
  for (const row of purchases) if (row.anonymous_id) visitors.set(row.anonymous_id, (visitors.get(row.anonymous_id) || 0) + 1);
  const verified = new Map();
  for (const v of verifications) {
    const p = purchases.find(row => row.purchase.id === v.purchase_id);
    if (p && v.evidence_reference && v.reviewer && v.reviewed_at && Number.isFinite(v.verified_savings) && v.verified_savings >= 0 && v.verified_savings <= p.purchase.current_price) verified.set(v.purchase_id, v.verified_savings);
  }
  return {
    purchase_checks_started: events.length, purchase_checks_completed: purchases.length,
    recommendations_generated: purchases.length, useful_votes: votes.length,
    useful_percent: votes.length ? Math.round(votes.filter(o => o.useful).length / votes.length * 100) : null,
    purchases_completed: decisions.filter(o => o.purchase_completed).length,
    reported_savings: decisions.reduce((sum,o) => sum + cents(o.reported_savings || 0), 0) / 100,
    verified_user_savings: [...verified.values()].reduce((sum,n) => sum + cents(n), 0) / 100,
    identifiable_users: visitors.size, repeat_users: [...visitors.values()].filter(n => n > 1).length,
    note: 'Anonymous browser identifiers are approximate. Self-reported savings are not verified savings.',
  };
}
export const metrics = endpoint(async (request, context, injectedStore) => {
  if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405);
  const secret = process.env.LOOPHOLE_ADMIN_TOKEN;
  if (!secret || !equal(request.headers.get('authorization'), 'Bearer ' + secret)) return json({ error: 'Not authorized' }, 401);
  return json(await summarizeMetrics(injectedStore || storage(context)));
});
