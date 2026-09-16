import type { CandidateListing, CircularProductProvider, ProductSearchInput, ProviderConfig } from './schema.mjs';
import { attributesOf, infer, normalize, tidy, validAmount } from './identity.mjs';
export class ProviderError extends Error { constructor(public code:string){super(code);this.name='ProviderError';} }
const conditionIds='1500|2000|2010|2020|2030|2500|2750|3000|4000|5000|6000';
const dollars=(m:any)=>m?.currency==='USD'?validAmount(Number(m.value)):null;
const shippingDollars=(m:any)=>m?.currency==='USD'&&Number.isFinite(Number(m.value))&&Number(m.value)>=0?Math.round(Number(m.value)*100)/100:null;
export function ebayDestination(value:unknown,sandbox=false):string|null {
 try{const u=new URL(String(value));if(u.protocol!=='https:'||u.username||u.password||u.port||!['ebay.com','www.ebay.com',...(sandbox?['sandbox.ebay.com','www.sandbox.ebay.com']:[])].includes(u.hostname)||!u.pathname.startsWith('/itm/'))return null;u.hash='';return u.href;}catch{return null;}
}
export function normalizeEbayItem(raw:any,now:string,sandbox=false):CandidateListing|null {
 const cid=String(raw?.conditionId);const condition=cid==='1500'?'open_box':['2000','2010','2020','2030','2500'].includes(cid)?'refurbished':['2750','3000','4000','5000','6000'].includes(cid)?'used':null;
 const price=dollars(raw?.price),url=ebayDestination(raw?.itemWebUrl,sandbox),title=tidy(raw?.title);
 if(!condition||price===null||!url||!title||!raw.itemId||!raw.buyingOptions?.includes('FIXED_PRICE'))return null;
 if(/\b(for parts|not working|broken|empty box|box only|manual only|case only|screen protector|replacement screen)\b/i.test(title))return null;
 // A conservative accessory exclusion is preferable to a $20 camera cage
 // appearing to be a $1,999 camera. Bundles mentioning these may also be omitted.
 if(/\b(case|cage|cover|strap|charger|charging cable|replacement|protector|adapter|mount|watch band|battery only|lens only)\b/i.test(title))return null;
 const aspects:Record<string,string>={};for(const a of raw.localizedAspects||[])if(tidy(a?.name))aspects[normalize(a.name)]=tidy(a.value);
 const guessed=infer(title);const attrs=attributesOf(title);
 const mapping:Record<string,string>={'storage capacity':'storage','network':'lock','size':'size','color':'color','colour':'color','screen size':'screen_size'};
 for(const [key,target]of Object.entries(mapping))if(aspects[key])attrs[target]=aspects[key];
 // Shipping is never assumed free when omitted or calculated at checkout.
 const options=(raw.shippingOptions||[]).filter((o:any)=>o.shippingCostType!=='CALCULATED'&&o.shippingCost?.currency==='USD').map((o:any)=>shippingDollars(o.shippingCost)).filter((n:any)=>n!==null) as number[];
 const shippingPrice=options.length?Math.min(...options):null;
 const availability=raw.estimatedAvailabilities;
 const available=raw.itemEndDate?new Date(raw.itemEndDate).getTime()>new Date(now).getTime():true;
 const soldOut=Array.isArray(availability)&&availability.some((a:any)=>a.estimatedAvailabilityStatus==='OUT_OF_STOCK'||a.estimatedAvailableQuantity===0);
 const gtin=String(raw.gtin||aspects.upc||aspects.ean||'');
 const returns=raw.returnTerms?.returnsAccepted===false?'Seller reports no returns.':raw.returnTerms?.returnsAccepted===true?'Seller accepts returns'+(raw.returnTerms.returnPeriod?.value?' within '+tidy(String(raw.returnTerms.returnPeriod.value))+' '+tidy(raw.returnTerms.returnPeriod.unit):'')+'. Check the listing for costs and exceptions.':null;
 return {id:'ebay-'+raw.itemId,provider:'eBay',providerListingId:raw.itemId,title,price,shippingPrice,totalPrice:shippingPrice===null?null:Math.round((price+shippingPrice)*100)/100,currency:'USD',condition,conditionText:tidy(raw.condition)||condition.replace('_',' '),sellerName:tidy(raw.seller?.username)||null,imageUrl:typeof raw.image?.imageUrl==='string'&&raw.image.imageUrl.startsWith('https://')?raw.image.imageUrl:null,destinationUrl:url,brand:aspects.brand||guessed.brand,model:aspects.model||guessed.model,mpn:aspects.mpn&&normalize(aspects.mpn)!=='does not apply'?aspects.mpn:null,gtin:/^\d{8,14}$/.test(gtin)?gtin:null,attributes:attrs,category:guessed.category,fetchedAt:now,available:available&&!soldOut,demo:sandbox,conditionDescription:tidy(raw.conditionDescription,600)||null,returns,warranty:aspects['manufacturer warranty']?tidy(aspects['manufacturer warranty']):null,previousModel:false};
}
export function searchTerms(input:ProductSearchInput):{q?:string;gtin?:string}[] {
 if(input.previous)return [{q:input.previous.brand+' '+input.previous.previousModel+' '+Object.values(input.product.attributes).join(' ')}];
 const p=input.product,terms:{q?:string;gtin?:string}[]=[];
 if(p.gtin)terms.push({gtin:p.gtin});
 if(p.mpn)terms.push({q:[p.brand,p.mpn].filter(Boolean).join(' ')});
 if(p.brand&&p.model)terms.push({q:[p.brand,p.model,...Object.values(p.attributes)].join(' ')});
 terms.push({q:p.productName});
 return terms.filter((t,i,a)=>a.findIndex(x=>JSON.stringify(x)===JSON.stringify(t))===i).slice(0,3);
}
export class EbayProvider implements CircularProductProvider {
 readonly id='ebay';readonly configured:boolean;readonly sandbox:boolean;
 private token:string|null=null;private tokenExpires=0;private tokenPromise:Promise<string>|null=null;
 constructor(private config:ProviderConfig,private fetcher:typeof fetch=fetch,private clock=()=>Date.now()){
  this.configured=!!config.clientId&&!!config.clientSecret;this.sandbox=config.environment==='sandbox';
 }
 private get base(){return this.sandbox?'https://api.sandbox.ebay.com':'https://api.ebay.com';}
 private async accessToken():Promise<string> {
  if(!this.configured)throw new ProviderError('NOT_CONFIGURED');
  if(this.token&&this.tokenExpires>this.clock())return this.token;
  if(this.tokenPromise)return this.tokenPromise;
  this.tokenPromise=(async()=>{
   const r=await this.fetcher(this.base+'/identity/v1/oauth2/token',{method:'POST',redirect:'error',signal:AbortSignal.timeout(6500),headers:{Authorization:'Basic '+Buffer.from(this.config.clientId+':'+this.config.clientSecret).toString('base64'),'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'client_credentials',scope:'https://api.ebay.com/oauth/api_scope'}).toString()});
   if(!r.ok)throw new ProviderError('AUTH_FAILED');const data=await r.json();if(typeof data.access_token!=='string')throw new ProviderError('AUTH_FAILED');
   const token:string=data.access_token;this.token=token;this.tokenExpires=this.clock()+Math.max(0,Number(data.expires_in||0)-120)*1000;return token;
  })();
  try{return await this.tokenPromise;}finally{this.tokenPromise=null;}
 }
 private async call(path:string,postalCode?:string,retry=true):Promise<any> {
  let r:Response;try{r=await this.fetcher(this.base+'/buy/browse/v1/'+path,{redirect:'error',signal:AbortSignal.timeout(6500),headers:{Authorization:'Bearer '+await this.accessToken(),'X-EBAY-C-MARKETPLACE-ID':'EBAY_US',...(postalCode?{'X-EBAY-C-ENDUSERCTX':'contextualLocation=country=US,zip='+postalCode}:{})}});}catch(e){if(e instanceof ProviderError)throw e;throw new ProviderError('NETWORK_FAILED');}
  if(r.status===401&&retry){this.token=null;return this.call(path,postalCode,false);}
  if(r.status===404)return null;
  if(!r.ok)throw new ProviderError(r.status===429?'RATE_LIMITED':r.status===403?'ACCESS_NOT_APPROVED':'SEARCH_FAILED');
  return r.json();
 }
 async getListing(id:string,postalCode?:string):Promise<CandidateListing|null> {
  if(!/^v1\|\d+\|\d+$/.test(id))throw new ProviderError('INVALID_LISTING');
  const data=await this.call('item/'+encodeURIComponent(id),postalCode);return data?normalizeEbayItem(data,new Date(this.clock()).toISOString(),this.sandbox):null;
 }
 async search(input:ProductSearchInput):Promise<CandidateListing[]> {
  const raw=new Map<string,any>();
  for(const term of searchTerms(input)){
   const params=new URLSearchParams({...term,limit:'12',filter:'buyingOptions:{FIXED_PRICE},conditionIds:{'+conditionIds+'},deliveryCountry:US',...(input.postalCode?{filter:'buyingOptions:{FIXED_PRICE},conditionIds:{'+conditionIds+'},deliveryCountry:US,deliveryPostalCode:'+input.postalCode}:{})});
   const response=await this.call('item_summary/search?'+params,input.postalCode);
   for(const item of response?.itemSummaries||[])raw.set(item.itemId,item);
   if(raw.size>=8)break;
  }
  const summaries=[...raw.values()].map(x=>normalizeEbayItem(x,new Date(this.clock()).toISOString(),this.sandbox)).filter((x):x is CandidateListing=>!!x&&x.available);
  const wanted=input.previous?.previousModel||input.product.model;
  const preferred=summaries.sort((a,b)=>Number(wanted&&normalize(b.title).includes(normalize(wanted)))-Number(wanted&&normalize(a.title).includes(normalize(wanted)))).slice(0,input.previous?3:6);
  const details=await Promise.allSettled(preferred.map(x=>this.getListing(x.providerListingId,input.postalCode)));
  // Summary results remain valid observations if detail enrichment fails. A
  // positive 404 removes the listing rather than reviving its search summary.
  return preferred.flatMap((x,i)=>{const d=details[i];const listing=d.status==='fulfilled'?d.value:x;return listing&&listing.available?[{...listing,previousModel:!!input.previous}]:[];});
 }
}
