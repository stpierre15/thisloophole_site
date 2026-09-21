import test from 'node:test';
import assert from 'node:assert/strict';
import { demoData, previousFor } from '../.generated/circular/catalog.mjs';
import { normalizeEbayItem, EbayProvider, searchTerms, ebayDestination } from '../.generated/circular/ebay.mjs';
import { identifyQuery, parseProductPage, extractProduct, productUrl, productUrlHint } from '../.generated/circular/identity.mjs';
import { rankCandidates, economics } from '../.generated/circular/engine.mjs';
import { identify, search, loadResult, verifyOutbound, saveAlert } from '../.generated/circular/service.mjs';
import { createHandlers } from '../.generated/circular/handlers.mjs';
import { renderResult, shareText } from '../.generated/circular/view.mjs';
import { vercelAdapter } from '../lib/vercel-adapter.mjs';
const stamp='2026-09-16T17:00:00.000Z',now=Date.parse(stamp);
const store=()=>{const rows=new Map();return {rows,async get(k){return structuredClone(rows.get(k)??null)},async set(k,v){rows.set(k,structuredClone(v))}}};
const camera=()=>demoData('camera',stamp);
const live=(overrides={})=>({...camera().listings[0],demo:false,provider:'eBay',providerListingId:'v1|123|0',id:'ebay-v1|123|0',destinationUrl:'https://www.ebay.com/itm/123',...overrides});
const provider=(overrides={})=>({id:'ebay',configured:true,sandbox:false,async search({previous}){return previous?[]:[live()]},async getListing(){return live()},...overrides});
const opts=p=>({provider:p||provider(),clock:()=>now});
test('query normalization keeps the exact model, storage, kit and user baseline',()=>{
 const p=identifyQuery({query:' Apple iPhone 16 Pro 128GB unlocked ',newPrice:899},stamp);
 assert.equal(p.model,'iPhone 16 Pro');assert.equal(p.brand,'Apple');assert.equal(p.attributes.storage,'128GB');assert.equal(p.attributes.lock,'unlocked');assert.equal(p.priceBasis,'user');assert.equal(previousFor(p).previousModel,'iPhone 15 Pro');
 assert.equal(identifyQuery({query:'Sony A7 IV body'},stamp).attributes.kit,'body only');assert.equal(previousFor(identifyQuery({query:'Garmin watch'},stamp)),null);
 assert.equal(identifyQuery({query:'Sony A7 IV body'},stamp).id,identifyQuery({query:'Sony A7 IV camera body only'},stamp).id);
 assert.notEqual(identifyQuery({query:'Makita drill',model:'XFD13',brand:'Makita'},stamp).id,identifyQuery({query:'Makita drill',model:'XFD10',brand:'Makita'},stamp).id);
});
test('structured extraction ignores aggregate prices, ambiguous products and non-new offers',()=>{
 const page=p=>'<script type="application/ld+json">'+JSON.stringify(p)+'</script>';
 const url='https://www.bestbuy.com/product/test/sku/123';
 const p={'@type':'Product',name:'Sony A7 IV body',brand:{name:'Sony'},model:'A7 IV',mpn:'ILCE7M4',gtin12:'012345678901',offers:{'@type':'Offer',price:'1999.99',priceCurrency:'USD',itemCondition:'https://schema.org/NewCondition',availability:'https://schema.org/InStock'}};
 const parsed=parseProductPage(page(p),url,stamp);assert.equal(parsed.newPrice,1999.99);assert.equal(parsed.gtin,'012345678901');
 assert.equal(parseProductPage(page({...p,offers:{'@type':'AggregateOffer',lowPrice:99,priceCurrency:'USD'}}),url,stamp).newPrice,null);
 assert.equal(parseProductPage(page({...p,offers:{...p.offers,itemCondition:'UsedCondition'}}),url,stamp).newPrice,null);
 assert.equal(parseProductPage(page({...p,offers:{...p.offers,availability:'OutOfStock'}}),url,stamp).newPrice,null);
 assert.equal(parseProductPage(page([p,{...p,name:'Another product'}]),url,stamp),null);
 assert.equal(parseProductPage('<meta property="og:title" content="Sony A7 IV body"><meta property="product:price:amount" content="1999"><meta property="product:price:currency" content="USD">',url,stamp).newPrice,1999);
});
test('URL extraction forbids private hosts, credentials, unsafe redirects and oversized pages',async()=>{
 for(const url of ['http://127.0.0.1/x','https://localhost/x','https://www.amazon.com@127.0.0.1/x','https://amazon.com:4430/dp/X','https://amazon.com/account/x','https://evil.example/x'])assert.throws(()=>productUrl(url));
 assert.equal(productUrl('https://www.amazon.com/dp/B0D1TX35MQ?ref=secret&th=1'),'https://www.amazon.com/dp/B0D1TX35MQ?th=1');
 await assert.rejects(()=>extractProduct('https://www.apple.com/iphone/x',async()=>new Response(null,{status:302,headers:{location:'http://127.0.0.1/private'}})));
 assert.equal(await extractProduct('https://www.apple.com/iphone/x',async()=>new Response('x'.repeat(1_500_001),{headers:{'content-type':'text/html'}})),null);
});
test('the supplied Cosori URL keeps its variant and reads exact public product metadata',()=>{
 const supplied='https://cosori.com/products/turboblaze-air-fryer?variant=47075741335861&country=US&currency=USD&utm_source=google&gad_source=1&gclid=test';
 const url='https://cosori.com/products/turboblaze-air-fryer?variant=47075741335861';
 assert.equal(productUrl(supplied),url);
 const page='<script type="application/ld+json">'+JSON.stringify({
  '@context':'https://schema.org','@type':'Product',name:'TurboBlaze™ 6.0-Quart Air Fryer - Dark Gray',category:'Air Fryer',
  url:'https://cosori.com/products/turboblaze-air-fryer',sku:'KAAPAFCSNUS0161A',gtin:'810123670376',brand:{'@type':'Brand',name:'COSORI'},
  offers:{'@type':'Offer',availability:'https://schema.org/InStock',price:119.99,priceCurrency:'USD',sku:'KAAPAFCSNUS0161A',gtin:'810123670376',url}
 })+'</script>';
 const parsed=parseProductPage(page,url,stamp);
 assert.equal(parsed.productName,'TurboBlaze™ 6.0-Quart Air Fryer - Dark Gray');assert.equal(parsed.brand,'COSORI');assert.equal(parsed.category,'kitchen');
 assert.equal(parsed.newPrice,119.99);assert.equal(parsed.priceBasis,'retailer');assert.equal(parsed.gtin,'810123670376');assert.equal(parsed.retailerSku,'KAAPAFCSNUS0161A');assert.equal(parsed.identityBasis,'metadata');assert.equal(parsed.sourceUrl,url);
});
const rawItem=overrides=>({itemId:'v1|123|0',title:'Sony A7 IV camera body only',conditionId:'3000',condition:'Used',price:{currency:'USD',value:'1199'},itemWebUrl:'https://www.ebay.com/itm/123',buyingOptions:['FIXED_PRICE'],shippingOptions:[{shippingCostType:'FIXED',shippingCost:{currency:'USD',value:'25'}}],localizedAspects:[{name:'Brand',value:'Sony'},{name:'Model',value:'A7 IV'}],seller:{username:'camera-seller'},...overrides});
test('eBay normalization preserves shipping and excludes auctions, parts and unsupported money',()=>{
 const p=normalizeEbayItem(rawItem(),stamp);assert.equal(p.totalPrice,1224);assert.equal(p.sellerName,'camera-seller');
 assert.equal(normalizeEbayItem(rawItem({shippingOptions:[]}),stamp).totalPrice,null);
 assert.equal(normalizeEbayItem(rawItem({shippingOptions:[{shippingCostType:'CALCULATED',shippingCost:{currency:'USD',value:'10'}}]}),stamp).shippingPrice,null);
 assert.equal(normalizeEbayItem(rawItem({conditionId:'1500',condition:'Open box'}),stamp).condition,'open_box');
 assert.equal(normalizeEbayItem(rawItem({conditionId:'2010'}),stamp).condition,'refurbished');
 for(const change of [{conditionId:'7000'},{conditionId:'1000'},{buyingOptions:['AUCTION']},{price:{currency:'GBP',value:999}},{title:'Sony A7 IV for parts not working'},{itemWebUrl:'https://evil.example/itm/123'}])assert.equal(normalizeEbayItem(rawItem(change),stamp),null);
 assert.equal(ebayDestination('https://www.ebay.com.evil.example/itm/123'),null);
 assert.equal(normalizeEbayItem(rawItem({estimatedAvailabilities:[{estimatedAvailabilityStatus:'OUT_OF_STOCK'}]}),stamp).available,false);
 assert.equal(normalizeEbayItem(rawItem({title:'Sony A7 IV body camera cage'}),stamp),null);
});
test('official provider uses OAuth, exact-identifier-first bounded search, details and token reuse',async()=>{
 const calls=[];const fetcher=async(url,init)=>{calls.push({url:String(url),init});return Response.json(String(url).includes('oauth2')?{access_token:'test-server-token',expires_in:7200}:String(url).includes('item_summary')?{itemSummaries:[rawItem()]}:rawItem());};
 const p=new EbayProvider({clientId:'server-id',clientSecret:'server-secret'},fetcher,()=>now),product=camera().product;product.gtin='012345678901';
 assert.equal(searchTerms({product})[0].gtin,'012345678901');assert.ok(searchTerms({product}).length<=3);
 const listings=await p.search({product,postalCode:'90210'});assert.equal(listings[0].totalPrice,1224);await p.getListing('v1|123|0');
 assert.equal(calls.filter(c=>c.url.includes('oauth2')).length,1);assert.ok(calls.find(c=>c.url.includes('gtin=012345678901')));assert.ok(calls.find(c=>c.url.includes('item_summary')).init.headers['X-EBAY-C-ENDUSERCTX'].includes('90210'));
 assert.ok(calls.filter(c=>c.url.includes('item_summary')).length<=3);assert.ok(calls.every(c=>c.url.startsWith('https://api.ebay.com/')));
 await assert.rejects(()=>p.getListing('https://evil.example/x'));assert.equal(new EbayProvider({}).configured,false);
});
test('matching rejects conflicting variants and identities; incomplete variants are strong, previous is separate',()=>{
 const p=camera().product,prior=previousFor(p);
 assert.equal(rankCandidates(p,[live()],prior)[0].matchLevel,'EXACT PRODUCT');
 assert.equal(rankCandidates(p,[live({model:'A7 III'})],prior).length,0);
 assert.equal(rankCandidates(p,[live({attributes:{kit:'lens kit'}})],prior).length,0);
 assert.equal(rankCandidates(p,[live({attributes:{}})],prior)[0].matchLevel,'STRONG MATCH');
 assert.equal(rankCandidates(p,[live({previousModel:true,model:'A7 III'})],prior)[0].matchLevel,'SIMILAR ALTERNATIVE');
 assert.equal(rankCandidates({...p,gtin:'012345678901'},[live({gtin:'999999999999'})],prior).length,0);
 const phone=identifyQuery({query:'Apple iPhone 16 Pro',newPrice:899},stamp);
 assert.equal(rankCandidates(phone,[{...demoData('phone',stamp).listings[0]}],previousFor(phone))[0].matchLevel,'STRONG MATCH');
 assert.equal(rankCandidates(p,[live({model:'ILCE-7M4'})],prior)[0].matchLevel,'EXACT PRODUCT');
 assert.equal(rankCandidates({...p,gtin:'123456789012'},[live({gtin:'0123456789012'})],prior)[0].matchLevel,'EXACT PRODUCT');
});
test('economics uses cents and shipping; neither small gaps nor an older generation force a used recommendation',()=>{
 const p=camera().product,rank=(listing)=>rankCandidates(p,[listing],previousFor(p));
 const c=rank(live({price:1199.49,shippingPrice:25.22}));assert.equal(c[0].totalPrice,1224.71);assert.equal(economics(p,c).estimatedSavings,774.29);
 assert.equal(economics(p,c).verdict,'LOOPHOLE FOUND');
 assert.equal(economics(p,rank(live({shippingPrice:null}))).estimatedSavings,null);
 assert.equal(economics(p,rank(live({price:1989}))).verdict,'NEW ACTUALLY WINS THIS ONE');
 assert.equal(economics(p,rank(live({price:2099}))).verdict,'NEW ACTUALLY WINS THIS ONE');
 assert.equal(economics({...p,newPrice:null},c).verdict,'NO PRICE BASELINE');
 assert.equal(economics(p,rank(live({model:'A7 III',previousModel:true,price:500}))).bestValueOption,null);
});
test('metadata cache retains extracted identifiers and retailer pricing after confirmation and expires at 24 hours',async()=>{
 const db=store(),p={...camera().product,gtin:'012345678901',mpn:'ILCE7M4',sourceUrl:'https://www.sony.com/camera/test',priceBasis:'retailer'};let count=0;
 const options={...opts(),extractor:async()=>{count++;return p;}};const req={url:p.sourceUrl};
 await identify(req,db,options);await identify(req,db,options);assert.equal(count,1);
 const unchanged=await identify({url:p.sourceUrl,productName:p.productName,brand:p.brand,model:p.model,newPrice:p.newPrice},db,options);assert.equal(unchanged.priceBasis,'retailer');
 const confirmed=await identify({url:p.sourceUrl,productName:p.productName,brand:p.brand,model:p.model,newPrice:1800},db,options);assert.equal(confirmed.gtin,p.gtin);assert.equal(confirmed.newPrice,1800);
 await identify(req,db,{...options,clock:()=>now+86400001});assert.equal(count,2);
});
test('provider caching survives new baseline changes; different ZIPs and expired listing windows refresh',async()=>{
 let count=0;const db=store(),p=provider({async search(){count++;return [live()]}}),request={query:'Sony A7 IV body',newPrice:1999,includePrevious:false};
 const a=await search(request,db,opts(p)),b=await search({...request,newPrice:1799},db,opts(p));assert.equal(count,1);assert.equal(b.cacheHit,true);assert.equal(b.estimatedSavings,a.estimatedSavings-200);
 await search({...request,postalCode:'90210'},db,opts(p));assert.equal(count,2);
 await loadResult(a.id,db,{...opts(p),clock:()=>now+1800001});assert.equal(count,3);
});
test('missing or failed provider never replaces a real search with fictional inventory',async()=>{
 const disconnected=await search({query:'Sony A7 IV body'},store(),opts(provider({configured:false})));assert.equal(disconnected.mode,'unconfigured');assert.equal(disconnected.verdict,'LIVE SEARCH NOT CONNECTED');assert.equal(disconnected.candidates.length,0);
 const down=await search({query:'Sony A7 IV body'},store(),opts(provider({async search(){throw Error('private-key-must-not-leak')}})));assert.equal(down.verdict,'PROVIDER UNAVAILABLE');assert.equal(down.candidates.length,0);assert.ok(!JSON.stringify(down).includes('private-key'));
 const demo=await search({demoId:'camera'},store(),opts());assert.equal(demo.mode,'demo');assert.ok(demo.candidates.every(c=>c.demo&&!c.destinationUrl));assert.ok(renderResult(demo).includes('FICTIONAL PRICES'));assert.ok(shareText(demo,'https://example.com').includes('DEMO'));
 const small=await search({demoId:'phone'},store(),opts());assert.equal(small.verdict,'NEW ACTUALLY WINS THIS ONE');
});
test('ordinary product categories can resolve through a connected catalog provider',async()=>{
 const db=store(),p=provider({
  id:'amazon-data',
  async identify(product){return {...product,id:'resolved-ninja',productName:'Ninja NeverStick Waffle Maker',brand:'Ninja',category:'kitchen',sourceUrl:'https://www.amazon.com/dp/B000000001',retailerSku:'B000000001',identityBasis:'metadata'};},
  async search(){return [live({id:'amazon-new',provider:'Amazon Product Data',providerListingId:'B000000001:new',destinationUrl:'https://www.amazon.com/dp/B000000001',title:'Ninja NeverStick Waffle Maker',brand:'Ninja',model:'BW1001',category:'other',condition:'new',conditionText:'New',price:79.99,shippingPrice:0,totalPrice:79.99}),live({id:'amazon-used',provider:'Amazon Product Data',providerListingId:'B000000001:used',destinationUrl:'https://www.amazon.com/dp/B000000001',title:'Ninja NeverStick Waffle Maker',brand:'Ninja',model:'BW1001',category:'other',condition:'used',conditionText:'Used - Very Good',price:49.99,shippingPrice:0,totalPrice:49.99})];}
 });
 const r=await search({query:'ninja waffle maker'},db,opts(p));
 assert.equal(r.sourceProduct.productName,'Ninja NeverStick Waffle Maker');assert.equal(r.sourceProduct.newPrice,79.99);assert.equal(r.sourceProduct.priceBasis,'retailer');assert.equal(r.candidates.length,1);assert.equal(r.verdict,'NEW ACTUALLY WINS THIS ONE');assert.equal(r.providerId,'amazon-data');assert.match(renderResult(r),/SEARCH \/ AMAZON PRODUCT DATA/);
});
test('outbound rechecks live stock, price and match, removes vanished inventory and blocks demo buying',async()=>{
 const db=store(),p=provider(),options=opts(p),r=await search({query:'Sony A7 IV body',newPrice:1999,includePrevious:false},db,options);
 assert.equal(await verifyOutbound(r.id,r.candidates[0].id,db,options),'https://www.ebay.com/itm/123');
 p.getListing=async()=>null;await assert.rejects(()=>verifyOutbound(r.id,r.candidates[0].id,db,options),e=>e.status===410);
 const refreshed=await loadResult(r.id,db,options);assert.equal(refreshed.candidates.length,0);
 const demo=await search({demoId:'camera'},db,options);await assert.rejects(()=>verifyOutbound(demo.id,demo.candidates[0].id,db,options),e=>e.status===410);
});
test('alerts are private, deduplicated product requests with explicit pending delivery; share excludes ZIP',async()=>{
 const db=store(),options=opts(provider({configured:false}));const r=await search({query:'Sony A7 IV body',postalCode:'90210'},db,options);
 const reply=await saveAlert({email:'buyer@example.com',resultId:r.id,threshold:1000},db,options);assert.equal(reply.deliveryEnabled,false);
 await saveAlert({email:'buyer@example.com',resultId:r.id,threshold:900},db,options);const alerts=[...db.rows.entries()].filter(([k])=>k.startsWith('circular-email-alerts/'));assert.equal(alerts.length,1);assert.equal(alerts[0][1].status,'pending_delivery_setup');assert.equal(alerts[0][1].desiredPrice,900);
 await assert.rejects(()=>saveAlert({email:'bad',resultId:r.id},db,options));
 const h=createHandlers(()=>db,options);const publicSaved=await h.search(new Request('https://thisloophole.com/api/circular-search?id='+r.id));const body=await publicSaved.json();assert.equal(body.request.postalCode,undefined);assert.ok(!JSON.stringify(body).includes('buyer@example.com'));
});
test('API rejects cross-origin, malformed, oversized and unsafe requests; rendering escapes source text',async()=>{
 const db=store(),h=createHandlers(()=>db,opts());const req=(body,headers={})=>new Request('https://thisloophole.com/api/circular-search',{method:'POST',headers:{'Content-Type':'application/json',...headers},body});
 assert.equal((await h.search(req('{}',{origin:'https://evil.example'}))).status,403);
 assert.equal((await h.search(req('{'))).status,400);assert.equal((await h.search(req('x'.repeat(12001)))).status,413);
 assert.equal((await h.search(req('{"query":"Sony A7 IV body","newPrice":-1}'))).status,400);
 assert.equal((await h.identify(req('{"url":"https://127.0.0.1/private"}'))).status,422);
 const demo=await search({demoId:'camera'},db,opts());demo.sourceProduct.productName='<img src=x onerror=alert(1)>';demo.take='<script>bad</script>';const html=renderResult(demo);assert.ok(!html.includes('<script>bad'));assert.ok(html.includes('&lt;img'));assert.ok(!html.includes('href="/api/circular-outbound'));
});
test('a rechecked price survives shared-result reload and unavailable offers return a readable page',async()=>{
 const db=store(),p=provider(),options=opts(p),r=await search({query:'Sony A7 IV body',newPrice:1999,includePrevious:false},db,options);
 p.getListing=async()=>live({price:1299});await verifyOutbound(r.id,r.candidates[0].id,db,options);
 assert.equal((await loadResult(r.id,db,options)).candidates[0].price,1299);
 p.getListing=async()=>null;const h=createHandlers(()=>db,options),response=await h.outbound(new Request('https://thisloophole.com/api/circular-outbound?result='+r.id+'&listing='+encodeURIComponent(r.candidates[0].id)));
 assert.equal(response.status,410);assert.ok(response.headers.get('content-type').includes('text/html'));assert.ok((await response.text()).includes('Back to the comparison'));
});
test('portable Node adapter handles a parsed JSON body and preserves response status',async()=>{
 let received;const adapter=vercelAdapter(async(request)=>{received=await request.json();return Response.json({saved:true},{status:201});});
 const req={url:'/api/circular-alert',method:'POST',headers:{host:'example.com','content-type':'application/json'},body:{email:'buyer@example.com'}};
 let result;await adapter(req,{writeHead(status,headers){result={status,headers}},end(body){result.body=JSON.parse(body.toString())}});
 assert.equal(received.email,'buyer@example.com');assert.equal(result.status,201);assert.equal(result.body.saved,true);
});
test('the supplied West Elm lamp URL recovers a labeled name when metadata is blocked, never price or variant facts',async()=>{
 const url='https://www.westelm.com/products/merida-table-lamp-17-f1220/?catalogId=71&sku=7999646&pickuplocation=ST:%7Bstore_code%7D&cm_ven=PLA&gad_source=1&gclid=test';
 assert.equal(productUrl(url),'https://www.westelm.com/products/merida-table-lamp-17-f1220/?sku=7999646');
 const hint=productUrlHint(url,stamp);assert.equal(hint.productName,'Merida Table Lamp');assert.equal(hint.brand,'West Elm');assert.equal(hint.model,'Merida');assert.equal(hint.category,'lighting');assert.equal(hint.identityBasis,'url');assert.equal(hint.newPrice,null);assert.equal(hint.mpn,null);assert.equal(hint.gtin,null);assert.equal(hint.retailerSku,'7999646');assert.deepEqual(hint.attributes,{});
 assert.equal(parseProductPage('<title>West Elm: 403 - Restricted Access</title>',productUrl(url)),null);
 let tries=0;const db=store(),options={...opts(provider({configured:false})),extractor:async()=>{tries++;return null}};
 const identified=await identify({url},db,options);assert.match(identified.identificationNote,/Suggested name/);await identify({url},db,options);assert.equal(tries,1);await identify({url},db,{...options,clock:()=>now+300001});assert.equal(tries,2);
 const r=await search({url,productName:hint.productName,brand:hint.brand,model:hint.model,newPrice:129},db,options);assert.equal(r.sourceProduct.category,'lighting');assert.equal(r.mode,'unconfigured');assert.equal(r.candidates.length,0);assert.ok(r.warnings.some(w=>w.includes('Suggested name')));assert.ok(!renderResult(r).includes('Product metadata observed'));
 assert.equal(productUrlHint('https://www.westelm.com/products/unknown-product-x999/'),null);assert.throws(()=>productUrlHint('https://www.westelm.com.evil.example/products/merida-table-lamp-17-f1220/'));
});
test('lamps can match a named family without inventing exact variants; conflicting finish and pack are rejected',()=>{
 const p=identifyQuery({query:'West Elm Merida Table Lamp blue individual',newPrice:129},stamp);
 const candidate={...live(),title:'Westelm Merida table lamp blue individual',brand:'Westelm',model:'Merida',category:'lighting',attributes:{color:'blue',pack:'1'},price:80};
 assert.equal(rankCandidates(p,[candidate],null)[0].matchLevel,'STRONG MATCH');
 assert.equal(rankCandidates(p,[{...candidate,attributes:{color:'citron',pack:'1'}}],null).length,0);
 assert.equal(rankCandidates(p,[{...candidate,attributes:{color:'blue',pack:'2'}}],null).length,0);
 assert.equal(rankCandidates({...p,gtin:'123456789012'},[{...candidate,gtin:'123456789012'}],null)[0].matchLevel,'EXACT PRODUCT');
});
