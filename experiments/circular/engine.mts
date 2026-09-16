import type { CandidateListing, ProductIdentity, RankedListing, ModelRelationship, ComparisonResult } from './schema.mjs';
import { normalize } from './identity.mjs';
const cents=(n:number)=>Math.round(n*100)/100;
const same=(a:string|null,b:string|null)=>!!a&&!!b&&normalize(a)===normalize(b);
const modelKey=(v:string)=>{const key=normalize(v).replace(/^(apple|sony|garmin|herman miller|makita) /,'');return {'ilce 7m4':'a7 iv','ilce 7m3':'a7 iii','alpha 7 iv':'a7 iv','alpha 7 iii':'a7 iii'}[key]||key;};
const sameGtin=(a:string|null,b:string|null)=>!!a&&!!b&&a.padStart(14,'0')===b.padStart(14,'0');
const sameModel=(a:string|null,b:string|null)=>!!a&&!!b&&modelKey(a)===modelKey(b);
const contains=(text:string,part:string)=>(' '+normalize(text)+' ').includes(' '+normalize(part)+' ');
const tokens=(s:string)=>new Set(normalize(s).split(' ').filter(x=>x.length>1&&!['the','with','for','and','new','used','refurbished','only','body'].includes(x)));
const attr=(key:string,v:string)=>key==='storage'?normalize(v).replaceAll(' ',''):normalize(v);
export function rankCandidates(product:ProductIdentity,listings:CandidateListing[],previous:ModelRelationship|null):RankedListing[] {
 const ranked:RankedListing[]=[];
 for(const c of listings){
  if(!c.available||c.currency!=='USD'||!Number.isFinite(c.price)||c.price<=0||!['used','refurbished','open_box'].includes(c.condition))continue;
  const old=c.previousModel;if(old&&!previous)continue;
  const targetModel=old?previous!.previousModel:product.model;
  if(c.brand&&product.brand&&!same(c.brand,product.brand))continue;
  if(c.category!=='other'&&product.category!=='other'&&c.category!==product.category)continue;
  if(!old&&product.gtin&&c.gtin&&!sameGtin(product.gtin,c.gtin))continue;
  if(!old&&product.mpn&&c.mpn&&!same(product.mpn,c.mpn))continue;
  let conflict=false,confirmed=0,missing=0;
  for(const [k,v]of Object.entries(product.attributes)){
   if(c.attributes[k]){if(attr(k,c.attributes[k])!==attr(k,v))conflict=true;else confirmed++;}else missing++;
  }
  if(conflict)continue;
  const identifier=!old&&(sameGtin(product.gtin,c.gtin)||same(product.mpn,c.mpn));
  const model=!!targetModel&&(sameModel(targetModel,c.model)||(!c.model&&contains(c.title,targetModel)));
  // An explicit different model is a conflict, even if its title mentions ours.
  if(targetModel&&c.model&&!sameModel(targetModel,c.model)&&!identifier)continue;
  const brand=same(product.brand,c.brand)||!!product.brand&&contains(c.title,product.brand);
  const wanted=tokens(old?previous!.brand+' '+previous!.previousModel:product.productName),actual=tokens(c.title);
  const overlap=[...wanted].filter(x=>actual.has(x)).length/Math.max(1,wanted.size);
  if(!identifier&&!(model&&brand)&&!(brand&&wanted.size>=3&&overlap>=.8&&confirmed>=1))continue;
  const required:Record<string,string[]>={phone:['storage','lock'],camera:['kit'],chair:['size','generation'],tool:['kit'],watch:['size']};
  const variantIncomplete=(required[product.category]||[]).some(k=>!product.attributes[k]);
  const exact=!old&&(identifier||(model&&brand&&missing===0&&!variantIncomplete));
  const matchLevel=old?'SIMILAR ALTERNATIVE':exact?'EXACT PRODUCT':'STRONG MATCH';
  const total=c.shippingPrice===null?null:cents(c.price+c.shippingPrice);
  const savings=total!==null&&product.newPrice!==null?cents(product.newPrice-total):null;
  const tradeoffs=[c.conditionDescription||'Condition label comes from the seller; cosmetic wear and included accessories are not independently checked.',c.returns||'Seller return terms were not supplied. Check the listing.',c.warranty?'Listed warranty: '+c.warranty+'. Confirm eligibility and terms.':'Manufacturer warranty coverage was not verified.'];
  if(product.category==='phone'||product.category==='watch')tradeoffs.push('Battery health was not verified.');
  if(missing)tradeoffs.push('Some requested specifications are unconfirmed; compare the listing before buying.');
  if(variantIncomplete&&!identifier)tradeoffs.push('You have not specified every comparison-critical variant. Add storage, lock, size or kit details where relevant.');
  if(c.shippingPrice===null)tradeoffs.push('Shipping is unknown. Savings cannot be calculated yet.');
  if(old)tradeoffs.push(previous!.notes);
  ranked.push({...c,totalPrice:total,matchLevel,confidence:exact?'HIGH':'MEDIUM',matchReasons:[...(identifier?['Matching structured product identifier.']:[]),...(model?['Matching '+(old?'previous ':'')+'model.']:[]),...(brand?['Matching brand.']:[]),...(confirmed?['Requested specifications match where supplied.']:[])],savings,percentSavings:savings!==null&&product.newPrice?Math.round(savings/product.newPrice*100):null,tradeoffs});
 }
 const level=(x:RankedListing)=>x.matchLevel==='EXACT PRODUCT'?3:x.matchLevel==='STRONG MATCH'?2:1;
 return ranked.filter((x,i,a)=>a.findIndex(y=>y.id===x.id)===i).sort((a,b)=>level(b)-level(a)||(a.totalPrice===null?1:0)-(b.totalPrice===null?1:0)||(a.totalPrice??a.price)-(b.totalPrice??b.price));
}
export function economics(product:ProductIdentity,candidates:RankedListing[]):Pick<ComparisonResult,'bestUsedOption'|'bestRefurbishedOption'|'bestValueOption'|'estimatedSavings'|'percentSavings'|'verdict'|'take'> {
 const known=candidates.filter(c=>c.totalPrice!==null),exact=known.filter(c=>c.matchLevel==='EXACT PRODUCT');
 const eligible=exact.length?exact:known.filter(c=>c.matchLevel==='STRONG MATCH');
 const best=[...eligible].sort((a,b)=>a.totalPrice!-b.totalPrice!)[0]??null;
 const basic={bestUsedOption:candidates.find(c=>c.condition==='used')??null,bestRefurbishedOption:candidates.find(c=>c.condition==='refurbished')??null,bestValueOption:best,estimatedSavings:best?.savings??null,percentSavings:best?.percentSavings??null};
 if(!candidates.length)return {...basic,verdict:'NOTHING GOOD RIGHT NOW',take:'We looked at the connected source. No supported match passed. This does not mean no used option exists.'};
 if(product.newPrice===null)return {...basic,verdict:'NO PRICE BASELINE',take:'We found candidates. Add the new price you would actually pay to calculate what you keep.'};
 if(!best)return {...basic,verdict:'COMPARE THE TERMS',take:'There are possible alternatives, but shipping or product identity is incomplete. We cannot defend a saving for the same product yet.'};
 const saving=best.savings!;
 if(saving<=0)return {...basic,verdict:'NEW ACTUALLY WINS THIS ONE',take:'The lowest supported same-product total is at least your new price. There is no price advantage here before tax.'};
 if(saving<Math.max(50,product.newPrice*.1))return {...basic,verdict:'NEW ACTUALLY WINS THIS ONE',take:'The price gap is small. Our editorial cutoff is $50 or 10% of the new price, whichever is greater. That may not justify condition and warranty uncertainty; this is a judgment, not proof about either warranty.'};
 if(best.matchLevel!=='EXACT PRODUCT')return {...basic,verdict:'COMPARE THE TERMS',take:'The lower price is real, but some requested specifications are unconfirmed. Treat the saving as conditional until you check the variant.'};
 return {...basic,verdict:'LOOPHOLE FOUND',take:'The same model costs less after the reported shipping charge. You keep the difference before tax; condition, returns and warranty still matter.'};
}
