import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSearchResponse, searchMarket, productKey, sourceUrl } from '../lib/market-search.mjs';
const url='https://www.amazon.com/dp/B012345678';
const alt='https://www.dell.com/en-us/shop/model40/monitor';
const make=(patch={},citationPatch={})=>({content:[{type:'web_search_tool_result',content:[{type:'web_search_result',url}]},{type:'text',text:JSON.stringify({name:'Monitor MODEL40',model:'MODEL40',url,price:500,currency:'USD',condition:'new',seller:'Example Seller',availability:'InStock',...patch}),citations:[{type:'web_search_result_location',url,title:'Monitor MODEL40',cited_text:'MODEL40 current price $500.00 New. In stock. Sold by Example Seller.',...citationPatch}]}]});
test('price and attributes require provider-native retailer citations',()=>{
  const r=parseSearchResponse(make(),url);assert.equal(r.current.price,500);assert.equal(r.current.condition,'new');assert.equal(r.current.seller,'Example Seller');assert.equal(r.current.availability,'InStock');
  assert.equal(parseSearchResponse(make({price:400}),url).current.price,null);
  assert.equal(parseSearchResponse(make({condition:'used'}),url).current.condition,null);
  assert.equal(parseSearchResponse(make({}, {cited_text:'Price unavailable'}),url).current.price,null);
});
test('invented sources, unsupported seller and fabricated model are rejected',()=>{
  const r=make();r.content[1].citations[0].url=alt;assert.equal(parseSearchResponse(r,url).current,null);
  assert.equal(parseSearchResponse(make({seller:'Someone Else',model:'OTHER999'}),url).current.model,null);
  assert.equal(parseSearchResponse(make({seller:'Someone Else'}),url).current.seller,null);
});
test('Amazon titles and tracking do not change ASIN identity',()=>{
  assert.equal(productKey(url),productKey('https://amazon.com/long-product-title/gp/product/B012345678/ref=abc?tag=affiliate'));
  assert.notEqual(productKey(url),productKey('https://amazon.com/dp/B087654321'));
  for(const u of ['https://amazon.com.evil.example/dp/B012345678','https://amazon.com/your-orders/order-details','https://127.0.0.1/x'])assert.equal(sourceUrl(u),null);
});
test('missing connection and upstream authorization failures produce no fabricated evidence',async()=>{
  const absent=await searchMarket('monitor',{key:''});assert.equal(absent.status,'unavailable');assert.deepEqual(absent.alternatives,[]);
  const bad=await searchMarket('monitor',{key:'test',fetcher:async()=>new Response('{}',{status:401})});assert.equal(bad.status,'unavailable');assert.match(bad.message,/authorization/);
});
test('tool-level search failure cannot be described as no alternatives',()=>{
  const r=parseSearchResponse({content:[{type:'web_search_tool_result',content:{type:'web_search_tool_result_error'}}]},url);
  assert.equal(r.status,'unavailable');
});


test('canonical Amazon links can use citations to the same ASIN under a product-title URL',()=>{
  const r=make();const long='https://www.amazon.com/Example-Monitor-MODEL40/dp/B012345678';
  r.content[0].content[0].url=long;r.content[1].citations[0].url=long;
  assert.equal(parseSearchResponse(r,url).current.price,500);
});
