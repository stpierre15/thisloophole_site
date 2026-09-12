import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAmazonData, amazonData } from '../lib/amazon-data.mjs';
const asin='B0D1TX35MQ';
const data={request_info:{success:true},product:{asin,title:'Dell U4025QW',model_number:'U4025QW',buybox_winner:{price:{currency:'USD',value:1500},rrp:{currency:'USD',value:2500},fulfillment:{is_sold_by_amazon:false,third_party_seller:{name:'Actual Seller'}},availability:{type:'in_stock'}}}};
test('Amazon adapter uses the exact ASIN buy-box price and actual seller, never MSRP',()=>{
 const r=parseAmazonData(data,{request_info:{success:true},offers:[{offer_asin:asin,buybox_winner:true,price:{currency:'USD',value:1500},seller:{name:'Actual Seller'},condition:{is_new:false,title:'Used - Like New'}}]},asin);
 assert.equal(r.price,1500);assert.equal(r.seller,'Actual Seller');assert.equal(r.condition,'used');
 assert.equal(parseAmazonData(data,null,'B000000000'),null);
});
test('missing buy-box prices and unknown condition remain unknown',()=>{
 const r=parseAmazonData({...data,product:{...data.product,buybox_winner:{rrp:{currency:'USD',value:2500}}}},null,asin);
 assert.equal(r.price,null);assert.equal(r.condition,null);assert.equal(r.seller,null);
});
test('unconfigured Amazon adapter makes no requests',async()=>{
 let calls=0;assert.equal(await amazonData('https://amazon.com/dp/'+asin,{key:'',fetcher:async()=>{calls++;}}),null);assert.equal(calls,0);
});
test('secondary offers failure preserves a successful product buy box',async()=>{
 const r=await amazonData('https://amazon.com/dp/'+asin,{key:'test-key',fetcher:async url=>{
  if(url.searchParams.get('type')==='offers')throw new Error('timeout');
  return {ok:true,json:async()=>({...data,product:{...data.product,buybox_winner:{...data.product.buybox_winner,condition:{is_new:true}}}})};
 }});
 assert.equal(r.price,1500);assert.equal(r.seller,'Actual Seller');assert.equal(r.condition,'new');
});
