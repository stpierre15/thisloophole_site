import { InputError, merchantFromUrl } from './engine.mjs';

// Only public catalog pages on these exact retail hosts may be fetched.
const domains = ['bestbuy.com','apple.com','target.com','costco.com','rei.com','amazon.com','walmart.com','dell.com'];
export function listingUrl(value) {
  let u;
  try { u = new URL(value); } catch { throw new InputError('Enter a complete product URL.'); }
  if (u.protocol !== 'https:' || u.port || u.username || u.password || !domains.some(d => u.hostname === d || u.hostname === 'www.' + d) ||
      /\b(account|login|signin|checkout|cart|api|logout|orders)\b/i.test(u.pathname) || u.pathname === '/') {
    throw new InputError('Automatic lookup supports public HTTPS product pages from Best Buy, Apple, Target, Costco, REI, Amazon, Walmart and Dell. Enter details manually for other sites.');
  }
  // Keep catalog variant identifiers, never advertising or session parameters.
  for (const key of [...u.searchParams.keys()]) if (!['skuId','sku','id','pid','variant','th'].includes(key)) u.searchParams.delete(key);
  u.hash = '';
  return u.href;
}
const typeIs = (o, type) => [o?.['@type']].flat().some(t => String(t).split('/').pop() === type);
const clean = v => typeof v === 'string' ? v.replace(/[<>\x00-\x1f]/g,'').trim().slice(0,240) : null;
const condition = v => ({NewCondition:'new',UsedCondition:'used',RefurbishedCondition:'refurbished',OpenBoxCondition:'open_box'})[String(v).split('/').pop()] || null;
const amount = v => /^(\d+)(\.\d{1,2})?$/.test(String(v)) && +v > 0 && +v <= 1_000_000 ? +v : null;
const label = v => clean(typeof v === 'object' ? v?.name : v);
const resolveOfferUrl = (v, base) => { try { return canonical(new URL(v || base,base).href); } catch { return null; } };
const canonical = v => { try { return listingUrl(v); } catch { return null; } };

export function parseListing(html, url, now = new Date()) {
  const products = [];
  function walk(v) {
    if (!v || typeof v !== 'object') return;
    if (typeIs(v,'Product')) { products.push(v); return; }
    for (const child of Object.values(v)) if (child && typeof child === 'object') {
      if (Array.isArray(child)) child.forEach(walk); else walk(child);
    }
  }
  for (const script of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script\s*>/gi)) {
    try { walk(JSON.parse(script[1])); } catch { /* Ignore malformed structured data, never execute scripts. */ }
  }
  const sku = new URL(url).pathname.match(/\/sku\/(\d+)/)?.[1];
  const exact = products.filter(p => canonical(p.url) === url || (sku && String(p.sku) === sku));
  const product = exact.length === 1 ? exact[0] : products.length === 1 && (!sku || !products[0].sku || String(products[0].sku) === sku) ? products[0] : null;
  const base = {url, merchant:merchantFromUrl(url) || (new URL(url).hostname.endsWith('dell.com') ? 'Dell' : null), product_name:null, model:null, price:null, condition:null, seller:null, alternatives:[], observed_at:now.toISOString()};
  if (!product) return {...base,status:'unavailable',message:'This page did not expose an unambiguous product listing. Enter the price, seller and condition shown on the page.'};
  const rawOffers = [product.offers].flat().flatMap(o => typeIs(o,'AggregateOffer') ? [o.offers].flat() : [o]).filter(Boolean);
  const offers = rawOffers.filter(o => typeIs(o,'Offer') && String(o.priceCurrency || '').toUpperCase() === 'USD').map(o => ({
    price:amount(o.price), url:resolveOfferUrl(o.url,url),
    seller:label(o.seller || product.seller), condition:condition(o.itemCondition || product.itemCondition),
    availability:String(o.availability || '').split('/').pop() || null,
  })).filter(o => o.price !== null && o.url);
  const exactOffers = offers.filter(o => o.url === url);
  const selected = exactOffers.length === 1 ? exactOffers[0] : offers.length === 1 && offers[0].url === url ? offers[0] : null;
  const alternatives = offers.filter(o => o.url !== url && o.availability === 'InStock').filter((o,i,a) => a.findIndex(v => v.url === o.url && v.seller === o.seller && v.price === o.price) === i).slice(0,5);
  return {...base,product_name:clean(product.name),model:label(product.model) || clean(product.mpn),
    price:selected?.availability && ['OutOfStock','SoldOut','Discontinued','PreOrder'].includes(selected.availability) ? null : selected?.price ?? null,
    seller:selected?.seller || label(product.seller),condition:selected?.condition || condition(product.itemCondition),alternatives,
    status:selected ? 'partial' : 'unavailable',message:'Details read from the listing. Confirm the seller, final price and condition before checking. Other offers have not been checked for equivalent warranty or delivery.'};
}

export async function inspectListing(value, fetcher = fetch) {
  let url = listingUrl(value);
  const original = url;
  const signal = AbortSignal.timeout(9000);
  try {
    for (let n=0;n<4;n++) {
      const response = await fetcher(url,{redirect:'manual',signal,headers:{Accept:'text/html','User-Agent':'LoopholeProductCheck/1.0'}});
      if ([301,302,303,307,308].includes(response.status)) {
        const location = response.headers.get('location');
        await response.body?.cancel();
        if (!location) throw new Error('Missing redirect');
        url = listingUrl(new URL(location,url).href); continue;
      }
      if (!response.ok || !response.headers.get('content-type')?.includes('text/html')) { await response.body?.cancel(); throw new Error('Page unavailable'); }
      const reader = response.body.getReader(); const parts=[]; let size=0;
      while (true) {
        const {done,value:chunk}=await reader.read(); if(done)break;
        size+=chunk.byteLength;
        if(size>2_000_000){await reader.cancel();throw new Error('Page too large');}
        parts.push(chunk);
      }
      return parseListing(Buffer.concat(parts).toString('utf8'),url);
    }
  } catch { /* Retrieval failure is missing evidence, never a negative market finding. */ }
  return {url:original,merchant:merchantFromUrl(original),price:null,seller:null,condition:null,alternatives:[],status:'unavailable',message:'We could not read this retailer’s listing automatically. Enter its price, sold-by seller and condition. Alternative offers could not be checked; that does not mean none exist.'};
}
