const form = document.querySelector('#purchase-form');
const resultEl = document.querySelector('#result');
const intro = document.querySelector('#purchase-start');
const errorEl = document.querySelector('#form-error');
const submitBtn = document.querySelector('#submit-btn');
const statusEl = document.querySelector('#live-status');
let currentResult = null;
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = n => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n);
const list = items => items.map(s => '<li>' + esc(s) + '</li>').join('');
const conditionName = value => ({new:'New',used:'Used',open_box:'Open box',refurbished:'Refurbished',unknown:'Condition not confirmed'}[value] || value);
function anonymousId() {
  try { let id = localStorage.getItem('loophole-anonymous-id'); if (!id) { id = crypto.randomUUID(); localStorage.setItem('loophole-anonymous-id',id); } return id; } catch { return null; }
}
function updateMerchantContext() {
  const typed = form.elements.merchant.value.replace(/\W/g,'').toLowerCase();
  let fromUrl = false; try { const h = new URL(form.elements.product.value.trim()).hostname; fromUrl = h === 'target.com' || h.endsWith('.target.com'); } catch {}
  document.querySelector('#target-context').hidden = typed !== 'target' && typed !== 'targetcom' && !fromUrl;
}
form.elements.merchant.addEventListener('input', updateMerchantContext);
form.elements.product.addEventListener('input', updateMerchantContext);
const lookupStatus = document.querySelector('#lookup-status');
const offersEl = document.querySelector('#listing-offers');
let lookupVersion = 0, lookupTimer;
const autoValues = new Map();
const edited = new Set();
for (const name of ['current_price','merchant','seller','condition']) {
  form.elements[name].addEventListener('input', () => { edited.add(name); autoValues.delete(name); });
}
function clearLookup() {
  lookupVersion++; clearTimeout(lookupTimer);
  lookupStatus.textContent = ''; offersEl.replaceChildren();
  for (const [name,value] of autoValues) if (form.elements[name].value === value) form.elements[name].value = name === 'condition' ? 'unknown' : '';
  autoValues.clear();
}
form.addEventListener('reset', () => { clearLookup(); edited.clear(); });
form.elements.product.addEventListener('input', () => {
  clearLookup();
  const value = form.elements.product.value.trim();
  let url; try { url = new URL(value); } catch { return; }
  if (url.protocol !== 'https:') return;
  const retailers = {'bestbuy.com':'Best Buy','apple.com':'Apple','target.com':'Target','costco.com':'Costco','rei.com':'REI','amazon.com':'Amazon','walmart.com':'Walmart','dell.com':'Dell'};
  const merchant = retailers[url.hostname.replace(/^www\./,'')];
  if (merchant && !edited.has('merchant') && !form.elements.merchant.value) { form.elements.merchant.value = merchant; autoValues.set('merchant',merchant); updateMerchantContext(); }
  const version = lookupVersion;
  lookupStatus.textContent = 'Reading listing details…';
  lookupTimer = setTimeout(async () => {
    try {
      const data = await request('/api/inspect-product',{url:value});
      if (version !== lookupVersion) return;
      for (const [name,value] of Object.entries({current_price:data.price,merchant:data.merchant,seller:data.seller,condition:data.condition})) {
        if (value == null || edited.has(name)) continue;
        const el = form.elements[name];
        if (el.value && !(name === 'condition' && el.value === 'unknown')) continue;
        el.value = String(value); autoValues.set(name,el.value);
      }
      updateMerchantContext();
      lookupStatus.textContent = (data.product_name ? data.product_name + '. ' : '') + data.message;
      const offers = data.alternatives || [];
      if (offers.length) {
        offersEl.innerHTML = '<p class="field-hint">Other in-stock offers published on this product page. Check equivalent condition, delivery and warranty before comparing.</p>' + offers.map((o,i) => '<article class="panel"><strong>'+money(o.price)+'</strong><p>'+esc(o.seller || 'Seller not confirmed')+' · '+esc(conditionName(o.condition || 'unknown'))+'</p><a href="'+esc(o.url)+'" target="_blank" rel="noopener noreferrer">Review offer ↗</a> <button type="button" class="secondary" data-offer="'+i+'">Use for comparison</button></article>').join('');
        for (const button of offersEl.querySelectorAll('[data-offer]')) button.addEventListener('click', () => {
          const offer = offers[Number(button.dataset.offer)];
          form.elements.alternative_price.value = offer.price;
          form.elements.alternative_url.value = offer.url;
          form.elements.alternative_confirmed.checked = false;
          form.elements.alternative_price.closest('details').open = true;
          form.elements.alternative_confirmed.focus();
          lookupStatus.textContent = 'Comparison added. Confirm its model, condition, availability, shipping and warranty below.';
        });
      } else if (data.status !== 'unavailable') {
        lookupStatus.textContent += ' No other readable in-stock offers were published in this page’s structured data. The wider market has not been searched.';
      }
    } catch (error) {
      if (version === lookupVersion) lookupStatus.textContent = error.message + ' You can enter the listing details manually.';
    }
  },650);
});

async function request(path, payload, token) {
  const response = await fetch(path, {method:'POST',headers:{'Content-Type':'application/json',...(token ? {Authorization:'Bearer '+token} : {})},body:JSON.stringify(payload),signal:AbortSignal.timeout(25000)});
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) {
    const message = response.status === 429 ? 'A few too many requests. Please wait a minute and try again.' : data?.error || 'The check is unavailable right now. Please try again shortly.';
    throw Object.assign(new Error(message),{field:data?.field});
  }
  return data;
}
form.addEventListener('submit', async event => {
  event.preventDefault(); if (submitBtn.disabled) return;
  errorEl.hidden = true; submitBtn.disabled = true; form.setAttribute('aria-busy','true');
  submitBtn.firstElementChild.textContent = 'Checking your purchase…'; statusEl.textContent = 'Checking your purchase and relevant policies.';
  const payload = Object.fromEntries(new FormData(form));
  for (const checkbox of form.querySelectorAll('input[type=checkbox]')) payload[checkbox.name] = checkbox.checked;
  payload.anonymous_id = anonymousId();
  try {
    currentResult = await request('/api/check-purchase',payload);
    renderResult(currentResult); intro.hidden = true; resultEl.hidden = false;
    resultEl.focus({preventScroll:true}); resultEl.scrollIntoView({behavior:'instant',block:'start'});
    statusEl.textContent = 'Your verdict is '+currentResult.verdict+'. '+(currentResult.score === null ? 'Not enough evidence for a score.' : 'Loophole Score '+currentResult.score+' out of 100.');
  } catch (error) {
    errorEl.textContent = error.name === 'TimeoutError' ? 'The check took too long. Your details are still here; please try again.' : error.message === 'Failed to fetch' ? 'Could not connect. Check your connection and try again.' : error.message;
    errorEl.hidden = false; if (error.field) document.getElementById(error.field)?.focus(); statusEl.textContent = errorEl.textContent;
  } finally { submitBtn.disabled = false; form.removeAttribute('aria-busy'); submitBtn.firstElementChild.textContent = 'Check my purchase'; }
});
function policyCard(p) {
  const verified = p.trusted ? 'Verified '+new Date(p.last_verified+'T00:00:00Z').toLocaleDateString('en-US',{month:'short',year:'numeric',timeZone:'UTC'}) : p.verification_status === 'VERIFIED' ? 'Needs re-verification' : p.verification_status.toLowerCase()+' · not verified';
  return '<article class="policy"><div class="policy-top"><span>'+esc(p.loophole_type)+'</span><span>'+esc(verified)+'</span></div><h4>'+esc(p.title)+'</h4><p>'+esc(p.summary)+'</p><p class="match-note">'+esc(p.match_note)+'</p><details><summary>Eligibility, exclusions & steps</summary><strong>Requirements</strong><ul>'+list(p.requirements)+'</ul><strong>Steps</strong><ol>'+list(p.steps)+'</ol><strong>Important exclusions</strong><ul>'+list(p.exclusions)+'</ul><ul>'+list(p.gotchas)+'</ul><p>Policy confidence: '+esc(p.confidence_score)+'/100. Your eligibility is not guaranteed.</p><p>'+esc(p.time_required || 'Time varies')+' · '+esc(p.difficulty)+'</p><p>'+(p.stackable ? 'Stacking requires the other policy to explicitly allow it.' : 'Not combined with other savings in this check.')+'</p></details><a href="'+esc(p.primary_source_url)+'" target="_blank" rel="noopener noreferrer">'+esc(p.primary_source_name)+' · Read source ↗</a></article>';
}
function renderResult(r) {
  const p = r.purchase;
  const better = r.better_option;
  resultEl.innerHTML = '<div class="result-top"><div><span class="step-label">02 / YOUR PURCHASE CHECK</span><h2 id="result-title">'+esc(p.product_name)+'</h2><div class="result-meta">'+esc(p.merchant || 'Merchant not provided')+(p.seller ? ' · Sold by '+esc(p.seller) : '')+' · '+esc(conditionName(p.condition))+' · USD</div></div><button type="button" class="text-button" id="edit-purchase">Edit details</button></div>'+
    '<div class="verdict-card"><div><span class="verdict-label">THE VERDICT</span><h3>'+esc(r.verdict)+'</h3><p>'+esc(r.headline)+'</p><span class="confidence">'+esc(r.confidence)+' confidence · based on available evidence</span></div><div class="score"><strong>'+(r.score === null ? '—' : r.score+'<small>/100</small>')+'</strong><span>Loophole Score</span><small>'+esc(r.score_label)+'</small></div></div>'+
    '<div class="price-grid"><div><span>Your current price</span><strong>'+money(p.current_price)+'</strong><small>Price you entered</small></div><div><span>Potential savings</span><strong>'+(r.potential_savings !== null ? money(r.potential_savings) : 'Not established')+'</strong><small>'+(r.potential_savings !== null ? 'Conditional · not yet saved' : 'No amount assumed')+'</small></div><div><span>Better economic option</span><strong>'+(better ? money(better.price) : 'Not identified')+'</strong><small>'+esc(better ? better.title : 'No confirmed lower price')+'</small></div></div>'+
    '<p class="coverage-note">'+esc(r.savings_basis)+(better ? ' <a href="'+esc(better.url)+'" target="_blank" rel="noopener noreferrer">Review this option ↗</a>' : '')+'</p>'+
    '<div class="result-grid"><section class="panel"><h3>Why this verdict</h3><ol class="reasons">'+list(r.reasons)+'</ol></section><section class="panel"><h3>Your next move</h3><ol class="actions">'+list(r.next_actions)+'</ol></section></div>'+
    '<p class="coverage-note">'+esc(r.confidence_reason)+' '+esc(r.coverage)+'</p>'+
    '<div class="matched-heading"><h3>Relevant loopholes</h3><span class="small muted">'+r.loopholes.length+' matched</span></div>'+
    (r.loopholes.length ? '<div class="policy-list">'+r.loopholes.map(policyCard).join('')+'</div>' : '<div class="empty">No strong policy matches for this purchase yet. This does not mean there are no better deals. Add the merchant or an exact comparison to make the next check more useful.</div>')+
    '<details class="score-details"><summary>See how your score was calculated</summary><div class="dimensions">'+r.dimensions.map(d => '<div class="dimension"><strong>'+esc(d.name)+'</strong><span>'+(d.points === null ? 'Unscored' : d.points+'/25')+'</span><div class="bar"><i style="width:'+d.points*4+'%"></i></div><p>'+esc(d.reason)+'</p></div>').join('')+'</div><p class="coverage-note">Each dimension contributes equally, up to 25 points. A score requires comparison or eligible discount evidence. Other unresolved details can lower a supported score. This measures the current purchase opportunity, not product quality. Rules v'+esc(r.methodology_version)+'.</p></details>'+
    '<section class="feedback" aria-label="Purchase feedback"><div><h3>Was this useful?</h3><div class="button-row"><button class="secondary usefulness" type="button" data-value="yes" aria-pressed="false">Yes</button><button class="secondary usefulness" type="button" data-value="no" aria-pressed="false">No</button></div><p id="useful-status" class="feedback-status" role="status"></p></div><div><h3>What will you do?</h3><div class="button-row"><button class="secondary decision" type="button" data-action="bought" aria-pressed="false">I bought it</button><button class="secondary decision" type="button" data-action="wait" aria-pressed="false">I’ll wait</button></div><p id="decision-status" class="feedback-status" role="status"></p></div><form id="outcome-form" hidden><label for="savings">Did Loophole save you money? <span class="muted">(optional, USD)</span></label><div class="form-row"><input type="number" inputmode="decimal" min="0" max="'+p.current_price+'" step="0.01" id="savings" placeholder="Amount saved"><button type="submit" class="secondary">Save outcome</button></div><label for="used-loophole">Which opportunity helped? <span class="muted">(optional)</span></label><select id="used-loophole"><option value="">Not sure / none of these</option>'+r.loopholes.map(l => '<option value="'+esc(l.id)+'">'+esc(l.title)+'</option>').join('')+'</select><p class="field-hint">This is recorded as self-reported savings until supporting evidence is reviewed.</p><p id="savings-status" class="feedback-status" role="status"></p></form></section><button type="button" id="new-purchase" class="text-button">Check another purchase ↗</button>';
  document.querySelector('#edit-purchase').addEventListener('click', () => { intro.hidden = false; resultEl.hidden = true; form.elements.product.focus(); intro.scrollIntoView(); });
  document.querySelector('#new-purchase').addEventListener('click', () => { form.reset(); currentResult = null; updateMerchantContext(); intro.hidden = false; resultEl.hidden = true; form.elements.product.focus(); intro.scrollIntoView(); });
  for (const b of document.querySelectorAll('.usefulness')) b.addEventListener('click', () => sendFeedback('useful',{useful:b.dataset.value === 'yes'},b));
  for (const b of document.querySelectorAll('.decision')) b.addEventListener('click', () => sendFeedback('decision',{action_taken:b.dataset.action},b));
  document.querySelector('#outcome-form').addEventListener('submit', event => { event.preventDefault(); const value = document.querySelector('#savings').value; sendFeedback('savings',{action_taken:'bought',reported_savings:value === '' ? null : Number(value),loophole_id:document.querySelector('#used-loophole').value || null},event.submitter); });
}
async function sendFeedback(group, values, clicked) {
  const selector = group === 'useful' ? '.usefulness' : '.decision';
  const feedbackStatus = document.querySelector('#'+group+'-status');
  const buttons = group === 'savings' ? [clicked,...document.querySelectorAll('.decision')] : [...document.querySelectorAll(selector),...document.querySelectorAll('#outcome-form button')];
  buttons.forEach(b => b.disabled = true); feedbackStatus.textContent = 'Saving…';
  try {
    await request('/api/outcome',{purchase_id:currentResult.purchase.id,kind:group === 'savings' ? 'decision' : group,...values},currentResult.feedback_token);
    feedbackStatus.textContent = group === 'useful' ? 'Thank you. Your feedback is saved.' : 'Saved. Thanks for closing the loop.';
    if (group !== 'savings') document.querySelectorAll(selector).forEach(b => b.setAttribute('aria-pressed',String(b === clicked)));
    if (group === 'decision') document.querySelector('#outcome-form').hidden = values.action_taken !== 'bought';
  } catch (e) { feedbackStatus.textContent = 'Not saved. '+(e.name === 'TimeoutError' ? 'Please try again.' : e.message); }
  finally { buttons.forEach(b => b.disabled = false); }
}
