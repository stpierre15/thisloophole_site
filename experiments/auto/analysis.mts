import { createHash } from 'node:crypto';
import type { ComparableSnapshot,LoopholeAnalysis,PriceObservation,ScoreComponents,VehicleListing,VehicleResult } from './schema.mjs';
const hash=(v:string)=>createHash('sha256').update(v).digest('hex').slice(0,24);
const clamp=(n:number)=>Math.max(0,Math.min(100,Math.round(n)));
const median=(values:number[])=>{const a=[...values].sort((x,y)=>x-y);return a.length?(a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2):null};
export const daysBetween=(a:string,b:string)=>Math.max(0,Math.floor((Date.parse(b)-Date.parse(a))/86400000));
export function priceFacts(rows:PriceObservation[],current:number){const ordered=[...rows].sort((a,b)=>a.observedAt.localeCompare(b.observedAt)),first=ordered[0]?.price??current;let cuts=0;for(let i=1;i<ordered.length;i++)if(ordered[i].price<ordered[i-1].price)cuts++;return {original:first,cuts,reduction:Math.max(0,Math.round((first-current)*100)/100)};}
export function comparableFor(listing:VehicleListing,all:VehicleListing[],now:string):ComparableSnapshot{
 const peers=all.filter(x=>x.id!==listing.id&&x.active&&x.vehicle.make.toLowerCase()===listing.vehicle.make.toLowerCase()&&x.vehicle.model.toLowerCase()===listing.vehicle.model.toLowerCase()&&Math.abs(x.vehicle.year-listing.vehicle.year)<=1&&(x.mileage===null||listing.mileage===null||Math.abs(x.mileage-listing.mileage)<=25000));
 const prices=peers.map(x=>x.currentPrice),med=median(prices),average=prices.length?prices.reduce((a,b)=>a+b,0)/prices.length:null,percentile=prices.length?Math.round(prices.filter(x=>x<=listing.currentPrice).length/prices.length*100):null;
 return {id:hash(listing.id+'|'+now),listingId:listing.id,generatedAt:now,comparableCount:peers.length,medianPrice:med===null?null:Math.round(med*100)/100,averagePrice:average===null?null:Math.round(average*100)/100,percentile,priceDeltaFromMedian:med===null?null:Math.round((listing.currentPrice-med)*100)/100};
}
export function analyze(listing:VehicleListing,observations:PriceObservation[],all:VehicleListing[],now:string):VehicleResult{
 const comp=comparableFor(listing,all,now),days=daysBetween(listing.firstObservedAt,now),facts=priceFacts(observations,listing.currentPrice),discount=comp.medianPrice?Math.max(-.2,Math.min(.2,(comp.medianPrice-listing.currentPrice)/comp.medianPrice)):0;
 const components:ScoreComponents={pricePosition:clamp(50+discount*700),timeObserved:clamp(days/90*100),priceCuts:clamp(facts.cuts*28+(facts.original?facts.reduction/facts.original:0)*450),localCompetition:clamp(comp.comparableCount*18),depreciationContext:clamp(50+discount*300)};
 const score=clamp(components.pricePosition*.30+components.timeObserved*.25+components.priceCuts*.20+components.localCompetition*.15+components.depreciationContext*.10),reasons:string[]=[];
 if(days>=45)reasons.push(days+' days observed');if(facts.cuts)reasons.push(facts.cuts+' observed price cut'+(facts.cuts===1?'':'s'));if(facts.reduction>0)reasons.push('$'+facts.reduction.toLocaleString('en-US')+' below first observed ask');if(comp.medianPrice&&comp.priceDeltaFromMedian!==null&&comp.priceDeltaFromMedian<0)reasons.push(Math.abs(comp.priceDeltaFromMedian/comp.medianPrice*100).toFixed(1)+'% below the comparable median');if(!reasons.length)reasons.push('Limited observable pricing advantage so far');
 const confidence=comp.comparableCount>=3&&observations.length>=2?'HIGH':comp.comparableCount>=1||observations.length>=2?'MEDIUM':'LOW';
 const analysis:LoopholeAnalysis={id:hash(listing.id+'|analysis|'+now),listingId:listing.id,generatedAt:now,score,components,reasons,confidence,disclosure:'Loophole Score is an experimental buyer-side indicator based on observable listing signals. It is not a prediction of dealer behavior.'};
 return {listing,vehicle:listing.vehicle,dealer:listing.dealer,observations:[...observations].sort((a,b)=>a.observedAt.localeCompare(b.observedAt)),comparable:comp,analysis,daysObserved:days,originalObservedPrice:facts.original,priceCutCount:facts.cuts,priceReduction:facts.reduction};
}
