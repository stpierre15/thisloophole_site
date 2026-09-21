import { storage } from './storage.mjs';
import { EbayProvider } from '../.generated/circular/ebay.mjs';
import { createHandlers } from '../.generated/circular/handlers.mjs';
import { extractProduct, productUrl, identifyQuery } from '../.generated/circular/identity.mjs';
import { amazonData } from './amazon-data.mjs';
import { AmazonCatalogProvider } from './amazon-circular.mjs';
const ebayProvider=new EbayProvider({clientId:process.env.EBAY_CLIENT_ID,clientSecret:process.env.EBAY_CLIENT_SECRET,environment:process.env.EBAY_ENVIRONMENT||'production'});
const amazonProvider=new AmazonCatalogProvider();
const provider=ebayProvider.configured?ebayProvider:amazonProvider;
if(!provider.configured)console.info('Loophole: live product data is not configured. Only labeled examples and the sourced store board are available.');
async function extractor(value){
 const url=productUrl(value);
 if(new URL(url).hostname.replace(/^www\./,'')==='amazon.com'&&process.env.RAINFOREST_API_KEY){
  const result=await amazonData(url);
  if(result?.product_name){const p=identifyQuery({query:result.product_name,model:result.model||undefined});p.sourceUrl=url;
   if(result.condition==='new'&&result.availability==='InStock'&&result.price){p.newPrice=result.price;p.priceBasis='retailer';}
   return p;
  }
 }
 return extractProduct(url);
}
export const circularHandlers=createHandlers(storage,{provider,extractor,listingTtl:Number(process.env.CIRCULAR_LISTING_CACHE_MINUTES||30)*60000});
