import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { catalog } from '../../data/dealership/catalog.mjs';
import { matchVehicles } from '../../lib/dealership-engine.mjs';

const errors=[];
// Pinned fields from the US EPA 2026 fuel-economy CSV, indexed by EPA vehicle ID.
const epa=JSON.parse(readFileSync(resolve('data/dealership/epa-reference.json'),'utf8'));
const seenIds=new Set();
const verified=[];
const research=[];
const base={budget:'any',seats:'5',kids:'no',dogs:'no',cargo:'normal',powertrain:['Gas'],daily:'20-50',trips:'few',camping:'never',offroad:'never',weather:'no',towing:'never',size:'any',priorities:['Low price','Fuel economy','Cargo room']};
for(const car of catalog){
  if(seenIds.has(car.id))errors.push(`${car.id}: duplicate id`);
  seenIds.add(car.id);
  if(!car.id||!car.make||!car.model||car.year!==2026||!/^https:\/\//.test(car.sourceUrl??''))errors.push(`${car.id}: missing identity, 2026 year, or source URL`);
  const rated=epa[car.epaId];
  if(!rated)errors.push(`${car.id}: EPA source row missing`);
  else {
    if(car.year!==Number(rated.year)||car.make.toLowerCase()!==rated.make.toLowerCase())errors.push(`${car.id}: EPA make or year mismatch`);
    if(car.drivetrain!==rated.drive)errors.push(`${car.id}: EPA drivetrain mismatch`);
    const expectedPowertrain={'Gas':'','Hybrid':'Hybrid','Plug-in hybrid':'Plug-in Hybrid','Electric':'EV'}[car.powertrain];
    if(expectedPowertrain===undefined||expectedPowertrain!==rated.atvType)errors.push(`${car.id}: EPA powertrain mismatch`);
    const expectedFuel=rated.fuelType==='Electricity'?'Electricity':rated.fuelType.startsWith('Premium')?'Premium Gasoline':'Regular Gasoline';
    if(car.fuelType!==expectedFuel)errors.push(`${car.id}: EPA fuel type mismatch`);
    if(car.powertrain==='Electric'){
      if(car.mpgeCombined!==Number(rated.comb08)||car.evRange!==Number(rated.range))errors.push(`${car.id}: EPA electric efficiency or range mismatch`);
    }else {
      if(car.mpgCombined!==Number(rated.comb08))errors.push(`${car.id}: EPA combined MPG mismatch`);
      if(car.powertrain==='Plug-in hybrid'&&(car.mpgeCombined!==Number(rated.combA08)||car.evRange!==Number(rated.rangeA)))errors.push(`${car.id}: EPA plug-in MPGe or electric-range mismatch`);
    }
  }
  if(!['verified-eligible','EPA-rated; retail and dimensions unverified'].includes(car.dataStatus))errors.push(`${car.id}: unknown catalog status`);
  if(car.dataStatus!=='verified-eligible'){research.push(car);continue;}
  verified.push(car);
  for(const key of ['startingMSRP','seats','length','width','height','wheelbase'])if(!(Number.isFinite(car[key])&&car[key]>0))errors.push(`${car.id}: missing ${key}`);
  if(!/^[a-z0-9]+\.png$/.test(car.anonymousAsset??'')||!existsSync(resolve('assets/dealership/anonymous',car.anonymousAsset??'')))errors.push(`${car.id}: anonymous asset missing or identifiable filename`);
  if(!/^[a-z0-9-]+\.jpg$/.test(car.revealedAsset??'')||!existsSync(resolve('server-assets/dealership/revealed',car.revealedAsset??'')))errors.push(`${car.id}: reveal photo missing`);
  if(Number.isFinite(car.seats)&&car.seats>0&&car.startingMSRP!=null&&car.length!=null&&car.width!=null){
    const answers={...base,seats:String(Math.min(car.seats,8)),powertrain:[car.powertrain]};
    if(!matchVehicles(answers).some(result=>result.car.id===car.id))errors.push(`${car.id}: cannot enter a finalist set`);
  }
}
const makes=new Set(catalog.map(car=>car.make));
const models=new Set(catalog.map(car=>`${car.make}|${car.model}`));
const eligibleModels=new Set(verified.map(car=>`${car.make}|${car.model}`));
const blockedMakes=[...makes].filter(make=>!verified.some(car=>car.make===make)).sort();
console.log(`${catalog.length} records, ${models.size} models, ${makes.size} makes. ${verified.length} verified records / ${eligibleModels.size} models can be matched; ${research.length} research-only records cannot yet be matched.`);
console.log(`Makes without a selectable model (${blockedMakes.length}): ${blockedMakes.join(', ')}`);
if(errors.length){for(const error of errors)console.error(error);process.exitCode=1;}
else console.log('Verified records have valid assets and a path into the results.');
