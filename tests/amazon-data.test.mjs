import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAmazonData, amazonData, parseAmazonSearch, parseAmazonOfferListings } from '../lib/amazon-data.mjs';
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
test('catalog search resolves an ordinary product name without accepting unrelated or sponsored results first',()=>{
 const result=parseAmazonSearch({request_info:{success:true},search_results:[
  {position:1,title:'Replacement plates for another appliance',asin:'B000000001',price:{currency:'USD',value:20}},
  {position:2,title:'Ninja Belgian Waffle Maker Pro',asin:'B000000002',price:{currency:'USD',value:99.99},is_sponsored:true},
  {position:3,title:'Ninja NeverStick Waffle Maker',asin:'B000000003',price:{currency:'USD',value:79.99}}
 ]},'ninja waffle maker');
 assert.equal(result.length,2);assert.equal(result[0].asin,'B000000003');assert.equal(result[0].price,79.99);
});
test('Amazon offers preserve explicit condition, seller and unknown shipping',()=>{
 const product={request_info:{success:true},product:{asin,title:'Ninja NeverStick Waffle Maker',brand:'Ninja',model_number:'BW1001',main_image:{link:'https://images.example/waffle.jpg'},buybox_winner:{price:{currency:'USD',value:79.99},condition:{is_new:true,title:'New'},availability:{type:'in_stock'},fulfillment:{is_sold_by_amazon:true}}}};
 const offers={request_info:{success:true},offers:[
  {offer_asin:asin,offer_id:'new',buybox_winner:true,price:{currency:'USD',value:79.99},condition:{is_new:true,title:'New'},seller:{name:'Amazon'},shipping:{is_free:true}},
  {offer_asin:asin,offer_id:'used',price:{currency:'USD',value:49.5},condition:{is_new:false,title:'Used - Very Good'},seller:{name:'Kitchen Resale'}}
 ]};
 const rows=parseAmazonOfferListings(product,offers,asin,new Date('2026-09-20T00:00:00Z'));
 assert.equal(rows.length,2);assert.equal(rows[0].condition,'new');assert.equal(rows[0].shippingPrice,0);assert.equal(rows[1].condition,'used');assert.equal(rows[1].shippingPrice,null);assert.equal(rows[1].model,'BW1001');
});
