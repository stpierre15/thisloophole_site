// Editorial maintenance only. Reads a fixed list of public storefront records;
// it does not crawl pages, use credentials, or publish unreviewed prices.
import { writeFile } from 'node:fs/promises';
const models=process.argv[3]?.split(',')||['TBL4256A','TBL4283A','SFV2129A','TBL7020A','AMH8300B','SEA7002A','ACH4507A','FLL4065A','BCT8005A','TBL4117A-SET2'];
const stores=[{name:'Safavieh Home',host:'https://www.safaviehhome.com'},{name:'Decor Market',host:'https://www.decormarket.com'},{name:'English Elm',host:'https://englishelm.com'},{name:'Modish Store',host:'https://www.modishstore.com'}].filter(s=>!process.argv[4]||process.argv[4].split(',').includes(s.name));
const get=async url=>{const r=await fetch(url,{signal:AbortSignal.timeout(15000)});if(!r.ok)throw new Error(`Public product request returned ${r.status}`);return r.json()};
const report=[];
for(const store of stores){
 const cart=await get(store.host+'/cart.js');if(cart.currency!=='USD')throw new Error('Expected USD storefront');
 for(const model of models){
  const suggestions=await get(store.host+'/search/suggest.json?q='+encodeURIComponent(model)+'&resources[type]=product&resources[limit]=3');
  let found=null;
  for(const product of suggestions.resources?.results?.products||[]){
   const data=await get(store.host+'/products/'+product.handle+'.js');
   const variant=data.variants.find(v=>v.sku?.toUpperCase()===model);
   if(variant){found={model,store:store.name,title:data.title,variant:variant.title,price:variant.price/100,currency:'USD',acceptsOrders:variant.available,barcode:String(variant.barcode||'').replace(/[^0-9]/g,''),url:store.host+'/products/'+product.handle+'?variant='+variant.id,evidenceUrl:store.host+'/products/'+product.handle+'.js',observedAt:new Date().toISOString()};break}
  }
  report.push(found||{model,store:store.name,error:'No exact model returned'});
 }
}
const destination=process.argv[2];if(destination)await writeFile(destination,JSON.stringify(report,null,2)+'\n');else console.log(JSON.stringify(report,null,2));
