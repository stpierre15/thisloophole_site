import { catalog } from '../data/dealership/catalog.mjs';

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
  powertrain: ['any',...powertrains],
  towing: Object.keys(towMinimums),
  size: Object.keys(sizeLimits),
  bodyStyle: ['any','SUV','Sedan','Pickup','Minivan','Wagon','Coupe'],
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
function meetsFilters(car,f){
  if(!publishedEligible(car)||car.startingMSRP>budgetCeilings[f.budget])return false;
  if(f.seats!=='any'&&car.seats<Number(f.seats))return false;
  if(f.cargo!=='any'&&(car.cargoSpace==null||car.cargoSpace<cargoMinimums[f.cargo]))return false;
  if(f.drivetrain==='fwd'&&car.drivetrain!=='Front-Wheel Drive')return false;
  if(f.drivetrain==='rwd'&&car.drivetrain!=='Rear-Wheel Drive')return false;
  if(f.drivetrain==='awd-standard'&&!['All-Wheel Drive','4-Wheel Drive'].includes(car.drivetrain))return false;
  if(f.drivetrain==='awd-capable'&&car.awdAvailable!==true)return false;
  if(f.powertrain!=='any'&&car.powertrain!==f.powertrain)return false;
  if(f.towing!=='never'&&(car.towingCapacity==null||car.towingCapacity<towMinimums[f.towing]))return false;
  const [length,width]=sizeLimits[f.size];
  if(car.length>length||car.width>width)return false;
  if(f.bodyStyle!=='any'&&car.bodyStyle!==f.bodyStyle)return false;
  return true;
}
export function filterVehicles(input,cars=catalog){
  const f=validateFilters(input);
  const sorters={
    'price-asc':(a,b)=>a.startingMSRP-b.startingMSRP,
    'price-desc':(a,b)=>b.startingMSRP-a.startingMSRP,
    'cargo-desc':(a,b)=>(b.cargoSpace??-1)-(a.cargoSpace??-1),
  };
  const ranked=cars.filter(car=>meetsFilters(car,f)).sort((a,b)=>sorters[f.sort](a,b)||a.id.localeCompare(b.id));
  const selected=[];const used=new Set();
  for(const car of ranked){
    const family=car.make+'|'+car.model;if(used.has(family))continue;used.add(family);
    const reasons=[];
    if(f.seats!=='any')reasons.push(`${car.seats} seats meet your ${f.seats}-seat minimum`);
    if(f.cargo!=='any')reasons.push(`${car.cargoSpace} cu ft meets your cargo minimum`);
    if(f.drivetrain!=='any')reasons.push(f.drivetrain==='awd-capable'?'AWD or 4WD is available':`${car.drivetrain} as listed`);
    if(f.towing!=='never')reasons.push(`${car.towingCapacity.toLocaleString('en-US')} lb towing capacity`);
    if(f.powertrain!=='any')reasons.push(`${car.powertrain} powertrain`);
    if(!reasons.length)reasons.push('Meets the filters you set');
    selected.push({car,points:null,reasons:reasons.slice(0,4)});
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
  return {
    anonymousId:candidate.anonymousId,
    anonymousImageUrl:'/assets/dealership/anonymous/'+car.anonymousAsset,
    bodyStyle:car.bodyStyle,price:car.startingMSRP,powertrain:car.powertrain,fuelType:car.fuelType,seats:car.seats,
    mpg:car.mpgCombined,mpge:car.mpgeCombined,range:car.evRange,cargo:car.cargoSpace,towing:car.towingCapacity,
    drivetrain:car.drivetrain,groundClearance:car.groundClearance,horsepower:car.horsepower,
    resale:car.estimatedResaleStrength,reliability:car.reliabilityCategory,matchPercent:candidate.points,
    strengths:car.shortStrengths,weaknesses:car.shortWeaknesses,fitReasons:candidate.reasons,
    length:car.length,width:car.width,height:car.height,wheelbase:car.wheelbase,
  };
}
