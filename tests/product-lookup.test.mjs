import test from 'node:test';
import assert from 'node:assert/strict';
import { listingUrl, parseListing, inspectListing } from '../lib/product-lookup.mjs';
import { inspectProduct } from '../lib/api.mjs';
const url='https://www.bestbuy.com/product/test-monitor/ABC/sku/13059019';
const offer={ '@type':'Offer',price:'1545.00',priceCurrency:'USD',url,seller:{name:'Example Marketplace Seller'},itemCondition:'https://schema.org/RefurbishedCondition',availability:'https://schema.org/InStock'};
const product={'@type':'Product',name:'Example 40 inch monitor',sku:'13059019',model:'MODEL40',offers:offer};
const html=p=>'<script type="application/ld+json">'+JSON.stringify(p)+'</script>';
const response=body=>new Response(body,{headers:{'Content-Type':'text/html'}});

test('listing parser associates price, condition and seller with the selected SKU',()=>{
  const data=parseListing(html({'@graph':[product,{'@type':'Product',sku:'999',name:'Recommended monitor',offers:{...offer,price:12}}]}),url);
  assert.equal(data.price,1545);assert.equal(data.seller,'Example Marketplace Seller');assert.equal(data.condition,'refurbished');assert.equal(data.model,'MODEL40');
});
test('aggregate low price and ambiguous offers are never the current price',()=>{
  assert.equal(parseListing(html({...product,offers:{'@type':'AggregateOffer',lowPrice:99,priceCurrency:'USD'}}),url).price,null);
  assert.equal(parseListing(html({...product,offers:[offer,{...offer,price:99}]}),url).price,null);
});
test('only explicit same-product in-stock offers are comparison candidates',()=>{
  const second={...offer,url:url.replace('13059019','456'),price:1400};
  const data=parseListing(html({...product,offers:[offer,second,{...second,url:url.replace('13059019','789'),availability:'https://schema.org/OutOfStock'}]}),url);
  assert.equal(data.price,1545);assert.equal(data.alternatives.length,1);assert.equal(data.alternatives[0].price,1400);
});
test('unknown condition, unavailable inventory and foreign currency are not inferred',()=>{
  assert.equal(parseListing(html({...product,offers:{...offer,itemCondition:undefined}}),url).condition,null);
  for(const patch of [{availability:'https://schema.org/OutOfStock'},{priceCurrency:'EUR'},{price:'NaN'}]) assert.equal(parseListing(html({...product,offers:{...offer,...patch}}),url).price,null);
});
test('wrong SKU and malformed or absent data do not borrow recommended prices',()=>{
  for(const source of ['<html>Access unavailable $12</html>',html({...product,sku:'999',url:undefined}),'<script type="application/ld+json">bad JSON</script>']) assert.equal(parseListing(source,url).price,null);
});
test('fetch allowlist rejects private, spoofed, credential, port and account URLs',()=>{
  for(const bad of ['http://bestbuy.com/product/x','https://127.0.0.1/x','https://bestbuy.com.evil.example/x','https://u:p@bestbuy.com/x','https://bestbuy.com:8443/x','https://www.bestbuy.com/account/settings','https://unknown.example/product'])assert.throws(()=>listingUrl(bad));
  assert.equal(listingUrl(url+'?gclid=secret&session=secret&skuId=123#tracking'),url+'?skuId=123');
});
test('redirects cannot escape allowed public hosts',async()=>{
  let calls=0;
  const data=await inspectListing(url,async()=>{calls++;return new Response(null,{status:302,headers:{location:'https://127.0.0.1/private'}});});
  assert.equal(calls,1);assert.equal(data.status,'unavailable');assert.equal(data.price,null);
});
test('blocked responses and oversized responses are explicit missing evidence',async()=>{
  for(const fetcher of [async()=>new Response('blocked',{status:403}),async()=>response('x'.repeat(2_000_001)),async()=>{throw new Error('timeout');}]){
    const data=await inspectListing(url,fetcher);assert.equal(data.status,'unavailable');assert.equal(data.price,null);assert.deepEqual(data.alternatives,[]);assert.match(data.message,/does not mean none exist/);
  }
});
test('successful retrieval returns public listing evidence without evaluating savings',async()=>{
  const data=await inspectListing(url,async()=>response(html(product)));assert.equal(data.price,1545);assert.equal(data.potential_savings,undefined);
});
test('lookup endpoint rejects invalid methods, origins and unapproved hosts before fetch',async()=>{
  assert.equal((await inspectProduct(new Request('https://thisloophole.com/api/inspect-product'))).status,405);
  for(const [origin,link,status] of [['https://evil.example',url,403],['https://thisloophole.com','https://127.0.0.1/a',400]]){
    const req=new Request('https://thisloophole.com/api/inspect-product',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify({url:link})});
    assert.equal((await inspectProduct(req)).status,status);
  }
});
