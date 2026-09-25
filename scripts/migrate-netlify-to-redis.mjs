import { getStore as getSiteStore } from '@netlify/blobs';
import { getStore as getDealershipStore } from 'dealership-blobs';
import { redisStore } from '../lib/redis-store.mjs';

const siteID=process.env.NETLIFY_BLOBS_SITE_ID;
const token=process.env.NETLIFY_BLOBS_TOKEN;
if(!siteID||!token||!process.env.UPSTASH_REDIS_REST_URL||!process.env.UPSTASH_REDIS_REST_TOKEN){
  throw new Error('Configure Netlify Blobs and Upstash Redis server credentials before migration');
}

async function copy(name,factory){
  const source=factory({name,siteID,token,consistency:'strong'});
  const target=redisStore(name);
  let count=0;
  for await (const page of source.list({paginate:true})){
    for(const {key} of page.blobs){
      const value=await source.get(key,{type:'json'});
      if(value!=null){await target.set(key,value);count++;}
    }
  }
  console.log(`${name}: copied ${count} records`);
}

await copy('loophole-v1-production',getSiteStore);
await copy('loophole-dealership-production',getDealershipStore);
