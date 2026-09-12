import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePurchase, evaluatePurchase, matchLoopholes, canStack, safeUrl } from '../lib/engine.mjs';
import records from '../lib/catalog.mjs';
const now = new Date('2026-09-10T15:00:00Z');
const input = {product:'Alienware 38 inch monitor',current_price:1499,merchant:'Best Buy',condition:'new',willing_to_buy_used:true};
const check = patch => evaluatePurchase(normalizePurchase({...input,...patch},now),records,now);

test('high-priced electronics: missing evidence produces no purchase advice or fabricated market savings', () => {
  const result = check({}); assert.equal(result.verdict,null); assert.equal(result.potential_savings,null);
  assert.ok(result.loopholes.some(r=>r.id==='best-buy-match'));
  assert.ok(result.loopholes.some(r=>r.id==='best-buy-open-box'));
  assert.equal(result.score,null); assert.equal(result.score_label,'Not enough evidence'); assert.ok(result.dimensions.every(d=>d.points===null));
});
test('retailer-specific eligible payment path produces supported savings', () => {
  const result = check({merchant:'Target',current_price:500,target_card_eligible:true});
  assert.equal(result.verdict,'SWITCH'); assert.equal(result.potential_savings,25); assert.equal(result.better_option.price,475);
  assert.equal(result.better_option.source_type,'VERIFIED_POLICY_CONDITIONAL');
});
test('unconfirmed eligibility and already-applied discounts are not monetized', () => {
  assert.equal(check({merchant:'Target',target_card_eligible:false}).potential_savings,null);
  assert.equal(check({merchant:'Target',target_card_eligible:true,discount_already_applied:true}).potential_savings,null);
});
test('no strong loopholes for an unknown merchant and niche product', () => {
  const r=check({product:'Handmade ceramic vase',merchant:'Local studio',current_price:85});
  assert.deepEqual(r.loopholes,[]);assert.equal(r.verdict,null);assert.equal(r.confidence,'Low');
});
test('used and open-box exclude new-only benefits', () => {
  for(const condition of ['used','open_box','refurbished']){
    const r=check({condition});assert.ok(!r.loopholes.some(l=>['best-buy-match','best-buy-adjustment'].includes(l.id)));
    assert.ok(r.next_actions.some(a=>a.includes('condition')));
  }
});
test('missing merchant is accepted but evidence gap is explained', () => {
  const r=check({merchant:''});assert.equal(r.purchase.merchant,null);assert.equal(r.verdict,null);assert.equal(r.loopholes.length,0);
  assert.ok(r.reasons.some(s=>s.includes('No merchant')));
});
test('product URLs infer merchants, tracking is removed, retailer mismatch rejected', () => {
  const p=normalizePurchase({...input,product:'https://www.bestbuy.com/site/alienware-monitor/123?utm_source=test',merchant:''},now);
  assert.equal(p.merchant,'Best Buy');assert.equal(p.category,'electronics');assert.ok(!p.product_url.includes('utm_'));
  assert.throws(()=>normalizePurchase({...input,product:'https://apple.com/shop/macbook-pro',merchant:'Target'}),/disagree/);
});
test('missing and invalid prices fail validation', () => {
  for(const current_price of [null,'',-5,0,'abc',Infinity,true,{},'3.456','1e3']) assert.throws(()=>check({current_price}));
});
test('invalid URLs, HTML, short input, and private hosts are rejected', () => {
  for(const product of ['x','<img src=x>','javascript:alert(1)','https://','https://127.0.0.1/foo','https://localhost/foo','https://u:p@apple.com/shop']) assert.throws(()=>check({product}));
  assert.throws(()=>safeUrl('ftp://example.com'));
});
test('merchant spoof domain never gets known retailer privileges', () => {
  const p=normalizePurchase({...input,merchant:'',product:'https://bestbuy.com.evil.example/monitor'},now);
  assert.equal(p.merchant,null);
});
test('a materially cheaper reported comparable path generates SWITCH', () => {
  const r=check({alternative_price:1321,alternative_url:'https://example.com/alienware-monitor',alternative_confirmed:true});
  assert.equal(r.verdict,'SWITCH');assert.equal(r.potential_savings,178);assert.equal(r.confidence,'Medium');
  assert.match(r.savings_basis,/reported/);
});
test('same retailer lower price generates conditional NEGOTIATE', () => {
  const r=check({alternative_price:1321,alternative_url:'https://bestbuy.com/site/monitor/456',alternative_confirmed:true});
  assert.equal(r.verdict,'NEGOTIATE');
});
test('BUY requires comparable terms and checked protections', () => {
  const alt={alternative_price:1510,alternative_url:'https://example.com/monitor',alternative_confirmed:true};
  assert.equal(check(alt).verdict,null);assert.equal(check({...alt,terms_confirmed:true}).verdict,'BUY');
});
test('clearly poor economics generate DON’T BUY', () => {
  assert.equal(check({alternative_price:800,alternative_url:'https://example.com/monitor',alternative_confirmed:true}).verdict,'DON’T BUY');
});
test('unconfirmed or partial alternative cannot affect score or savings', () => {
  assert.equal(check({alternative_price:1000,alternative_url:'https://example.com/monitor'}).potential_savings,null);
  assert.throws(()=>check({alternative_price:1000}));
});
test('conflicting savings paths use maximum, not sum', () => {
  const r=check({merchant:'Target',current_price:500,target_card_eligible:true,alternative_price:450,alternative_url:'https://example.com/monitor',alternative_confirmed:true});
  assert.equal(r.potential_savings,50);assert.equal(r.better_option.price,450);
  assert.equal(canStack(records.find(r=>r.id==='target-card'),records.find(r=>r.id==='target-adjustment')),false);
});
test('stale, suspended, and unverified records never generate confident savings', () => {
  const p=normalizePurchase({...input,merchant:'Target',target_card_eligible:true},now);
  const stale=evaluatePurchase(p,records,new Date('2027-01-01'));
  assert.equal(stale.potential_savings,null);assert.ok(stale.loopholes.every(l=>!l.trusted));
  assert.equal(matchLoopholes(p,records.map(r=>({...r,status:'Suspended'})),now).length,0);
  assert.equal(evaluatePurchase(p,records.map(r=>({...r,verification_status:'REPORTED'})),now).potential_savings,null);
});
test('brand and warranty categories match narrowly', () => {
  const r=check({product:'Samsung monitor',merchant:'Costco'});assert.ok(!r.loopholes.some(l=>l.id==='apple-refurbished'||l.id==='costco-warranty'));
  const apple=check({product:'Apple MacBook Pro 14 inch',merchant:'Apple'});assert.ok(apple.loopholes.some(l=>l.id==='apple-refurbished'));
  assert.ok(!check({product:'Apple MacBook Pro',merchant:'Apple',willing_to_buy_used:false}).loopholes.some(l=>l.id==='apple-refurbished'));
});
test('excluded gift cards do not earn modeled Target discounts', () => {
  const r=check({product:'Target gift card',merchant:'Target',target_card_eligible:true});assert.equal(r.potential_savings,null);
});


test('Marketplace seller and unknown seller do not inherit direct retail policies', () => {
  const product='https://www.bestbuy.com/product/dell-monitor/J3K4L6CF8H/sku/13059019';
  for(const seller of ['', 'TECHNOLOGY TRADERS INC']) {
    const r=check({product,seller});
    assert.equal(r.loopholes.length,0); assert.equal(r.score,null);
  }
  assert.ok(check({product,seller:'Best Buy'}).loopholes.length>0);
});
test('unknown condition is retained instead of silently assuming new', () => {
  const p=normalizePurchase({...input,condition:''},now);
  assert.equal(p.condition,'unknown');
  assert.ok(!evaluatePurchase(p,records,now).loopholes.some(r=>r.id==='best-buy-match'));
});


test('missing current price can produce an explicit research result without fake zero-dollar pricing',()=>{
 const p=normalizePurchase({...input,current_price:''},now,true);const r=evaluatePurchase(p,records,now);
 assert.equal(p.current_price,null);assert.equal(r.verdict,null);assert.equal(r.evaluation_status,'needs_price');assert.equal(r.score,null);assert.equal(r.potential_savings,null);
});
