import { storage } from './storage.mjs';
import { DemoInventoryProvider } from '../.generated/auto/demo.mjs';
import { EbayMotorsProvider,NhtsaVinProvider } from '../.generated/auto/providers.mjs';
import { createAutoHandlers } from '../.generated/auto/handlers.mjs';
const ebay=new EbayMotorsProvider({clientId:process.env.EBAY_CLIENT_ID,clientSecret:process.env.EBAY_CLIENT_SECRET,environment:process.env.EBAY_ENVIRONMENT||'production'});
export const autoProvider=ebay.configured?ebay:new DemoInventoryProvider();
export const autoHandlers=createAutoHandlers(storage,autoProvider,new NhtsaVinProvider());
