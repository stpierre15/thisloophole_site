import { randomUUID } from 'node:crypto';
import type { CircularProductProvider, ComparisonResult, ProductIdentity, SearchRequest, Store, CandidateListing } from './schema.mjs';
import { digest, extractProduct, identifyQuery, productUrl, tidy, identityId, productUrlHint } from './identity.mjs';
import { demoData, previousFor } from './catalog.mjs';
import { economics, rankCandidates } from './engine.mjs';
export interface ServiceOptions { provider:CircularProductProvider; clock?:()=>number; extractor?:(url:string)=>Promise<ProductIdentity|null>; listingTtl?:number; }
export class InputError extends Error { constructor(message:string,public status=400){super(message);} }
export function cleanRequest(input:SearchRequest):SearchRequest {
 if(input.demoId)return {demoId:tidy(input.demoId,30)};
 const query=tidy(input.query),url=tidy(input.url,1500),productName=tidy(input.productName);
 if(!query&&!url&&!productName)throw new InputError('Enter a product name or a complete HTTPS product URL.');
 if(input.newPrice!==undefined&&input.newPrice!==null&&(!(typeof input.newPrice==='number')||!Number.isFinite(input.newPrice)||input.newPrice<=0||input.newPrice>1_000_000))throw new InputError('Enter a valid new price in USD, or leave it blank.');
 if(input.postalCode&&!/^\d{5}$/.test(input.postalCode))throw new InputError('Use a five-digit US ZIP code, or leave it blank.');
 if(input.attributes&&(typeof input.attributes!=='object'||Array.isArray(input.attributes)))throw new InputError('Invalid specifications.');
 return {query,url,productName,brand:tidy(input.brand),model:tidy(input.model),newPrice:input.newPrice??null,attributes:input.attributes||{},postalCode:input.postalCode,includePrevious:input.includePrevious!==false};
}
async function log(db:Store,name:string,metadata:Record<string,string>) {
 try{const id=randomUUID();await db.set('studio-events/'+id,{id,name,metadata,created_at:new Date().toISOString()});}catch{/* Analytics never prevents a comparison. */}
}
export async function identify(input:SearchRequest,db:Store,options:ServiceOptions):Promise<ProductIdentity> {
 const now=options.clock?.()??Date.now();
 if(!input.url||input.productName){
  const p=identifyQuery(input,new Date(now).toISOString());
  if(input.url)try{
   p.sourceUrl=productUrl(input.url);const cached=await db.get('circular-products/'+digest(p.sourceUrl));
   if(cached?.expiresAt>now&&cached.product?.productName===p.productName&&cached.product?.brand===p.brand&&cached.product?.model===p.model){p.mpn=cached.product.mpn;p.gtin=cached.product.gtin;p.imageUrl=cached.product.imageUrl;p.category=cached.product.category;p.attributes={...cached.product.attributes,...p.attributes};p.updatedAt=cached.product.updatedAt;p.identityBasis=cached.product.identityBasis;p.identificationNote=cached.product.identificationNote;p.retailerSku=cached.product.retailerSku;p.id=identityId(p);}
  }catch{}return p;
 }
 let url:string;try{url=productUrl(input.url);}catch{throw new InputError("WE COULDN'T CRACK THIS ONE OPEN. Search its name or confirm the details below.",422);}
 const key='circular-products/'+digest(url),cached=await db.get(key);
 if(cached?.expiresAt>now&&cached.product)return cached.product;
 let product:ProductIdentity|null=null;try{product=await (options.extractor||extractProduct)(url);}catch{}
 if(!product)product=productUrlHint(url,new Date(now).toISOString());
 if(!product)throw new InputError("WE COULDN'T CRACK THIS ONE OPEN. Enter the product name, brand, model and new price below.",422);
 await db.set(key,{product,expiresAt:now+(product.identityBasis==='url'?300000:86400000)});return product;
}
export function publicResult(r:ComparisonResult):ComparisonResult { const request={...r.request};delete request.postalCode;return {...r,request}; }
export async function search(input:SearchRequest,db:Store,options:ServiceOptions,reuseId?:string):Promise<ComparisonResult> {
 const request=cleanRequest(input),now=options.clock?.()??Date.now(),stamp=new Date(now).toISOString();
 const ttl=Math.max(900000,Math.min(3600000,options.listingTtl||1800000));
 const provider=options.provider;
 let product:ProductIdentity,listings:CandidateListing[]=[],mode:ComparisonResult['mode']='live',providerStatus='CONNECTED',warnings:string[]=[],cacheHit=false,providerExpiry=now+ttl;
 if(request.demoId){const demo=demoData(request.demoId,stamp);if(!demo)throw new InputError('Example not found.',404);product=demo.product;listings=demo.listings;mode='demo';providerStatus='DEMO';warnings.push('DEMO: fictional prices and listings explain the comparison. Nothing here is available to buy.');}
 else{
  try{product=await identify(request,db,options);}catch(e){if(e instanceof InputError)throw e;throw new InputError('Confirm the product name and model before searching.',422);}
  if(request.url)request.url=product.sourceUrl||undefined;
  if(provider.identify&&!request.url)try{
   const resolved=await provider.identify(product);
   if(resolved)product=resolved;else warnings.push('We could not resolve that search to one source-supported catalog product. Add the brand or model number for a narrower check.');
  }catch{warnings.push('Product identification did not complete. Retry or add the exact model number.');}
  if(product.identificationNote)warnings.push(product.identificationNote);
  await log(db,'product_identified',{category:product.category,method:request.url?'url':'query'});
  const previous=request.includePrevious!==false?previousFor(product):null;
  if(!provider.configured){mode='unconfigured';providerStatus='NOT_CONFIGURED';warnings.push('Live marketplace search is not connected. Try a clearly labeled example below; the sourced store-price board still works.');}
  else{
   mode=provider.sandbox?'sandbox':'live';if(provider.sandbox)warnings.push('SANDBOX: eBay test inventory, not production listings. Buying is disabled.');
   const key='circular-provider-cache/'+digest(JSON.stringify({provider:provider.id,sandbox:provider.sandbox,identity:product.id,previous:previous?.previousModel,zip:request.postalCode||''}));
   const cached=await db.get(key);
   if(cached?.expiresAt>now&&Array.isArray(cached.listings)){listings=cached.listings;providerExpiry=cached.expiresAt;cacheHit=true;}
   else{
    await log(db,'provider_search_started',{provider:provider.id});
    try{
     listings=await provider.search({product,postalCode:request.postalCode});
     if(previous)try{listings.push(...await provider.search({product,previous,postalCode:request.postalCode}));}catch{warnings.push('Previous-model search could not finish. Same-model results remain available.');}
     await db.set(key,{listings,expiresAt:providerExpiry,fetchedAt:stamp});await log(db,'provider_search_success',{provider:provider.id,count:String(listings.length)});
    }catch{providerStatus='UNAVAILABLE';providerExpiry=now+60000;warnings.push('The connected marketplace did not respond successfully. Retry later; no demo inventory was substituted.');await log(db,'provider_search_failed',{provider:provider.id});}
   }
  }
 }
 const newOffers=listings.filter(c=>c.condition==='new'&&c.available&&Number.isFinite(c.price)&&c.price>0);
 if(product.newPrice===null&&newOffers.length){
  const baseline=[...newOffers].sort((a,b)=>a.price-b.price)[0];
  product={...product,newPrice:baseline.price,priceBasis:'retailer',updatedAt:baseline.fetchedAt};
  warnings.push('New-price baseline: '+baseline.provider+' reported '+baseline.price.toLocaleString('en-US',{style:'currency',currency:'USD'})+'. Shipping, tax and checkout availability still need confirmation.');
 }
 if(provider.id==='amazon-data')warnings.push('Amazon product and offer data is supplied through Rainforest API. This checks one marketplace, not the whole market.');
 listings=listings.filter(c=>c.condition!=='new');
 const liveListings:CandidateListing[]=[];
 for(const c of listings){
  const tombstone=await db.get('circular-dead-listings/'+digest(c.id));if(tombstone?.expiresAt>now)continue;
  const override=await db.get('circular-listing-overrides/'+digest(c.id+'|'+(request.postalCode||'')));
  liveListings.push(override?.expiresAt>now&&override.listing?.fetchedAt>=c.fetchedAt?{...override.listing,previousModel:c.previousModel}:c);
 }
 const previous=request.includePrevious!==false?previousFor(product):null,candidates=rankCandidates(product,liveListings,previous),comp=economics(product,candidates);
 if(mode==='unconfigured'){comp.verdict='LIVE SEARCH NOT CONNECTED';comp.take='The search is ready, but its live marketplace connection is not configured. No inventory was searched. Use an example to see the comparison, or explore the real store-price board below.';}
 if(providerStatus==='UNAVAILABLE'){comp.verdict='PROVIDER UNAVAILABLE';comp.take='THE SUPPLY CHAIN IS MISBEHAVING. The marketplace request failed. Retry shortly; this is not a finding about used availability.';}
 if(!request.postalCode&&mode==='live')warnings.push('No ZIP code supplied. Shipping is the provider-reported estimate, not a delivery-address quote.');
 warnings.push('USD / US marketplace. Tax is excluded. New-price shipping is not included unless you entered a delivered new price. Confirm condition, delivery, returns and checkout totals.');
 const fetchedAt=listings.length?listings.reduce((old,c)=>c.fetchedAt<old?c.fetchedAt:old,stamp):stamp;
 const result:ComparisonResult={id:reuseId||randomUUID(),sourceProduct:product,candidates,...comp,mode,providerStatus,previousModel:previous,fetchedAt,expiresAt:providerExpiry,cacheHit,request,warnings};
 await db.set('circular-results/'+result.id,result);return result;
}
export async function loadResult(id:string,db:Store,options:ServiceOptions) {
 if(!/^[0-9a-f-]{36}$/i.test(id))throw new InputError('Invalid result link.');
 const saved=await db.get('circular-results/'+id) as ComparisonResult|null;if(!saved)throw new InputError('This result is no longer available.',404);
 if(saved.expiresAt<=(options.clock?.()??Date.now()))return search(saved.request,db,options,id);
 return {...saved,cacheHit:true};
}
export async function verifyOutbound(resultId:string,listingId:string,db:Store,options:ServiceOptions):Promise<string> {
 const result=await loadResult(resultId,db,options),original=result.candidates.find(c=>c.id===listingId);
 if(!original||result.mode!=='live'||original.demo||!options.provider.getListing)throw new InputError('This listing is not available to buy. Run a fresh live search.',410);
 let fresh:CandidateListing|null;try{fresh=await options.provider.getListing(original.providerListingId,result.request.postalCode);}catch{throw new InputError('We could not recheck this listing. Return to the result and retry.',503);}
 if(fresh)fresh.previousModel=original.previousModel;
 const remaining=result.candidates.filter(c=>c.id!==listingId),valid=fresh?rankCandidates(result.sourceProduct,[fresh],result.previousModel)[0]:null;
 const candidates=rankCandidates(result.sourceProduct,[...remaining,...(valid?[valid]:[])],result.previousModel);
 if(!fresh||!fresh.available)await db.set('circular-dead-listings/'+digest(original.id),{expiresAt:(options.clock?.()??Date.now())+3600000});
 if(fresh?.available)await db.set('circular-listing-overrides/'+digest(original.id+'|'+(result.request.postalCode||'')),{listing:fresh,expiresAt:(options.clock?.()??Date.now())+Math.max(900000,Math.min(3600000,options.listingTtl||1800000))});
 await db.set('circular-results/'+result.id,{...result,candidates,...economics(result.sourceProduct,candidates),expiresAt:0});
 if(!valid?.available||!valid.destinationUrl)throw new InputError('This listing disappeared or changed. Go back and refresh the result.',410);
 await log(db,original.previousModel?'previous_model_clicked':original.condition==='refurbished'?'refurb_result_clicked':'used_result_clicked',{provider:original.provider});
 return valid.destinationUrl;
}
export async function saveAlert(input:any,db:Store,options:ServiceOptions) {
 if(input.company)return {saved:true,deliveryEnabled:false};
 const email=tidy(input.email,254).toLowerCase();if(!/^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/.test(email))throw new InputError('Enter a valid email address.');
 const result=await loadResult(String(input.resultId||''),db,options);if(result.mode==='demo'||result.mode==='sandbox')throw new InputError('Price-alert requests are for your own product searches, not examples.');
 const threshold=input.threshold===null||input.threshold===undefined?null:input.threshold;
 if(threshold!==null&&(typeof threshold!=='number'||!Number.isFinite(threshold)||threshold<=0||threshold>1_000_000))throw new InputError('Enter a positive desired price, or leave it blank.');
 const id=digest(email+'|'+result.sourceProduct.id),old=await db.get('circular-email-alerts/'+id);
 await db.set('circular-email-alerts/'+id,{id,email,product:result.sourceProduct,desiredPrice:threshold,createdAt:old?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString(),status:'pending_delivery_setup'});
 await log(db,'email_submitted',{experiment:'samething',mode:'alert_request'});
 return {saved:true,deliveryEnabled:false,message:'Request saved. Automatic price monitoring and email delivery are not connected yet.'};
}
