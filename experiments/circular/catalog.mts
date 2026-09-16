import type { ModelRelationship, ProductIdentity, CandidateListing } from './schema.mjs';
export const modelRelationships: ModelRelationship[] = [
 {currentModel:'A7 IV',previousModel:'A7 III',brand:'Sony',category:'camera',notes:'An older camera generation. Sensor, autofocus and video capabilities differ; compare the manufacturer specifications. Body-only and lens kits are different purchases.',sourceUrl:'https://www.sony.com/electronics/interchangeable-lens-cameras/ilce-7m4-body-kit'},
 {currentModel:'iPhone 16 Pro',previousModel:'iPhone 15 Pro',brand:'Apple',category:'phone',notes:'An older phone generation. Camera, processor and controls differ. Match storage, carrier lock and device condition before comparing.',sourceUrl:'https://www.apple.com/iphone/compare/'}
];
export const curatedExamples = [
 {displayName:'iPhone 17 Pro',category:'phone',exampleSearchQuery:'Apple iPhone 17 Pro',note:'Confirm storage and carrier lock.'},
 {displayName:'Sony A7 IV',category:'camera',exampleSearchQuery:'Sony A7 IV body',note:'Body-only, not a lens kit.'},
 {displayName:'Herman Miller Aeron',category:'chair',exampleSearchQuery:'Herman Miller Aeron',note:'Confirm size and Classic versus Remastered.'},
 {displayName:'Makita drill',category:'tool',exampleSearchQuery:'Makita drill',note:'Add the model; battery kits and bare tools differ.'},
 {displayName:'Garmin watch',category:'watch',exampleSearchQuery:'Garmin watch',note:'Add the exact series and size.'}
];
export function previousFor(p: ProductIdentity) {
 const aliases:Record<string,string>={'ILCE-7M4':'A7 IV','ILCE-7M3':'A7 III'};
 return modelRelationships.find(r=>p.brand?.toLowerCase()===r.brand.toLowerCase() && (aliases[p.model||'']||p.model)?.toLowerCase()===r.currentModel.toLowerCase()) ?? null;
}
// Deliberately fictional teaching examples. No seller, stock claim or purchase link.
export function demoData(id:string,now:string): {product:ProductIdentity; listings:CandidateListing[]} | null {
 const demo = id==='camera' ? {name:'Sony A7 IV body',brand:'Sony',model:'A7 IV',category:'camera',newPrice:1999,price:1199,refurb:1399,previous:'A7 III',oldPrice:899} : id==='phone' ? {name:'Apple iPhone 16 Pro 128GB unlocked',brand:'Apple',model:'iPhone 16 Pro',category:'phone',newPrice:899,price:849,refurb:879,previous:'iPhone 15 Pro',oldPrice:799} : null;
 if(!demo)return null;
 const attributes:Record<string,string> = id==='phone'?{storage:'128GB',lock:'unlocked'}:{kit:'body only'};
 const product:ProductIdentity = {id:'demo-'+id,productName:demo.name,brand:demo.brand,model:demo.model,mpn:null,gtin:null,category:demo.category,newPrice:demo.newPrice,currency:'USD',imageUrl:null,sourceUrl:null,attributes,priceBasis:'demo',createdAt:now,updatedAt:now};
 const listing=(suffix:string,price:number,condition:'used'|'refurbished',previousModel=false):CandidateListing=>({id:'demo-'+id+'-'+suffix,provider:'DEMO',providerListingId:suffix,title:demo.brand+' '+(previousModel?demo.previous:demo.model)+(id==='camera'?' body only':' 128GB unlocked'),price,shippingPrice:0,totalPrice:price,currency:'USD',condition,conditionText:condition==='used'?'Used — illustrative':'Refurbished — illustrative',sellerName:null,imageUrl:null,destinationUrl:null,brand:demo.brand,model:previousModel?demo.previous:demo.model,mpn:null,gtin:null,attributes,category:demo.category,fetchedAt:now,available:true,demo:true,conditionDescription:'Illustrative condition only; this is not an actual listing.',returns:null,warranty:null,previousModel});
 return {product,listings:[listing('used',demo.price,'used'),listing('refurb',demo.refurb,'refurbished'),listing('previous',demo.oldPrice,'used',true)]};
}
