/** @param {import('../experiments/same-thing/price-board.js').PriceGapEntry[]} entries */
export function rankPriceGaps(entries,limit=10){
 return entries.flatMap(entry=>{
  const eligible=entry.offers.filter(o=>o.model===entry.model&&o.barcode===entry.barcode&&o.currency==='USD'&&o.condition==='new'&&o.acceptsOrders&&Number.isFinite(o.price)&&o.price>0&&isSourceUrl(o.url)&&isSourceUrl(o.evidenceUrl));
  const unique=eligible.filter((o,i,a)=>a.findIndex(x=>x.store===o.store)===i).sort((a,b)=>b.price-a.price);
  if(unique.length<2)return[];
  const highest=unique[0],lowest=unique[unique.length-1];if(highest.price<=lowest.price)return[];
  const savings=Math.round((highest.price-lowest.price)*100)/100;
  return[{...entry,offers:unique,highest,lowest,savings,premium:(highest.price/lowest.price-1)*100,percentLess:(1-lowest.price/highest.price)*100}];
 }).sort((a,b)=>b.premium-a.premium||b.savings-a.savings||a.id.localeCompare(b.id)).slice(0,limit).map((entry,i)=>({...entry,rank:i+1}));
}
function isSourceUrl(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port}catch{return false}}
/** @param {import('../experiments/same-thing/price-board.js').PriceGapEntry[]} entries */
export function validatePriceGaps(entries){
 const ranked=rankPriceGaps(entries);if(entries.length!==10||ranked.length!==10)throw new Error('The published board requires ten supported price gaps.');
 if(new Set(entries.map(e=>e.id)).size!==10||new Set(entries.map(e=>e.model)).size!==10)throw new Error('Duplicate product identity.');
 for(const entry of entries){
  if(!entry.barcode||!entry.variant||entry.quantity<1)throw new Error('Incomplete product identity.');
  for(const offer of entry.offers){if(offer.model!==entry.model||offer.barcode!==entry.barcode||!Number.isFinite(Date.parse(offer.observedAt))||!offer.deliveryNote)throw new Error('Unreviewed or mismatched offer.');}
 }
 return ranked;
}
