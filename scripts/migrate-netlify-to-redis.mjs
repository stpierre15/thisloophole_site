import { getStore as getSiteStore } from '@netlify/blobs';
import { getStore as getDealershipStore } from 'dealership-blobs';
import { redisConfigured, redisStore } from '../lib/redis-store.mjs';

const siteID=process.env.NETLIFY_BLOBS_SITE_ID;
const token=process.env.NETLIFY_BLOBS_TOKEN;
if(!siteID||!token||!redisConfigured()){
  throw new Error('Configure Netlify Blobs and Upstash Redis server credentials before migration');
}

async function copy(name,factory){
  const source=factory({name,siteID,token,consistency:'strong'});
  const target=redisStore(name);
  let count=0;
  for await (const page of source.list({paginate:true})){
    for(const {key} of page.blobs){
      const value=await source.get(key,{type:'json'});
      if(value!=null){
        await target.set(key,value);
        if(JSON.stringify(await target.get(key))!==JSON.stringify(value))throw new Error(`Migration verification failed: ${name}/${key}`);
        count++;
      }
    }
  }
  console.log(`${name}: copied ${count} records`);
}

await copy('loophole-v1-production',getSiteStore);
await copy('loophole-dealership-production',getDealershipStore);
