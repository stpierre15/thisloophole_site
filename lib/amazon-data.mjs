import { productKey } from './market-search.mjs';
const tidy=v=>typeof v==='string'?v.replace(/[<>\x00-\x1f]/g,' ').trim().slice(0,240):null;
const usd=p=>p?.currency==='USD'&&Number.isFinite(Number(p.value))&&Number(p.value)>0&&Number(p.value)<=1_000_000?Math.round(Number(p.value)*100)/100:null;
export function conditionOf(c) {
  if(c?.is_new===true)return 'new';
  const name=String(c?.title||'').toLowerCase();
  if(/renewed|refurbished/.test(name))return 'refurbished';
  if(/open.box/.test(name))return 'open_box';
  if(c?.is_new===false||/used/.test(name))return 'used';
  return null;
}
const asinOf=v=>/^[A-Z0-9]{10}$/i.test(String(v||''))?String(v).toUpperCase():null;
const amazonUrl=asin=>'https://www.amazon.com/dp/'+asin;
const queryTokens=value=>new Set(String(value||'').toLowerCase().match(/[a-z0-9]+/g)?.filter(x=>x.length>1&&!['the','a','an','for','with'].includes(x))||[]);
export function parseAmazonSearch(data,query) {
  if(!data?.request_info?.success||!Array.isArray(data.search_results))return [];
  const wanted=queryTokens(query);
  return data.search_results.flatMap((r,index)=>{
    const asin=asinOf(r?.asin),title=tidy(r?.title);if(!asin||!title)return [];
    const actual=queryTokens(title),matched=[...wanted].filter(x=>actual.has(x)).length;
    if(wanted.size&&matched/Math.max(1,wanted.size)<.66)return [];
    const prices=[r?.price,...(Array.isArray(r?.prices)?r.prices:[])].map(usd).filter(x=>x!==null);
    return [{asin,title,url:amazonUrl(asin),price:prices.length?Math.min(...prices):null,image:typeof r?.image==='string'&&r.image.startsWith('https://')?r.image:null,sponsored:r?.sponsored===true||r?.is_sponsored===true,position:Number(r?.position)||index+1,matchRatio:wanted.size?matched/wanted.size:0}];
  }).sort((a,b)=>Number(a.sponsored)-Number(b.sponsored)||b.matchRatio-a.matchRatio||a.position-b.position).slice(0,5);
}
export async function amazonSearch(query,{key=process.env.RAINFOREST_API_KEY,fetcher=fetch}={}) {
  if(!key||typeof query!=='string'||query.trim().length<3)return [];
  try{
    const endpoint=new URL('https://api.rainforestapi.com/request');
    endpoint.search=new URLSearchParams({api_key:key,type:'search',amazon_domain:'amazon.com',search_term:query.trim()}).toString();
    const response=await fetcher(endpoint,{signal:AbortSignal.timeout(35000),redirect:'error'});
    if(!response.ok)return [];
    return parseAmazonSearch(await response.json(),query);
  }catch{return []}
}
export function parseAmazonData(data, offersData, asin, now=new Date()) {
  const p=data?.product;
  if(!data?.request_info?.success||p?.asin!==asin)return null;
  const buybox=p.buybox_winner;
  const price=usd(buybox?.price);
  const seller=buybox?.fulfillment?.is_sold_by_amazon===true?'Amazon':tidy(buybox?.fulfillment?.third_party_seller?.name);
  const offer=offersData?.request_info?.success ? (offersData.offers||[]).find(o=>o.buybox_winner===true&&(!o.offer_asin||o.offer_asin===asin)&&usd(o.price)===price&&(!seller||tidy(o.seller?.name)===seller)) : null;
  const condition=conditionOf(offer?.condition || buybox?.condition);
  const url='https://www.amazon.com/dp/'+asin;
  return {url,merchant:'Amazon',product_name:tidy(p.title),model:tidy(p.model_number),price,seller:seller||tidy(offer?.seller?.name),condition,
    availability:buybox?.availability?.type==='in_stock'?'InStock':null,alternatives:[],source_type:'RETAILER_DATA',observed_at:now.toISOString(),
    sources:[{url,title:tidy(p.title)||'Amazon listing',excerpt:price!==null?'Amazon offer reported through Rainforest API: $'+price.toFixed(2)+(seller?' · Sold by '+seller:''):'The data provider did not report a current buy-box price.'}]};
}
export async function amazonData(url,{key=process.env.RAINFOREST_API_KEY,fetcher=fetch}={}) {
  const id=productKey(url);
  if(!key||!id?.startsWith('amazon:'))return null;
  const asin=id.slice(7);
  try {
    const get=async type=>{
      const endpoint=new URL('https://api.rainforestapi.com/request');
      endpoint.search=new URLSearchParams({api_key:key,type,amazon_domain:'amazon.com',asin}).toString();
      const r=await fetcher(endpoint,{signal:AbortSignal.timeout(35000),redirect:'error'});
      if(!r.ok)return null;
      return r.json();
    };
    const [product,offers]=await Promise.allSettled([get('product'),get('offers')]);
    return parseAmazonData(product.status==='fulfilled'?product.value:null,offers.status==='fulfilled'?offers.value:null,asin);
  } catch { return null; }
}

const freeShipping=o=>o?.shipping?.is_free===true||/^free$/i.test(String(o?.shipping?.raw||''));
const shippingOf=o=>freeShipping(o)?0:usd(o?.shipping?.price||o?.delivery?.price);
const sellerOf=o=>o?.fulfillment?.is_sold_by_amazon===true?'Amazon':tidy(o?.seller?.name)||tidy(o?.fulfillment?.third_party_seller?.name);
export function parseAmazonOfferListings(productData,offersData,asin,now=new Date()) {
  const p=productData?.product;
  if(!productData?.request_info?.success||p?.asin!==asin)return [];
  const title=tidy(p.title),image=typeof p?.main_image?.link==='string'&&p.main_image.link.startsWith('https://')?p.main_image.link:null;
  if(!title)return [];
  const rows=offersData?.request_info?.success&&Array.isArray(offersData.offers)?offersData.offers:[];
  const buybox=p.buybox_winner;
  const combined=[...rows];
  if(buybox&&!combined.some(o=>o.buybox_winner===true))combined.unshift({...buybox,buybox_winner:true,seller:buybox.fulfillment?.third_party_seller});
  const seen=new Set();
  return combined.flatMap((offer,index)=>{
    if(offer?.offer_asin&&offer.offer_asin!==asin)return [];
    const price=usd(offer?.price),condition=conditionOf(offer?.condition);if(price===null||!condition)return [];
    const seller=sellerOf(offer),shippingPrice=shippingOf(offer);
    const key=[condition,price,seller||'',shippingPrice??'unknown'].join('|');if(seen.has(key))return [];seen.add(key);
    const availability=offer?.availability?.type||buybox?.availability?.type;
    if(/out_of_stock|unavailable/i.test(String(availability||'')))return [];
    const suffix=tidy(offer?.offer_id,100)||String(index+1);
    return [{id:'amazon-'+asin+'-'+index,provider:'Amazon Product Data',providerListingId:asin+':'+suffix,title,price,shippingPrice,totalPrice:shippingPrice===null?null:Math.round((price+shippingPrice)*100)/100,currency:'USD',condition,conditionText:tidy(offer?.condition?.title)||condition.replace('_',' '),sellerName:seller,imageUrl:image,destinationUrl:amazonUrl(asin),brand:tidy(p?.brand),model:tidy(p?.model_number),mpn:tidy(p?.model_number),gtin:null,attributes:{},category:'other',fetchedAt:now.toISOString(),available:true,demo:false,conditionDescription:'Condition is reported by the Amazon offer. Inspect the listing for wear, included parts and seller notes.',returns:null,warranty:null,previousModel:false}];
  });
}
export async function amazonOfferListings(url,{key=process.env.RAINFOREST_API_KEY,fetcher=fetch}={}) {
  const id=productKey(url);if(!key||!id?.startsWith('amazon:'))return [];
  const asin=id.slice(7);
  try{
    const get=async type=>{
      const endpoint=new URL('https://api.rainforestapi.com/request');
      endpoint.search=new URLSearchParams({api_key:key,type,amazon_domain:'amazon.com',asin}).toString();
      const response=await fetcher(endpoint,{signal:AbortSignal.timeout(35000),redirect:'error'});
      if(!response.ok)return null;return response.json();
    };
    const [product,offers]=await Promise.allSettled([get('product'),get('offers')]);
    return parseAmazonOfferListings(product.status==='fulfilled'?product.value:null,offers.status==='fulfilled'?offers.value:null,asin);
  }catch{return []}
}
