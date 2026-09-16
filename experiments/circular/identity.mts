import { createHash } from 'node:crypto';
import type { ProductIdentity, SearchRequest } from './schema.mjs';
export const tidy=(v:unknown,max=240):string=>typeof v==='string'?v.replace(/[<>\x00-\x1f]/g,' ').replace(/\s+/g,' ').trim().slice(0,max):'';
export const normalize=(v:unknown)=>tidy(v).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export const validAmount=(v:unknown):number|null=>typeof v==='number'&&Number.isFinite(v)&&v>0&&v<=1_000_000?Math.round(v*100)/100:null;
export const digest=(v:string)=>createHash('sha256').update(v).digest('hex');
export function identityId(p:ProductIdentity):string {
 const key=p.gtin?'gtin:'+p.gtin.padStart(14,'0'):p.mpn?'mpn:'+normalize(p.brand)+'|'+normalize(p.mpn):p.brand&&p.model?'model:'+normalize(p.brand)+'|'+normalize(p.model):'title:'+normalize(p.productName);
 return digest(key+'|'+JSON.stringify(Object.fromEntries(Object.entries(p.attributes).sort(([a],[b])=>a.localeCompare(b))))).slice(0,24);
}
const hosts=['amazon.com','bestbuy.com','apple.com','sony.com','electronics.sony.com','garmin.com','makitatools.com','store.hermanmiller.com','hermanmiller.com','rei.com','target.com','walmart.com','dell.com','safaviehhome.com','decormarket.com','englishelm.com','modishstore.com'];
export function productUrl(value:string):string {
 const u=new URL(value);
 if(u.protocol!=='https:'||u.port||u.username||u.password||!hosts.some(h=>u.hostname===h||u.hostname==='www.'+h)||u.pathname==='/'||/\b(account|login|signin|checkout|cart|orders|api|logout)\b/i.test(u.pathname))throw new Error('This URL is not supported for automatic extraction. Search the product name instead.');
 for(const k of [...u.searchParams.keys()])if(!['sku','skuId','id','pid','variant','th'].includes(k))u.searchParams.delete(k);
 u.hash='';return u.href;
}
export function attributesOf(title:string):Record<string,string> {
 const out:Record<string,string>={};const storage=title.match(/\b(\d{2,4})\s*(GB|TB)\b/i);if(storage)out.storage=storage[1]+storage[2].toUpperCase();
 if(/\bunlocked\b/i.test(title))out.lock='unlocked';else if(/\b(AT&T|Verizon|T-Mobile)\b/i.test(title))out.lock=title.match(/\b(AT&T|Verizon|T-Mobile)\b/i)![1].toLowerCase();
 if(/\b(body only|camera body)\b/i.test(title)||/\bsony\b.*\bbody\b/i.test(title))out.kit='body only';
 else if(/\b(lens kit|with lens|\d+-\d+mm)\b/i.test(title))out.kit='lens kit';
 if(/\bbare tool\b/i.test(title))out.kit='bare tool';
 const size=title.match(/\bsize\s+([abc])\b/i);if(size)out.size=size[1].toUpperCase();
 if(/\bremastered\b/i.test(title))out.generation='remastered';else if(/\baeron classic\b/i.test(title))out.generation='classic';
 return out;
}
export function infer(title:string) {
 const brand=/\b(apple|iphone)\b/i.test(title)?'Apple':/\bsony\b/i.test(title)?'Sony':/herman miller/i.test(title)?'Herman Miller':/\bmakita\b/i.test(title)?'Makita':/\bgarmin\b/i.test(title)?'Garmin':null;
 let model:string|null=null;
 const phone=title.match(/\biPhone\s+(\d{1,2})(\s+Pro\s+Max|\s+Pro|\s+Plus|\s+mini)?\b/i);if(phone)model='iPhone '+phone[1]+(phone[2]?phone[2].replace(/\s+/g,' ').replace(/pro/ig,'Pro').replace(/max/ig,'Max').replace(/plus/ig,'Plus'):'');
 const camera=title.match(/\b(?:A7|α7|Alpha 7)\s*(III|IV|II|V|[2-5])\b/i);if(camera)model='A7 '+({'2':'II','3':'III','4':'IV','5':'V'}[camera[1]]||camera[1].toUpperCase());
 if(/\baeron\b/i.test(title))model='Aeron';
 if(brand==='Makita')model=title.match(/\b(?:XFD|XPH|DDF|DHP)\d{2,3}[A-Z0-9]*\b/i)?.[0].toUpperCase()??null;
 if(brand==='Garmin')model=title.match(/\b(?:fenix|fēnix)\s+\d+[SX]?(?:\s+Pro)?\b/i)?.[0]??null;
 const category=/\biphone\b/i.test(title)?'phone':/\b(a7|camera|α7|alpha 7|ilce)\b/i.test(title)?'camera':/\b(aeron|chair)\b/i.test(title)?'chair':/\b(drill|XFD\d+|XPH\d+|DDF\d+|DHP\d+)\b/i.test(title)?'tool':/\b(watch|fenix|fēnix)\b/i.test(title)?'watch':'other';
 return {brand,model,category};
}
export function identifyQuery(input:SearchRequest,now=new Date().toISOString()):ProductIdentity {
 const productName=tidy(input.productName||input.query);if(productName.length<3)throw new Error('Enter a product name with its model number if you know it.');
 const guessed=infer(productName);const brand=tidy(input.brand)||guessed.brand, model=tidy(input.model)||guessed.model;
 const attributes:Record<string,string>={...attributesOf(productName)};
 for(const [k,v]of Object.entries(input.attributes||{}).slice(0,10))if(/^[a-z_]{1,30}$/.test(k)&&tidy(v,80))attributes[k]=tidy(v,80);
 const newPrice=validAmount(input.newPrice);
 const product:ProductIdentity={id:'',productName,brand,model,mpn:null,gtin:null,category:guessed.category,newPrice,currency:'USD',imageUrl:null,sourceUrl:null,attributes,priceBasis:newPrice===null?'unknown':'user',createdAt:now,updatedAt:now};product.id=identityId(product);return product;
}
const typeIs=(v:any,t:string)=>[v?.['@type']].flat().some(x=>String(x).split('/').pop()===t);
const label=(v:any)=>tidy(typeof v==='object'?v?.name:v)||null;
const safeImage=(v:any)=>{try{const u=new URL(typeof v==='object'?v?.url:v);return u.protocol==='https:'?u.href:null}catch{return null}};
export function parseProductPage(html:string,url:string,now=new Date().toISOString()):ProductIdentity|null {
 const products:any[]=[];const walk=(v:any,depth=0)=>{if(!v||typeof v!=='object'||depth>20)return;if(typeIs(v,'Product')){products.push(v);return;}for(const x of Object.values(v))if(x&&typeof x==='object')Array.isArray(x)?x.forEach(y=>walk(y,depth+1)):walk(x,depth+1)};
 for(const m of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi))try{walk(JSON.parse(m[1]))}catch{}
 const meta=(key:string)=>{for(const m of html.matchAll(/<meta\b[^>]*>/gi)){const tag=m[0];const k=tag.match(/(?:name|property)\s*=\s*["']([^"']+)["']/i)?.[1];if(k===key)return tidy(tag.match(/content\s*=\s*["']([^"']+)["']/i)?.[1]);}return'';};
 const matching=products.filter(p=>{try{return productUrl(p.url)===url}catch{return false}});
 const p=matching.length===1?matching[0]:products.length===1?products[0]:null;
 const name=label(p?.name)||meta('og:title')||meta('twitter:title')||tidy(html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]);
 if(!name)return null;
 const result=identifyQuery({query:name},now);result.sourceUrl=url;result.imageUrl=safeImage([p?.image].flat()[0])||safeImage(meta('og:image'));
 result.brand=label(p?.brand)||result.brand;result.model=label(p?.model)||label(p?.mpn)||result.model;result.mpn=label(p?.mpn);
 const gtin=String(p?.gtin||p?.gtin13||p?.gtin12||p?.gtin14||p?.gtin8||'');result.gtin=/^\d{8,14}$/.test(gtin)?gtin:null;
 for(const prop of [p?.additionalProperty].flat().filter(Boolean)){const key=normalize(prop.name).replaceAll(' ','_');if(/^(storage|lock|size|kit|generation|color|screen_size)$/.test(key)&&label(prop.value))result.attributes[key]=label(prop.value)!;}
 const offers=[p?.offers].flat().filter(o=>o&&typeIs(o,'Offer'));
 const offer=offers.length===1?offers[0]:offers.filter(o=>{try{return productUrl(o.url)===url}catch{return false}}).length===1?offers.find(o=>{try{return productUrl(o.url)===url}catch{return false}}):null;
 // Never use AggregateOffer.lowPrice, a variant minimum or a crossed-out price.
 const currency=String(offer?.priceCurrency||meta('product:price:currency')).toUpperCase();
 const condition=String(offer?.itemCondition||p?.itemCondition||'').split('/').pop();
 const unavailable=/OutOfStock|SoldOut|Discontinued|PreOrder/.test(String(offer?.availability));
 const raw=offer?.price??(!products.length?meta('product:price:amount'):null);
 const numeric=/^\d+(?:\.\d{1,2})?$/.test(String(raw))?validAmount(+raw):null;
 if(currency==='USD'&&numeric&&!unavailable&&(!condition||condition==='NewCondition')&&!/\b(used|refurbished|renewed|open.box)\b/i.test(name)){result.newPrice=numeric;result.priceBasis='retailer';}
 result.id=identityId(result);return result;
}
export async function extractProduct(value:string,fetcher:typeof fetch=fetch):Promise<ProductIdentity|null> {
 let url=productUrl(value);const signal=AbortSignal.timeout(7000);
 for(let redirects=0;redirects<3;redirects++){
  const r=await fetcher(url,{redirect:'manual',signal,headers:{Accept:'text/html','User-Agent':'LoopholeProductMetadata/1.0'}});
  if([301,302,303,307,308].includes(r.status)){const loc=r.headers.get('location');await r.body?.cancel();if(!loc)return null;url=productUrl(new URL(loc,url).href);continue;}
  if(!r.ok||!r.headers.get('content-type')?.includes('text/html')){await r.body?.cancel();return null;}
  const reader=r.body?.getReader();if(!reader)return null;let size=0;const parts:Uint8Array[]=[];
  while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>1_500_000){await reader.cancel();return null;}parts.push(value);}
  return parseProductPage(Buffer.concat(parts).toString('utf8'),url);
 }
 return null;
}
