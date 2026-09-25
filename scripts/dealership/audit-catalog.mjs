import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { catalog } from '../../data/dealership/catalog.mjs';
import { seatingEvidence, seatingVariantEvidence } from '../../data/dealership/seating-evidence.mjs';
import { filterVehicles, matchVehicles } from '../../lib/dealership-engine.mjs';

const errors=[];
// Pinned fields from the US EPA 2026 fuel-economy CSV, indexed by EPA vehicle ID.
const epa=JSON.parse(readFileSync(resolve('data/dealership/epa-reference.json'),'utf8'));
const roster=JSON.parse(readFileSync(resolve('data/dealership/epa-model-roster.json'),'utf8'));
const manufacturerRoster=JSON.parse(readFileSync(resolve('data/dealership/manufacturer-model-roster.json'),'utf8'));
const renderReview=JSON.parse(readFileSync(resolve('data/dealership/render-review.json'),'utf8'));
const seenIds=new Set();
const coveredGroups=new Map();
const verified=[];
const research=[];
const activeImages=new Map();
const base={budget:'any',seats:'5',kids:'no',dogs:'no',cargo:'normal',powertrain:['Gas'],daily:'20-50',trips:'few',camping:'never',offroad:'never',weather:'no',towing:'never',size:'any',priorities:['Low price','Fuel economy','Cargo room']};
for(const car of catalog){
  if(seenIds.has(car.id))errors.push(`${car.id}: duplicate id`);
  seenIds.add(car.id);
  const groupKey=[car.make,car.model,car.powertrain].join('|');
  if(coveredGroups.has(groupKey))errors.push(`${car.id}: duplicate model/powertrain group with ${coveredGroups.get(groupKey)}`);
  coveredGroups.set(groupKey,car.id);
  if(!car.id||!car.make||!car.model||!(car.year===2026||(car.year===2027&&car.epaId==null))||!/^https:\/\//.test(car.sourceUrl??''))errors.push(`${car.id}: missing identity, supported model year, or source URL`);
  const rated=car.epaId==null?null:epa[car.epaId];
  if(car.epaId!=null&&!rated)errors.push(`${car.id}: EPA source row missing`);
  if(car.epaId==null&&car.dataStatus!=='manufacturer-listed; configuration unverified')errors.push(`${car.id}: EPA id missing outside manufacturer roster`);
  else if(rated) {
    if(car.year!==Number(rated.year)||car.make.toLowerCase()!==rated.make.toLowerCase())errors.push(`${car.id}: EPA make or year mismatch`);
    if(car.drivetrain!==rated.drive)errors.push(`${car.id}: EPA drivetrain mismatch`);
    const expectedPowertrain={'Gas':'','Hybrid':'Hybrid','Plug-in hybrid':'Plug-in Hybrid','Electric':'EV','Diesel':'Diesel','Flex fuel':'FFV','Hydrogen fuel cell':'FCV','Plug-in fuel cell':'eFCV'}[car.powertrain];
    if(expectedPowertrain===undefined||expectedPowertrain!==rated.atvType)errors.push(`${car.id}: EPA powertrain mismatch`);
    const expectedFuel=rated.fuelType.startsWith('Premium')?'Premium Gasoline':rated.fuelType.startsWith('Regular')?'Regular Gasoline':({'Electricity':'Electricity','Midgrade':'Midgrade Gasoline','Diesel':'Diesel','Gasoline or E85':'Flex fuel','Hydrogen':'Hydrogen','Electricity and Hydrogen':'Electricity and Hydrogen'})[rated.fuelType];
    if(car.fuelType!==expectedFuel)errors.push(`${car.id}: EPA fuel type mismatch`);
    if(car.powertrain==='Electric'){
      if(car.mpgeCombined!==Number(rated.comb08)||car.evRange!==Number(rated.range))errors.push(`${car.id}: EPA electric efficiency or range mismatch`);
    }else {
      if(car.mpgCombined!==Number(rated.comb08))errors.push(`${car.id}: EPA combined MPG mismatch`);
      if(car.powertrain==='Plug-in hybrid'&&(car.mpgeCombined!==Number(rated.combA08)||car.evRange!==Number(rated.rangeA)))errors.push(`${car.id}: EPA plug-in MPGe or electric-range mismatch`);
    }
  }
  if(!['verified-eligible','EPA-rated; retail and dimensions unverified','manufacturer-listed; configuration unverified'].includes(car.dataStatus))errors.push(`${car.id}: unknown catalog status`);
  if(car.dataStatus!=='verified-eligible'){research.push(car);continue;}
  verified.push(car);
  for(const key of ['startingMSRP','seats','length','width','height','wheelbase'])if(!(Number.isFinite(car[key])&&car[key]>0))errors.push(`${car.id}: missing ${key}`);
  if(!/^[a-z0-9]+\.png$/.test(car.anonymousAsset??'')||!existsSync(resolve('assets/dealership/anonymous',car.anonymousAsset??'')))errors.push(`${car.id}: anonymous asset missing or identifiable filename`);
  else activeImages.set(car.anonymousAsset,[...(activeImages.get(car.anonymousAsset)||[]),car.id]);
  if(!/^[a-z0-9-]+\.jpg$/.test(car.revealedAsset??'')||!existsSync(resolve('server-assets/dealership/revealed',car.revealedAsset??'')))errors.push(`${car.id}: reveal photo missing`);
  if(Number.isFinite(car.seats)&&car.seats>0&&car.startingMSRP!=null&&car.length!=null&&car.width!=null){
    const answers={...base,seats:String(Math.min(car.seats,8)),powertrain:[car.powertrain]};
    if(!matchVehicles(answers).some(result=>result.car.id===car.id))errors.push(`${car.id}: cannot enter a finalist set`);
  }
}
const reviewedImages=new Set();
for(const review of renderReview.assets){
  if(reviewedImages.has(review.asset))errors.push(`${review.asset}: duplicate render review`);
  reviewedImages.add(review.asset);
  const path=resolve('assets/dealership/anonymous',review.asset);
  if(!/^[a-z0-9]+\.png$/.test(review.asset)||!existsSync(path)){errors.push(`${review.asset}: reviewed image is missing`);continue;}
  const bytes=readFileSync(path);
  const digest=createHash('sha256').update(bytes).digest('hex');
  if(digest!==review.sha256)errors.push(`${review.asset}: render changed since visual review`);
  if(bytes.subarray(1,4).toString()!=='PNG'||bytes.readUInt32BE(16)!==1536||bytes.readUInt32BE(20)!==1024)errors.push(`${review.asset}: render must be a 1536×1024 PNG`);
  if(review.visualReview!=='passed'||!/^20\d\d-\d\d-\d\d$/.test(review.reviewedAt)||!['anonymous','body-style','seating-layout','powertrain-cues','studio-composition'].every(check=>review.checks?.includes(check)))errors.push(`${review.asset}: visual review incomplete`);
  const expected=activeImages.get(review.asset)||[];
  if(JSON.stringify([...expected].sort())!==JSON.stringify([...(review.carIds||[])].sort()))errors.push(`${review.asset}: review does not match current catalog records`);
}
for(const asset of activeImages.keys())if(!reviewedImages.has(asset))errors.push(`${asset}: eligible render has no visual review`);
for(const [asset,ids] of activeImages){
  const powertrains=new Set(verified.filter(car=>ids.includes(car.id)).map(car=>car.powertrain));
  if(powertrains.size>1)errors.push(`${asset}: one structural render cannot represent multiple powertrains`);
}
const makes=new Set(catalog.map(car=>car.make));
const models=new Set(catalog.map(car=>`${car.make}|${car.model}`));
const eligibleModels=new Set(verified.map(car=>`${car.make}|${car.model}`));
const sevenSeatMatches=new Set(filterVehicles({seats:'7'}).map(result=>`${result.car.make}|${result.car.model}`));
for(const [family,evidence] of seatingEvidence){
  if(!models.has(family))errors.push(`${family}: seating source has no catalog model`);
  if(!/^https:\/\//.test(evidence.url)||!Number.isInteger(evidence.maxSeats)||evidence.maxSeats<7)errors.push(`${family}: invalid manufacturer seating evidence`);
  if(!sevenSeatMatches.has(family))errors.push(`${family}: verified 7-seat configuration cannot enter filter results`);
}
for(const [id,evidence] of seatingVariantEvidence){
  if(!seenIds.has(id)||!/^https:\/\//.test(evidence.url))errors.push(`${id}: invalid variant seating evidence`);
}
const blockedMakes=[...makes].filter(make=>!verified.some(car=>car.make===make)).sort();
for(const entry of roster){
  const key=[entry.make,entry.model,entry.powertrain].join('|');
  const car=catalog.find(record=>[record.make,record.model,record.powertrain].join('|')===key);
  if(!car)errors.push(`EPA-rated model/powertrain absent from catalog: ${key}`);
  else if(!entry.epaIds.includes(car.epaId))errors.push(`${car.id}: EPA row does not belong to roster group ${key}`);
}
for(const entry of manufacturerRoster){
  const key=[entry.make,entry.model,entry.powertrain].join('|');
  const car=catalog.find(record=>[record.make,record.model,record.powertrain].join('|')===key);
  if(!car)errors.push(`Manufacturer-listed model absent from catalog: ${key}`);
  else if(car.epaId!=null||car.year!==(entry.year??2026)||car.sourceUrl!==entry.sourceUrl||car.dataStatus!=='manufacturer-listed; configuration unverified')errors.push(`${car.id}: manufacturer source, year, or status mismatch`);
}
if(coveredGroups.size!==roster.length+manufacturerRoster.length)errors.push(`Catalog and source roster group counts differ: ${coveredGroups.size} vs ${roster.length+manufacturerRoster.length}`);
console.log(`${catalog.length} records, ${models.size} models, ${makes.size} makes. ${verified.length} fully verified records / ${eligibleModels.size} model families enter the quiz; ${research.length} partial records remain available to the needs-first catalog filter with clear evidence gaps.`);
console.log(`Pinned 2026 EPA roster: ${roster.length} model/powertrain groups covered.`);
console.log(`Manufacturer-only roster: ${manufacturerRoster.length} additional current models covered.`);
console.log(`Seating audit: ${seatingEvidence.size} sourced 7+ seat families; ${sevenSeatMatches.size} distinct 7+ seat filter matches.`);
console.log(`Makes without a quiz-eligible model (${blockedMakes.length}): ${blockedMakes.join(', ')}`);
if(errors.length){for(const error of errors)console.error(error);process.exitCode=1;}
else console.log('Verified records have valid assets and a path into the results.');
