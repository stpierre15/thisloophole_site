import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { filterVehicles, matchVehicles, maxFinalists, validateFilters } from '../lib/dealership-engine.mjs';
import { catalog } from '../data/dealership/catalog.mjs';
import { seatingEvidence } from '../data/dealership/seating-evidence.mjs';
import { dealershipHandlers } from '../lib/dealership-api.mjs';
const context={local:true};
const base={budget:'any',seats:'5',kids:'no',dogs:'no',cargo:'normal',powertrain:['Gas','Hybrid','Plug-in hybrid','Electric'],daily:'20-50',trips:'few',camping:'never',offroad:'never',weather:'no',towing:'never',size:'any',priorities:['Low price','Fuel economy','Cargo room']};
const post=(fn,obj)=>fn(new Request('http://localhost/api/dealership',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(obj)}),context);
const get=(fn,query)=>fn(new Request('http://localhost/api/dealership?'+new URLSearchParams(query)),context);

test('the research catalog covers the requested US-market makes',()=>{
  const makes=new Set(catalog.map(car=>car.make));
  for(const make of ['Acura','Audi','BMW','Buick','Cadillac','Chevrolet','Chrysler','Dodge','Fiat','Ford','Genesis','GMC','Honda','Hyundai','Infiniti','Jeep','Kia','Land Rover','Lexus','Lincoln','Lucid','Mazda','Mercedes-Benz','Mini','Mitsubishi','Nissan','Polestar','Porsche','Ram','Rivian','Subaru','Tesla','Toyota','Volkswagen','Volvo']) assert.ok(makes.has(make),make);
});

test('the catalog includes key models formerly omitted by a partial EPA import',()=>{
  const models=new Set(catalog.map(car=>`${car.make}|${car.model}`));
  for(const name of ['Toyota|Land Cruiser','Toyota|GR86','Chevrolet|Suburban','Chevrolet|Silverado EV','GMC|HUMMER EV SUV','Ford|F-150','BMW|M3','Land Rover|Range Rover Sport']) {
    assert.ok(models.has(name),`${name} is missing from the catalog`);
  }
});

test('hard filters preserve budget, seats, towing, powertrain, and distinct model families',()=>{
  const all=matchVehicles(base);
  assert.equal(maxFinalists,10);
  assert.equal(all.length,10);
  assert.equal(new Set(all.map(x=>x.car.make+'|'+x.car.model)).size,all.length);
  assert.ok(matchVehicles({...base,budget:'under25'}).every(x=>x.car.startingMSRP<25000));
  assert.ok(matchVehicles({...base,seats:'8'}).every(x=>x.car.seats>=8));
  assert.ok(matchVehicles({...base,towing:'under3500'}).every(x=>x.car.towingCapacity>=3500));
  assert.ok(matchVehicles({...base,powertrain:['Hybrid']}).every(x=>x.car.powertrain==='Hybrid'));
  assert.ok(matchVehicles({...base,powertrain:['Electric']}).some(x=>x.car.id==='hyundai-ioniq-5-electric'));
});

test('new mainstream brands can each enter a blind finalist set',()=>{
  const scenarios={
    Chevrolet:{budget:'under25',powertrain:['Gas'],size:'small'},
    GMC:{budget:'25-35',powertrain:['Gas'],size:'medium',cargo:'a-lot',weather:'yes'},
    Ford:{budget:'25-35',powertrain:['Hybrid'],size:'large',cargo:'bulky',priorities:['Cargo room','Towing','Fuel economy']},
    Dodge:{budget:'35-45',powertrain:['Gas'],seats:'7',size:'large',towing:'under3500',priorities:['Towing','Passenger room','Performance']},
  };
  for(const [make,changes] of Object.entries(scenarios)) {
    assert.ok(matchVehicles({...base,...changes}).some(result=>result.car.make===make),`${make} should be a finalist`);
  }
});

test('a no-budget seven-seat search can consider the Yukon XL when large vehicles are allowed',()=>{
  const answers={...base,budget:'any',seats:'7',kids:'three',cargo:'a-lot',size:'large',priorities:['Passenger room','Cargo room','Low price']};
  assert.ok(matchVehicles(answers).some(result=>result.car.id==='gmc-yukon-xl-gas'));
  assert.ok(matchVehicles({...answers,size:'medium'}).every(result=>result.car.id!=='gmc-yukon-xl-gas'));
});

test('the Sequoia can surface beside other seven-seat choices',()=>{
  const answers={...base,budget:'any',seats:'7',kids:'three',cargo:'a-lot',size:'large',priorities:['Passenger room','Cargo room','Towing']};
  assert.ok(matchVehicles(answers).some(result=>result.car.id==='toyota-sequoia-hybrid'));
});

test('every verified configuration has a valid path into a finalist set',()=>{
  for(const car of catalog.filter(record=>record.dataStatus==='verified-eligible')) {
    const answers={...base,budget:'any',seats:String(Math.min(car.seats,8)),powertrain:[car.powertrain],size:'any',towing:'never'};
    assert.ok(matchVehicles(answers).some(result=>result.car.id===car.id),`${car.id} cannot surface`);
  }
});

test('needs-first filters enforce seats, cargo, drivetrain, and powertrain without entering the quiz',()=>{
  const all=filterVehicles({});
  assert.equal(all.length,new Set(catalog.map(car=>`${car.make}|${car.model}`)).size,'every catalog model needs an unfiltered path');
  assert.ok(all.some(result=>result.car.model==='Sequoia'));
  assert.ok(all.some(result=>result.car.model==='Land Cruiser'));
  const family=new Set(all.map(result=>`${result.car.make}|${result.car.model}`));
  assert.equal(family.size,all.length);
  const roomy=filterVehicles({seats:'7',cargo:'huge'});
  assert.deepEqual(roomy.filter(result=>!result.verificationNeeded.length).map(result=>result.car.model),['Yukon XL']);
  assert.ok(filterVehicles({drivetrain:'awd-standard'}).every(result=>['All-Wheel Drive','4-Wheel Drive'].includes(result.car.drivetrain)||result.verificationNeeded.includes('Drivetrain')));
  assert.ok(filterVehicles({drivetrain:'awd-capable'}).every(result=>result.car.awdAvailable===true||result.verificationNeeded.includes('AWD/4WD availability')));
  assert.ok(filterVehicles({powertrain:'Electric'}).every(result=>result.car.powertrain==='Electric'));
  assert.ok(filterVehicles({budget:'under25'}).every(result=>result.car.startingMSRP==null?result.verificationNeeded.includes('Starting price'):result.car.startingMSRP<25000));
  assert.throws(()=>validateFilters({cargo:'enormous'}),/Invalid filter/);
});

test('manufacturer-backed seven-seat options are findable without fabricated specs',()=>{
  const seven=filterVehicles({seats:'7'});
  const names=new Set(seven.map(result=>`${result.car.make}|${result.car.model}`));
  assert.ok(seven.length>=50,`Only ${seven.length} seven-seat models surfaced`);
  for(const family of seatingEvidence.keys())assert.ok(names.has(family),`${family} has seating evidence but no filter path`);
  for(const family of ['GMC|Yukon XL','Toyota|Sequoia','Toyota|Grand Highlander','Lexus|GX','Volkswagen|Atlas','Tesla|Model Y','Rivian|R1S','Kia|Telluride'])assert.ok(names.has(family),family);
  assert.ok(!names.has('Toyota|Land Cruiser'));
  assert.ok(!filterVehicles({seats:'7',powertrain:'Hybrid'}).some(result=>result.car.id==='lexus-tx-hybrid'));
  assert.ok(!filterVehicles({seats:'7',powertrain:'Plug-in hybrid'}).some(result=>result.car.id==='kia-sorento-plug-in-hybrid'));
  assert.ok(filterVehicles({seats:'7',powertrain:'Plug-in hybrid'}).some(result=>result.car.id==='mazda-cx-90-plug-in-hybrid'));
  assert.ok(filterVehicles({seats:'7',powertrain:'Hybrid'}).some(result=>result.car.id==='kia-telluride-hybrid'));
  assert.ok(seven.some(result=>result.car.startingMSRP==null),'unknown price should not hide a seating match');
  assert.ok(filterVehicles({seats:'7',budget:'80-120'}).every(result=>result.car.startingMSRP==null?result.verificationNeeded.includes('Starting price'):result.car.startingMSRP<=120000));
  assert.ok(filterVehicles({seats:'7',size:'medium'}).every(result=>result.car.length==null||result.car.width==null?result.verificationNeeded.includes('Exterior dimensions'):true));
});

test('filter preview and filtered session stay blind through selection',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'dealership-filter-test-'));process.env.LOOPHOLE_LOCAL_DATA_DIR=dir;
  try{
    const filters={seats:'7',cargo:'medium'};
    const preview=await post(dealershipHandlers.filter,{filters,preview:true});
    assert.equal(preview.status,200);
    const previewData=await preview.json();assert.ok(previewData.count>=50);assert.equal(previewData.confirmedCount,1);
    const started=await post(dealershipHandlers.filter,{filters});
    assert.equal(started.status,201);
    const {sessionId,count}=await started.json();assert.equal(count,previewData.count);
    const blind=await get(dealershipHandlers.session,{session:sessionId});
    const raw=await blind.text();const data=JSON.parse(raw);
    assert.equal(data.mode,'filters');assert.equal(data.filters.seats,'7');
    assert.equal(data.candidates.length,count);assert.equal(data.confirmedCount,1);
    assert.equal(data.candidates[0].matchPercent,null);
    assert.doesNotMatch(raw,/Yukon|GMC|\.jpg|revealedAsset/);
    assert.equal((await post(dealershipHandlers.lock,{sessionId,anonymousId:data.candidates[0].anonymousId})).status,201);
    const opened=await get(dealershipHandlers.session,{session:sessionId});
    assert.equal((await opened.json()).reveal[0].model,'Yukon XL');
  }finally{await rm(dir,{recursive:true,force:true});delete process.env.LOOPHOLE_LOCAL_DATA_DIR;}
});

test('anonymous response and photos stay blind until a one-time choice is locked',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'dealership-test-'));process.env.LOOPHOLE_LOCAL_DATA_DIR=dir;
  try{
    const started=await post(dealershipHandlers.start,{answers:base});assert.equal(started.status,201);
    const {sessionId}=await started.json();
    const blindResponse=await get(dealershipHandlers.session,{session:sessionId});
    const raw=await blindResponse.text();const blind=JSON.parse(raw);
    assert.equal(blind.locked,false);assert.ok(blind.candidates.length>0&&blind.candidates.length<=10);
    assert.doesNotMatch(raw,/Honda|Subaru|Hyundai|Ioniq|Civic|Forester|Pilot|\.jpg|sourceUrl|revealedAsset|revealedImageUrl/);
    for(const car of catalog.filter(record=>record.dataStatus==='verified-eligible')){
      assert.ok(!raw.includes(`"${car.make}"`),`${car.make} leaked before reveal`);
      assert.ok(!raw.includes(`"${car.model}"`),`${car.model} leaked before reveal`);
    }
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
