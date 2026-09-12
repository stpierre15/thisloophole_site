import { productKey } from './market-search.mjs';
const tidy=v=>typeof v==='string'?v.replace(/[<>\x00-\x1f]/g,' ').trim().slice(0,240):null;
const usd=p=>p?.currency==='USD'&&typeof p.value==='number'&&Number.isFinite(p.value)&&p.value>0&&p.value<=1_000_000?p.value:null;
function conditionOf(c) {
  if(c?.is_new===true)return 'new';
  const name=String(c?.title||'').toLowerCase();
  if(/renewed|refurbished/.test(name))return 'refurbished';
  if(/open.box/.test(name))return 'open_box';
  if(c?.is_new===false||/used/.test(name))return 'used';
  return null;
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
