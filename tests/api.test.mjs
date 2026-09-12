import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkPurchase, captureOutcome, metrics, summarizeMetrics } from '../lib/api.mjs';
import { fileStorage } from '../lib/storage.mjs';
const base='http://localhost:4174';
const req=(body,path='/api/check-purchase',token)=>new Request(base+path,{method:'POST',headers:{'Content-Type':'application/json',Origin:base,...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});
const input={product:'Sony headphones',current_price:500,merchant:'Target',condition:'new',target_card_eligible:true};
const newStore=async()=>fileStorage(await mkdtemp(join(tmpdir(),'loophole-test-')));
test('purchase and outcomes persist, token is private, updates do not double count',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'loophole-test-'));
  const db=fileStorage(directory);
  const response=await checkPurchase(req(input),{},db);assert.equal(response.status,201);
  const result=await response.json();assert.equal(result.verdict,'SWITCH');assert.equal(result.feedback_token.length,64);
  const stored=await fileStorage(directory).get('purchases/'+result.purchase.id);assert.ok(stored);assert.equal(stored.feedback_token,undefined);
  const feedback={purchase_id:result.purchase.id,kind:'useful',useful:true};
  assert.equal((await captureOutcome(req(feedback,'/api/outcome',result.feedback_token),{},db)).status,200);
  assert.equal((await captureOutcome(req({...feedback,useful:false},'/api/outcome',result.feedback_token),{},db)).status,200);
  const outcome={purchase_id:result.purchase.id,kind:'decision',action_taken:'bought',reported_savings:25};
  for(let i=0;i<2;i++)assert.equal((await captureOutcome(req(outcome,'/api/outcome',result.feedback_token),{},db)).status,200);
  const summary=await summarizeMetrics(db);assert.equal(summary.purchase_checks_completed,1);assert.equal(summary.useful_votes,1);assert.equal(summary.useful_percent,0);assert.equal(summary.reported_savings,25);assert.equal(summary.purchases_completed,1);assert.equal(summary.verified_user_savings,0);
});
test('feedback requires purchase capability and valid savings',async()=>{
  const db=await newStore();const result=await(await checkPurchase(req(input),{},db)).json();
  const outcome={purchase_id:result.purchase.id,kind:'decision',action_taken:'bought',reported_savings:501};
  assert.equal((await captureOutcome(req(outcome,'/api/outcome'),{},db)).status,401);
  assert.equal((await captureOutcome(req(outcome,'/api/outcome','a'.repeat(64)),{},db)).status,404);
  assert.equal((await captureOutcome(req(outcome,'/api/outcome',result.feedback_token),{},db)).status,400);
  assert.equal((await captureOutcome(req({...outcome,reported_savings:-1},'/api/outcome',result.feedback_token),{},db)).status,400);
  assert.equal((await captureOutcome(req({...outcome,reported_savings:0,loophole_id:'invented'},'/api/outcome',result.feedback_token),{},db)).status,400);
});
test('API methods, body limits, invalid inputs, and origins handled',async()=>{
  const db=await newStore();
  assert.equal((await checkPurchase(new Request(base),{},db)).status,405);
  assert.equal((await checkPurchase(req({...input,current_price:''}),{},db)).status,400);
  assert.equal((await checkPurchase(req({...input,product:'a'.repeat(13000)}),{},db)).status,413);
  assert.equal((await checkPurchase(new Request(base,{method:'POST',headers:{'Content-Type':'application/json'},body:'null'}),{},db)).status,400);
  assert.equal((await checkPurchase(new Request(base,{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://evil.example'},body:JSON.stringify(input)}),{},db)).status,403);
});
test('storage failure is visible rather than claiming success',async()=>{
  const db={set:async()=>{throw new Error('storage unavailable');}};
  assert.equal((await checkPurchase(req(input),{},db)).status,503);
});
test('changing bought to wait replaces the decision and public input cannot verify savings',async()=>{
  const db=await newStore();const r=await(await checkPurchase(req(input),{},db)).json();
  const outcome={purchase_id:r.purchase.id,kind:'decision',action_taken:'bought',reported_savings:25,verified_savings:25,verification_status:'VERIFIED'};
  await captureOutcome(req(outcome,'/api/outcome',r.feedback_token),{},db);
  assert.equal((await summarizeMetrics(db)).verified_user_savings,0);
  await captureOutcome(req({purchase_id:r.purchase.id,kind:'decision',action_taken:'wait'},'/api/outcome',r.feedback_token),{},db);
  const summary=await summarizeMetrics(db);assert.equal(summary.purchases_completed,0);assert.equal(summary.reported_savings,0);
});
test('metrics locked and verification requires private evidence record',async()=>{
  const db=await newStore();assert.equal((await metrics(new Request(base+'/api/metrics'),{},db)).status,401);
  const r=await(await checkPurchase(req(input),{},db)).json();
  await db.set('verifications/'+r.purchase.id,{purchase_id:r.purchase.id,verified_savings:20,evidence_reference:'private review reference',reviewer:'founder',reviewed_at:new Date().toISOString()});
  assert.equal((await summarizeMetrics(db)).verified_user_savings,20);
});


test('server-held lookup fills the exact purchase and provides citation-backed alternatives',async()=>{
 const db=await newStore();const id='c19cb172-5d79-4ee6-8d79-6b1952b978f8';const url='https://www.amazon.com/dp/B0D1TX35MQ';
 await db.set('lookups/'+id,{lookup_id:id,url,observed_at:new Date().toISOString(),product_name:'Dell U4025QW monitor',model:'U4025QW',price:2000,seller:'Actual Seller',condition:'new',search_status:'searched',message:'Sourced offers',sources:[{url,title:'Amazon offer',excerpt:'$2000.00'}],alternatives:[{url:'https://dell.com/en-us/shop/monitor',price:1800,model:'U4025QW',condition:'new',availability:'InStock',sources:[]}]});
 const response=await checkPurchase(req({product:url,lookup_id:id,current_price:'',condition:'unknown'}),{},db);
 const storedLookup=await db.get('lookups/'+id);assert.equal(storedLookup.product_name,'Dell U4025QW monitor');
 const r=await response.json();assert.equal(response.status,201);assert.equal(r.purchase.current_price,2000);assert.equal(r.purchase.seller,'Actual Seller');assert.equal(r.verdict,'SWITCH');assert.equal(r.better_option.source_type,'SOURCE_REPORTED');assert.equal(r.market_evidence.alternatives.length,1);
 assert.equal(r.purchase.category,'electronics');
});
