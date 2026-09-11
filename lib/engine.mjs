/** Deterministic purchase evaluation. No model-generated offers or dollar amounts. */
import { randomUUID } from 'node:crypto';

export class InputError extends Error {
  constructor(message, field = 'product') { super(message); this.field = field; this.status = 400; }
}
export const cents = value => Math.round((value + Number.EPSILON) * 100);
const money = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
const merchants = {
  'bestbuy.com': 'Best Buy', 'apple.com': 'Apple', 'target.com': 'Target',
  'dell.com': 'Dell', 'costco.com': 'Costco', 'rei.com': 'REI', 'amazon.com': 'Amazon', 'walmart.com': 'Walmart',
};
export function merchantFromUrl(url) {
  if (!url) return null;
  const host = new URL(url).hostname.toLowerCase();
  return Object.entries(merchants).find(([domain]) => host === domain || host.endsWith('.' + domain))?.[1] || null;
}
export function safeUrl(value, field = 'product') {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || !url.hostname.includes('.') ||
      /(^localhost$|\.local$|\.internal$|^[\d.]+$|:)/i.test(url.hostname)) throw new Error();
    // General input normalization; fetching uses a separate strict retail allowlist.
    for (const key of [...url.searchParams.keys()]) if (/^(utm_|fbclid|gclid)/i.test(key)) url.searchParams.delete(key);
    url.hash = '';
    return url.href;
  } catch { throw new InputError('Enter a valid public http:// or https:// product link.', field); }
}
const text = (value, max, field, fallback = '') => {
  if (value == null) return fallback;
  if (typeof value !== 'string' || value.length > max || /[<>\x00-\x08]/.test(value)) throw new InputError('Please use plain text within the field length limit.', field);
  return value.trim();
};
function price(value, field, optional = false) {
  if (value == null || value === '') { if (optional) return null; throw new InputError('Enter the price you are seeing in US dollars.', field); }
  if (!['number', 'string'].includes(typeof value) || !/^\d+(\.\d{1,2})?$/.test(String(value)) || !Number.isFinite(Number(value)) || Number(value) <= 0 || Number(value) > 1_000_000) {
    throw new InputError('Enter a price between $0.01 and $1,000,000, with at most two decimal places.', field);
  }
  return cents(Number(value)) / 100;
}
export function classify(value) {
  if (/\b(laptop|computer|monitor|television|tv|phone|iphone|ipad|tablet|macbook|imac|airpods|headphones|camera|playstation|xbox|speaker|homepod|apple watch|projector|mac mini|mac studio)\b/i.test(value)) return 'electronics';
  if (/\b(refrigerator|fridge|washer|dryer|dishwasher|freezer|vacuum|oven|cooktop|water heater|microwave)\b/i.test(value)) return 'appliances';
  if (/\b(tent|hiking|camping|backpack|kayak|bike|bicycle|ski|sleeping bag|trekking)\b/i.test(value)) return 'outdoors';
  if (/\b(shoes|shirt|jacket|jeans|dress|coat|boots)\b/i.test(value)) return 'clothing';
  if (/\b(sofa|couch|desk|chair|mattress|table|furniture|shelf|rug)\b/i.test(value)) return 'home';
  return 'other';
}
/** @returns {import('../types/models').Purchase} */
export function normalizePurchase(input, now = new Date()) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new InputError('Enter your purchase details.');
  const product = text(input.product, 1500, 'product');
  if (product.length < 3 || !/[a-z0-9]/i.test(product)) throw new InputError('Add a product link or a short description (at least 3 characters).');
  let url = null;
  let productName = product;
  if (/^\S*:\/\/|^(https?:|www\.)/i.test(product)) {
    url = safeUrl(product);
    const parsed = new URL(url);
    const catalogPath = ['bestbuy.com','www.bestbuy.com'].includes(parsed.hostname) ? parsed.pathname.match(/^\/(?:product|site)\/([^/]+)/)?.[1] || parsed.pathname : parsed.pathname;
    try { productName = decodeURIComponent(catalogPath).replace(/[\/_-]+/g, ' ').replace(/\.(html?|aspx?)\b/g, '').trim(); }
    catch { throw new InputError('This product link contains invalid characters.'); }
    if (productName.length < 4) productName = 'Purchase at ' + parsed.hostname;
    productName = productName.slice(0, 240);
  } else if (/^[a-z][a-z\d+.-]*:/i.test(product)) throw new InputError('Use an http:// or https:// link, or describe the product.');
  const rawMerchant = text(input.merchant, 100, 'merchant');
  const inferredMerchant = merchantFromUrl(url);
  const merchant = Object.values(merchants).find(m => m.replace(/\W/g, '').toLowerCase() === rawMerchant.replace(/\W/g, '').replace(/com$/i, '').toLowerCase()) || rawMerchant || inferredMerchant;
  if (inferredMerchant && merchant && inferredMerchant !== merchant) throw new InputError('The merchant and product link disagree. Enter the website’s name here and its actual seller in Sold by.', 'merchant');
  const seller = text(input.seller, 100, 'seller');
  const condition = input.condition || 'unknown';
  if (!['new','used','open_box','refurbished','unknown'].includes(condition)) throw new InputError('Choose a valid condition.', 'condition');
  const timing = input.purchase_timing || 'flexible';
  if (!['flexible','soon','today'].includes(timing)) throw new InputError('Choose when you need the purchase.', 'timing');
  const category = input.category && input.category !== 'auto' ? input.category : classify(productName);
  if (!['electronics','appliances','home','outdoors','clothing','other'].includes(category)) throw new InputError('Choose a valid category.', 'category');
  const alternativePrice = price(input.alternative_price, 'alternative-price', true);
  const alternativeRaw = text(input.alternative_url, 1500, 'alternative-url');
  if ((alternativePrice !== null) !== Boolean(alternativeRaw)) throw new InputError('For a comparison, add both its price and product link.', alternativeRaw ? 'alternative-price' : 'alternative-url');
  const alternativeUrl = alternativeRaw ? safeUrl(alternativeRaw, 'alternative-url') : null;
  if (alternativeUrl && url && alternativeUrl === url) throw new InputError('Use a different listing for the comparison.', 'alternative-url');
  return {
    id: randomUUID(), product_name: productName, product_url: url, merchant: merchant || null, seller: seller || null,
    seller_unconfirmed: Boolean(url && ['Best Buy','Target','Amazon','Walmart'].includes(merchant) && !seller),
    marketplace: Boolean(merchant && seller && seller.replace(/\W/g,'').toLowerCase() !== (merchant || '').replace(/\W/g,'').toLowerCase()),
    current_price: price(input.current_price, 'price'), condition, category, location: 'US',
    purchase_stage: 'before_purchase', purchase_timing: timing, created_at: now.toISOString(),
    willing_to_buy_used: input.willing_to_buy_used === true,
    target_card_eligible: input.target_card_eligible === true, discount_already_applied: input.discount_already_applied === true,
    terms_confirmed: input.terms_confirmed === true,
    alternative: alternativePrice !== null ? { price: alternativePrice, url: alternativeUrl, confirmed: input.alternative_confirmed === true, source_type: 'USER_REPORTED' } : null,
    payment_cards: [], memberships: [], employer: null, brand_preferences: [],
  };
}
export function isVerified(record, now = new Date()) {
  const age = now.getTime() - new Date(record.last_verified).getTime();
  return record.status === 'Active' && record.verification_status === 'VERIFIED' && age >= 0 && age <= 90 * 86400000;
}
export function matchLoopholes(purchase, records, now = new Date()) {
  const words = purchase.product_name.toLowerCase();
  return records.filter(r => {
    if (r.status !== 'Active' || ['EXPIRED'].includes(r.verification_status)) return false;
    if (!r.purchase_stage.includes(purchase.purchase_stage) || !r.product_categories.includes(purchase.category)) return false;
    if (r.merchants.length && (!r.merchants.includes(purchase.merchant) || purchase.marketplace || purchase.seller_unconfirmed)) return false;
    if (!r.conditions.includes(purchase.condition) || (r.requires_used && !purchase.willing_to_buy_used)) return false;
    if (r.keywords.length && !r.keywords.some(k => words.includes(k))) return false;
    if (r.excluded_keywords.some(k => words.includes(k))) return false;
    if (r.online_only && !purchase.product_url?.includes('costco.com/') && purchase.merchant !== 'Costco.com') return false;
    return true;
  }).map(r => ({ ...r, trusted: isVerified(r, now), match_note: r.requires_used ? 'Alternative path to investigate; matching stock and price have not been verified.' : 'Policy matched. Confirm the listed requirements for your purchase.' }))
    .sort((a,b) => Number(b.trusted) - Number(a.trusted) || b.confidence_score - a.confidence_score).slice(0, 5);
}
export function canStack(a, b) {
  return a.stackable && b.stackable && a.stackable_with.includes(b.id) && b.stackable_with.includes(a.id) && !a.conflicts_with.includes(b.id) && !b.conflicts_with.includes(a.id);
}
/** Current-purchase score: four explicit 0–25 dimensions; uncertainty is penalized. */
export function evaluatePurchase(p, records, now = new Date()) {
  const matches = matchLoopholes(p, records, now);
  const trusted = matches.filter(r => r.trusted);
  const comparison = p.alternative?.confirmed ? p.alternative : null;
  const gap = comparison ? Math.max(0, cents(p.current_price) - cents(comparison.price)) / 100 : 0;
  const material = gap >= Math.max(10, p.current_price * .03);
  const card = trusted.find(r => r.id === 'target-card');
  const cardSavings = card && p.target_card_eligible && !p.discount_already_applied ? Math.round(cents(p.current_price) * card.rate) / 100 : 0;
  const potential = Math.max(gap, cardSavings);
  const protection = trusted.some(r => ['Warranty','Return Benefit'].includes(r.loophole_type));
  // Price-match eligibility is not inferred merely from a competitor's hostname.
  const sameRetailer = comparison && merchantFromUrl(comparison.url) === p.merchant;
  const negotiable = material && sameRetailer && trusted.some(r => ['Price Match','Price Adjustment'].includes(r.loophole_type));
  const poor = material && gap / p.current_price >= .30 && gap >= 50;
  let verdict = 'WAIT';
  let headline = 'Check the missing facts before you commit.';
  const why = [];
  const actions = [];
  if (poor) {
    verdict = 'DON’T BUY'; headline = 'Walk away from these terms; your comparison is materially cheaper.';
    why.push('The equivalent offer you reported is at least 30% and $50 less than this purchase.');
  } else if (negotiable && gap >= cardSavings) {
    verdict = 'NEGOTIATE'; headline = 'Ask the retailer to honor its lower eligible price.';
    why.push('Your reported lower price is from the same retailer, and a relevant price policy applies if its requirements are met.');
  } else if (material || cardSavings > 0) {
    verdict = 'SWITCH'; headline = cardSavings >= gap ? 'Use the eligible payment path before you pay.' : 'Your comparison offers a better purchase path.';
    why.push(cardSavings >= gap ? 'You confirmed an existing eligible Target Circle Card and a price that does not include its discount.' : 'The comparable offer you reported clears our savings threshold: at least $10 and 3%.');
  } else if (comparison && p.terms_confirmed && p.merchant && p.condition !== 'unknown' && !p.seller_unconfirmed) {
    verdict = 'BUY'; headline = 'This is a reasonable buy against the comparison you checked.';
    why.push('Your reported comparable listing does not offer materially better economics, and you checked returns and warranty.');
  } else {
    why.push(comparison ? 'The comparison is useful, but seller or return and warranty details still need confirmation.' : 'We do not have a confirmed comparable offer, so we cannot establish that this price is strong.');
    actions.push(p.product_url ? 'Confirm the exact model, seller and item condition on the listing.' : 'Find the exact model number and a listing from a reputable seller.');
  }
  if (!p.merchant) { why.push('No merchant was identified, so retailer-specific policies could not be checked.'); actions.push('Add the merchant to check relevant price and return policies.'); }
  if (p.marketplace) why.push('This offer is sold by a Marketplace seller. Our direct-retailer policy catalog does not establish this seller’s price-match, return or warranty terms.');
  else if (p.seller_unconfirmed) why.push('The website may host Marketplace sellers. Retailer-specific policies are withheld until the sold-by seller is confirmed as the retailer.');
  if (p.condition === 'unknown') { why.push('The listing condition has not been confirmed.'); actions.push('Check whether this offer is new, used, open box or refurbished.'); }
  if (p.condition !== 'new' && p.condition !== 'unknown') { why.push('Used and open-box goods need a separate check of wear, missing parts and warranty; new-item price matching may not apply.'); actions.push('Confirm condition, accessories, return costs and written warranty coverage.'); }
  if (potential > 0) {
    why.push('Potential savings use the best single path. Discounts, rewards, trade-in value and protections are not added together.');
    actions.unshift(negotiable && gap >= cardSavings ? 'Show the retailer your live lower-price listing and ask it to confirm eligibility before charging you.' : cardSavings >= gap ? 'Confirm the 5% discount on the eligible Target subtotal at checkout using your existing card.' : 'Open your comparison, recheck stock and total delivered cost, then choose it only if the terms are equivalent.');
  }
  if (!comparison) actions.push('Compare one exact equivalent including delivery and fees. Add its link and price above to refine this verdict.');
  if (!p.terms_confirmed && p.condition === 'new') actions.push('Confirm the return deadline and warranty before paying.');
  if (trusted.length) why.push('We found ' + trusted.length + ' sourced ' + (trusted.length === 1 ? 'policy worth checking' : 'policies worth checking') + '; a policy match does not guarantee personal eligibility.');
  if (p.purchase_timing === 'today' && verdict === 'WAIT') actions.push('Need it today? Make these checks now; this is not a prediction of an upcoming sale.');
  if (verdict === 'BUY') actions.push('Recheck the final total, keep your receipt and set a reminder for any relevant price-adjustment window.');
  const ratio = comparison ? gap / p.current_price : null;
  const dimensions = [
    { name: 'Price', points: comparison ? (ratio >= .3 ? 3 : material ? 10 : 23) : cardSavings ? 14 : 9, reason: comparison ? 'Compared with your reported equivalent offer.' : cardSavings ? 'A conditional payment discount is available; market price remains unknown.' : 'No confirmed comparable market price.' },
    { name: 'Optionality', points: poor ? 5 : material || cardSavings ? 11 : comparison ? 22 : trusted.some(r => r.requires_used) ? 13 : 10, reason: material || cardSavings ? 'A better route reduces the appeal of this current purchase.' : comparison ? 'A comparable route has been considered.' : 'Alternative prices or inventory still need checking.' },
    { name: 'Benefits', points: p.terms_confirmed && protection ? 23 : p.terms_confirmed ? 18 : protection ? 15 : 8, reason: p.terms_confirmed ? 'You confirmed the purchase terms; coverage still follows exclusions.' : protection ? 'A relevant protection policy exists; eligibility is unconfirmed.' : 'Return and warranty coverage are unconfirmed.' },
    { name: 'Timing', points: verdict === 'BUY' ? 20 : poor ? 5 : 12, reason: verdict === 'BUY' ? 'No identified reason to delay within the evidence provided.' : 'Resolve the identified gaps; no price-history forecast is available.' },
  ];
  const hasEvidence = Boolean(comparison || cardSavings);
  const score = hasEvidence ? dimensions.reduce((sum, d) => sum + d.points, 0) : null;
  if (!hasEvidence) for (const d of dimensions) d.points = null;
  return {
    purchase: p, verdict, headline, score, score_label: score === null ? 'Not enough evidence' : score >= 90 ? 'Excellent' : score >= 75 ? 'Good' : score >= 60 ? 'Fair' : score >= 40 ? 'Optimize or wait' : 'Poor', dimensions,
    confidence: comparison || cardSavings ? 'Medium' : 'Low',
    confidence_reason: comparison ? 'The comparison and equivalent terms are user-reported, not independently verified.' : cardSavings ? 'The policy is sourced; your eligibility and price basis are user-confirmed.' : 'Policies are sourced where available, but live prices and eligibility are incomplete.',
    potential_savings: potential > 0 ? potential : null,
    savings_basis: potential > 0 ? (cardSavings >= gap ? 'Conditional policy calculation on your eligible subtotal; verify at checkout.' : 'Based on your reported comparable price, not an independently verified offer.') : 'Not established. No verified dollar saving has been identified.',
    better_option: potential > 0 ? { price: (cents(p.current_price) - cents(potential)) / 100, title: cardSavings >= gap ? 'Existing Target Circle Card payment' : 'Your comparable listing', url: cardSavings >= gap ? card.primary_source_url : comparison.url, source_type: cardSavings >= gap ? 'VERIFIED_POLICY_CONDITIONAL' : 'USER_REPORTED' } : null,
    reasons: why, next_actions: [...new Set(actions)].slice(0, 4), loopholes: matches,
    coverage: 'US policies · USD · Listing lookup is limited to accessible structured retailer data; no market-wide price search. Unconfirmed amounts are not counted as savings.',
    methodology_version: '1.1', created_at: now.toISOString(),
  };
}
