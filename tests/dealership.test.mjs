import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { matchVehicles } from '../lib/dealership-engine.mjs';
import { dealershipHandlers } from '../lib/dealership-api.mjs';
const context={local:true};
const base={budget:'any',seats:'5',kids:'no',dogs:'no',cargo:'normal',powertrain:['Gas','Hybrid','Plug-in hybrid','Electric'],daily:'20-50',trips:'few',camping:'never',offroad:'never',weather:'no',towing:'never',size:'any',priorities:['Low price','Fuel economy','Cargo room']};
const post=(fn,obj)=>fn(new Request('http://localhost/api/dealership',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(obj)}),context);
const get=(fn,query)=>fn(new Request('http://localhost/api/dealership?'+new URLSearchParams(query)),context);

test('hard filters preserve budget, seats, towing, powertrain, and distinct model families',()=>{
  const all=matchVehicles(base);
  assert.ok(all.length>0&&all.length<=3);
  assert.equal(new Set(all.map(x=>x.car.make+'|'+x.car.model)).size,all.length);
  assert.ok(matchVehicles({...base,budget:'under25'}).every(x=>x.car.startingMSRP<25000));
  assert.ok(matchVehicles({...base,seats:'8'}).every(x=>x.car.seats>=8));
  assert.ok(matchVehicles({...base,towing:'under3500'}).every(x=>x.car.towingCapacity>=3500));
  assert.ok(matchVehicles({...base,powertrain:['Hybrid']}).every(x=>x.car.powertrain==='Hybrid'));
  assert.ok(matchVehicles({...base,powertrain:['Electric']}).some(x=>x.car.id==='hyundai-ioniq-5-electric'));
});

test('anonymous response and photos stay blind until a one-time choice is locked',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'dealership-test-'));process.env.LOOPHOLE_LOCAL_DATA_DIR=dir;
  try{
    const started=await post(dealershipHandlers.start,{answers:base});assert.equal(started.status,201);
    const {sessionId}=await started.json();
    const blindResponse=await get(dealershipHandlers.session,{session:sessionId});
    const raw=await blindResponse.text();const blind=JSON.parse(raw);
    assert.equal(blind.locked,false);assert.ok(blind.candidates.length>0&&blind.candidates.length<=3);
    assert.doesNotMatch(raw,/Honda|Subaru|Hyundai|Ioniq|Civic|Forester|Pilot|\.jpg|sourceUrl|revealedAsset|revealedImageUrl/);
    assert.ok(blind.candidates.every(x=>/\/anonymous\/[a-z0-9]+\.png$/.test(x.anonymousImageUrl)));
    const first=blind.candidates[0].anonymousId;
    const denied=await get(dealershipHandlers.image,{session:sessionId,car:first});assert.equal(denied.status,403);
    const lock=await post(dealershipHandlers.lock,{sessionId,anonymousId:first});assert.equal(lock.status,201);
    const repeated=await post(dealershipHandlers.lock,{sessionId,anonymousId:first});assert.equal(repeated.status,409);
    const opened=await get(dealershipHandlers.session,{session:sessionId});const reveal=await opened.json();
    assert.ok(reveal.reveal.some(x=>x.make&&x.model&&x.revealedImageUrl));
    assert.equal((await get(dealershipHandlers.image,{session:sessionId,car:first})).status,200);
    const postChoice=reveal.reveal.find(x=>x.anonymousId!==first)?.anonymousId??null;
    const decision=await post(dealershipHandlers.decision,{sessionId,anonymousId:postChoice});assert.equal(decision.status,201);
    assert.equal((await decision.json()).changed,true);
    assert.equal((await post(dealershipHandlers.decision,{sessionId,anonymousId:first})).status,409);
  }finally{await rm(dir,{recursive:true,force:true});delete process.env.LOOPHOLE_LOCAL_DATA_DIR;}
});
