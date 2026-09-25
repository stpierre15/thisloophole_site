import { catalog } from '../data/dealership/catalog.mjs';
import { seatingEvidence, seatingVariantEvidence } from '../data/dealership/seating-evidence.mjs';
import { sevenSeatSpecs } from '../data/dealership/seven-seat-specs.mjs';

export const budgetCeilings = Object.freeze({ under25: 24999, '25-35': 35000, '35-45': 45000, '45-60': 60000, '60-80': 80000, '80-120': 120000, '120+': Infinity, any: Infinity });
export const towMinimums = Object.freeze({ never: 0, under3500: 3500, '3500-5000': 5000, '5000-8000': 8000, '8000+': 8000 });
export const sizeLimits = Object.freeze({ small: [185, 73], medium: [195, 76], large: [230, 85], any: [Infinity, Infinity] });
const choices = {
  budget: Object.keys(budgetCeilings), seats: ['2','4','5','6','7','8'], kids: ['no','one','two','three'], dogs: ['no','small','large','multiple'],
  cargo: ['little','normal','a-lot','bulky'], daily: ['under20','20-50','50-100','100+'], trips: ['never','few','monthly','frequent'], camping: ['never','occasional','often'], offroad: ['never','dirt','rough','real'], weather: ['yes','sometimes','no'], towing: Object.keys(towMinimums), size: Object.keys(sizeLimits),
};
export const powertrains = ['Gas','Hybrid','Plug-in hybrid','Electric'];
export const priorities = ['Low price','Fuel economy','Reliability','Resale value','Cargo room','Passenger room','Performance','Towing','Easy parking','Road trips','Off-road ability','Technology','Luxury','Environmental impact'];
export const maxFinalists = 10;
export const cargoMinimums = Object.freeze({ any: 0, small: 15, medium: 25, huge: 35 });
const filterChoices = Object.freeze({
  budget: Object.keys(budgetCeilings).filter(value=>value!=='120+'),
  seats: ['any','2','4','5','6','7','8'],
  cargo: Object.keys(cargoMinimums),
  drivetrain: ['any','fwd','rwd','awd-standard','awd-capable'],
  powertrain: ['any',...powertrains,'Diesel','Flex fuel','Hydrogen fuel cell','Plug-in fuel cell'],
  towing: Object.keys(towMinimums),
  size: Object.keys(sizeLimits),
  bodyStyle: ['any','SUV','Sedan','Pickup','Truck','Minivan','Van','Wagon','Hatchback','Coupe'],
  sort: ['price-asc','price-desc','cargo-desc'],
});
export const defaultFilters = Object.freeze({ budget:'any',seats:'any',cargo:'any',drivetrain:'any',powertrain:'any',towing:'never',size:'any',bodyStyle:'any',sort:'price-asc' });
export function validateFilters(input) {
  if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Invalid filters');
  const filters={};
  for(const [key,allowed] of Object.entries(filterChoices)){
    const value=input[key]??defaultFilters[key];
    if(!allowed.includes(value))throw new Error('Invalid filter: '+key);
    filters[key]=value;
  }
  return filters;
}
export function validateAnswers(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid answers');
  const answer = {};
  for (const [key, allowed] of Object.entries(choices)) {
    if (!allowed.includes(input[key])) throw new Error('Invalid answer: ' + key);
    answer[key] = input[key];
  }
  if (!Array.isArray(input.powertrain) || input.powertrain.length === 0 || input.powertrain.length > 4 || input.powertrain.some(p => !powertrains.includes(p)) || new Set(input.powertrain).size !== input.powertrain.length) throw new Error('Invalid powertrain');
  if (!Array.isArray(input.priorities) || input.priorities.length !== 3 || input.priorities.some(p => !priorities.includes(p)) || new Set(input.priorities).size !== 3) throw new Error('Pick three priorities');
  answer.powertrain = input.powertrain.slice(); answer.priorities = input.priorities.slice();
  return answer;
}
function publishedEligible(car) {
  return car.dataStatus === 'verified-eligible' && !!car.anonymousAsset && !!car.revealedAsset && car.startingMSRP!=null && car.seats!=null && car.length!=null && car.width!=null;
}
function availableSeats(car){
  const family=car.make+'|'+car.model;
  if(seatingVariantEvidence.has(car.id))return seatingVariantEvidence.get(car.id).maxSeats;
  if(family==='Tesla|Model Y'&&car.drivetrain==='Rear-Wheel Drive')return 5;
  return Math.max(car.seats??0,seatingEvidence.get(family)?.maxSeats??0)||null;
}
function shopperBodyStyle(car){return car.make==='Mercedes-Benz'&&car.model==='GLB-Class'?'SUV':car.bodyStyle;}
function anonymousDiagram(car){
  if(car.powertrain==='Electric')return '/assets/dealership/anonymous/class-electric.svg';
  if(shopperBodyStyle(car)==='Minivan')return '/assets/dealership/anonymous/class-minivan.svg';
  if(shopperBodyStyle(car)==='Wagon')return '/assets/dealership/anonymous/class-wagon.svg';
  return '/assets/dealership/anonymous/class-suv.svg';
}
function withPublishedFamilySpecs(car){
  const spec=sevenSeatSpecs.get(car.make+'|'+car.model);
  if(!spec||car.dataStatus==='verified-eligible')return car;
  return {
    ...car,
    startingMSRP:car.startingMSRP??spec.price??null,
    cargoSpace:car.cargoSpace??spec.cargo??null,
    towingCapacity:car.towingCapacity??spec.tow??null,
    priceIsModelBase:car.startingMSRP==null&&spec.price!=null,
    towingIsMaximum:car.towingCapacity==null&&spec.tow!=null,
    specSourceUrl:spec.url,
  };
}
function eligible(car, a) {
  if (!publishedEligible(car)) return false;
  if (car.startingMSRP == null || car.startingMSRP > budgetCeilings[a.budget]) return false;
  if (car.seats == null || car.seats < Number(a.seats)) return false;
  if (!a.powertrain.includes(car.powertrain)) return false;
  if (a.towing !== 'never' && (car.towingCapacity == null || car.towingCapacity < towMinimums[a.towing])) return false;
  const [length,width] = sizeLimits[a.size];
  if (car.length == null || car.width == null || car.length > length || car.width > width) return false;
  return true;
}
function assessFilters(car,f){
  const missing=[];
  const numeric=(active,value,minimum,label)=>{
    if(!active)return true;
    if(value==null){missing.push(label);return true;}
    return value>=minimum;
  };
  if(f.budget!=='any'){
    if(car.startingMSRP==null)missing.push('Starting price');
    else if(car.startingMSRP>budgetCeilings[f.budget])return null;
    else if(car.priceIsModelBase)missing.push('Listed configuration price');
  }
  // Seating is the primary hard gate: an unknown seat count is not a
  // plausible seven-seater without a manufacturer source.
  if(f.seats!=='any'&&(availableSeats(car)==null||availableSeats(car)<Number(f.seats)))return null;
  if(!numeric(f.cargo!=='any',car.cargoSpace,cargoMinimums[f.cargo],'Cargo volume'))return null;
  if(f.drivetrain!=='any'){
    if(f.drivetrain==='awd-capable'){
      if(car.awdAvailable!==true)missing.push('AWD/4WD availability');
    }else if(car.drivetrain==null)missing.push('Drivetrain');
    else if(f.drivetrain==='fwd'&&car.drivetrain!=='Front-Wheel Drive')return null;
    else if(f.drivetrain==='rwd'&&car.drivetrain!=='Rear-Wheel Drive')return null;
    else if(f.drivetrain==='awd-standard'&&!['All-Wheel Drive','4-Wheel Drive'].includes(car.drivetrain))return null;
  }
  if(f.powertrain!=='any'&&car.powertrain!==f.powertrain)return null;
  if(!numeric(f.towing!=='never',car.towingCapacity,towMinimums[f.towing],'Towing capacity'))return null;
  if(f.towing!=='never'&&car.towingIsMaximum&&car.towingCapacity>=towMinimums[f.towing])missing.push('Tow package/configuration');
  if(f.size!=='any'){
    const [length,width]=sizeLimits[f.size];
    if(car.length==null||car.width==null)missing.push('Exterior dimensions');
    else if(car.length>length||car.width>width)return null;
  }
  if(f.bodyStyle!=='any'&&shopperBodyStyle(car)!==f.bodyStyle)return null;
  return missing;
}
export function filterVehicles(input,cars=catalog){
  const f=validateFilters(input);
  const priced=(a,b)=>a.startingMSRP==null?(b.startingMSRP==null?0:1):(b.startingMSRP==null?-1:a.startingMSRP-b.startingMSRP);
  const sorters={
    'price-asc':priced,
    'price-desc':(a,b)=>a.startingMSRP==null?(b.startingMSRP==null?0:1):(b.startingMSRP==null?-1:b.startingMSRP-a.startingMSRP),
    'cargo-desc':(a,b)=>(b.cargoSpace??-1)-(a.cargoSpace??-1)||priced(a,b),
  };
  const ranked=cars.map(raw=>{const car=f.seats==='7'?withPublishedFamilySpecs(raw):raw;return {car,verificationNeeded:assessFilters(car,f)};}).filter(row=>row.verificationNeeded!==null)
    .sort((a,b)=>(a.verificationNeeded.length>0)-(b.verificationNeeded.length>0)||sorters[f.sort](a.car,b.car)||a.car.id.localeCompare(b.car.id));
  const selected=[];const used=new Set();
  for(const {car,verificationNeeded} of ranked){
    const family=car.make+'|'+car.model;if(used.has(family))continue;used.add(family);
    const reasons=[];
    if(f.seats!=='any'&&availableSeats(car)!=null)reasons.push(`Up to ${availableSeats(car)} seats available; check the seating configuration`);
    if(f.cargo!=='any'&&car.cargoSpace!=null)reasons.push(`${car.cargoSpace} cu ft meets your cargo minimum`);
    if(f.drivetrain!=='any'&&!verificationNeeded.some(x=>x.includes('Drivetrain')||x.includes('AWD/4WD')))reasons.push(f.drivetrain==='awd-capable'?'AWD or 4WD is available':`${car.drivetrain} in the listed configuration`);
    if(f.towing!=='never'&&car.towingCapacity!=null)reasons.push(`${car.towingCapacity.toLocaleString('en-US')} lb ${car.towingIsMaximum?'maximum available':'towing capacity'}`);
    if(f.powertrain!=='any')reasons.push(`${car.powertrain} powertrain`);
    if(!reasons.length)reasons.push('Listed in the current US-market catalog');
    for(const field of verificationNeeded)reasons.push(`${field} needs verification`);
    selected.push({car,points:null,reasons:reasons.slice(0,5),verificationNeeded});
  }
  return selected;
}
const rank = { low: 1, medium: 2, high: 3 };
function normalized(value, low, high) { if (value == null) return 0; return Math.max(0, Math.min(1, (value-low)/(high-low))); }
function score(car,a) {
  let points = 50;
  const reasons=[];
  const add=(condition,amount,reason)=>{ if(condition){points+=amount;if(reason)reasons.push(reason);} };
  add(true,2,'Under your budget');
  add(car.seats >= Number(a.seats)+1,2,'Extra seating capacity');
  add((a.kids!=='no'||a.dogs!=='no'||['a-lot','bulky'].includes(a.cargo)) && car.cargoSpace != null,Math.round(normalized(car.cargoSpace,14,40)*8),car.cargoSpace>=27?'Room for your cargo':null);
  add(['monthly','frequent'].includes(a.trips) && (car.mpgCombined!=null || car.mpgeCombined!=null),Math.round(normalized(car.mpgCombined??car.mpgeCombined,20,50)*7),'Efficient for long trips');
  add(a.weather!=='no' && car.awdAvailable === true,5,'AWD or 4WD available');
  add(['dirt','rough','real'].includes(a.offroad) && car.groundClearance!=null,Math.round(normalized(car.groundClearance,5,10)*7),car.groundClearance>=8?'More ground clearance':null);
  add(a.camping!=='never' && car.cargoSpace>=25,4,'Room for camping equipment');
  add(a.daily==='under20' && car.length<=185,3,'Manageable daily footprint');
  add(a.towing!=='never' && car.towingCapacity>=towMinimums[a.towing],4,'Meets your towing threshold');
  const weights={
    'Low price':normalized(65000-car.startingMSRP,0,45000)*9,
    'Fuel economy':normalized(car.mpgCombined??car.mpgeCombined,18,50)*9,
    'Cargo room':normalized(car.cargoSpace,14,40)*9,
    'Passenger room':normalized(car.seats,2,8)*9,
    'Performance':normalized(car.horsepower,130,350)*9,
    'Towing':normalized(car.towingCapacity,0,5000)*9,
    'Easy parking':normalized(210-car.length,0,45)*9,
    'Road trips':(normalized(car.mpgCombined??car.mpgeCombined,18,50)+normalized(car.cargoSpace,14,40))*4.5,
    'Off-road ability':(normalized(car.groundClearance,5,10)+(car.awdAvailable?0.5:0))*6,
    'Environmental impact':car.powertrain==='Electric'?9:car.powertrain==='Hybrid'?6:0,
  };
  // No score is awarded for unverified subjective fields.
  for(const p of a.priorities)points += weights[p] || 0;
  return { points:Math.round(Math.min(99,points)), reasons:[...new Set(reasons)].slice(0,4) };
}
export function matchVehicles(answers, cars=catalog) {
  const a=validateAnswers(answers);
  const ranked=cars.filter(car=>eligible(car,a)).map(car=>({car,...score(car,a)})).sort((x,y)=>y.points-x.points || x.car.startingMSRP-y.car.startingMSRP || x.car.id.localeCompare(y.car.id));
  const selected=[];const used=new Set();
  for(const row of ranked){const family=row.car.make+'|'+row.car.model;if(used.has(family))continue;selected.push(row);used.add(family);if(selected.length===maxFinalists)break;}
  return selected;
}
export function blindCar(candidate,sessionId) {
  const car=candidate.car;
  const seating=seatingEvidence.get(car.make+'|'+car.model);
  return {
    anonymousId:candidate.anonymousId,
    anonymousImageUrl:car.anonymousAsset?'/assets/dealership/anonymous/'+car.anonymousAsset:availableSeats(car)>=7?anonymousDiagram(car):null,
    imageIsGeneric:!car.anonymousAsset&&availableSeats(car)>=7,
    dataStatus:publishedEligible(car)?'fully-verified':'partial',
    verificationNeeded:candidate.verificationNeeded??[],
    bodyStyle:shopperBodyStyle(car),price:car.startingMSRP,priceIsModelBase:!!car.priceIsModelBase,powertrain:car.powertrain,fuelType:car.fuelType,seats:availableSeats(car),seatingVaries:!!seating&&availableSeats(car)!==car.seats,
    mpg:car.mpgCombined,mpge:car.mpgeCombined,range:car.evRange,cargo:car.cargoSpace,towing:car.towingCapacity,towingIsMaximum:!!car.towingIsMaximum,
    drivetrain:car.drivetrain,groundClearance:car.groundClearance,horsepower:car.horsepower,
    resale:car.estimatedResaleStrength,reliability:car.reliabilityCategory,matchPercent:candidate.points,
    strengths:car.shortStrengths,weaknesses:car.shortWeaknesses,fitReasons:candidate.reasons,
    length:car.length,width:car.width,height:car.height,wheelbase:car.wheelbase,
  };
}
