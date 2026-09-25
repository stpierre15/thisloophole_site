import test from 'node:test';
import assert from 'node:assert/strict';
import { redisStore } from '../lib/redis-store.mjs';

test('portable storage keeps JSON records and one-time choices isolated by namespace', async () => {
  const oldUrl=process.env.UPSTASH_REDIS_REST_URL;
  const oldToken=process.env.UPSTASH_REDIS_REST_TOKEN;
  process.env.UPSTASH_REDIS_REST_URL='https://example.upstash.io';
  process.env.UPSTASH_REDIS_REST_TOKEN='test-token';
  const values=new Map();
  const requests=[];
  const fetcher=async (_url,init)=>{
    assert.equal(init.headers.Authorization,'Bearer test-token');
    const [verb,...args]=JSON.parse(init.body);requests.push([verb,...args]);
    let result=null;
    if(verb==='GET')result=values.get(args[0])??null;
    if(verb==='SET'){
      if(args[2]==='NX'&&values.has(args[0]))result=null;
      else {values.set(args[0],args[1]);result='OK';}
    }
    if(verb==='SCAN')result=['0',[...values.keys()].filter(key=>key.startsWith('dealership:sessions/'))];
    return {ok:true,json:async()=>({result})};
  };
  try{
    const store=redisStore('dealership',fetcher);
    assert.equal(await store.get('sessions/one'),null);
    assert.equal(await store.setNew('sessions/one',{choice:'A'}),true);
    assert.equal(await store.setNew('sessions/one',{choice:'B'}),false);
    assert.deepEqual(await store.get('sessions/one'),{choice:'A'});
    await store.set('sessions/two',{choice:'C'});
    assert.deepEqual(await store.list('sessions/'),[{choice:'A'},{choice:'C'}]);
    assert.ok(requests.some(([verb,key])=>verb==='SET'&&key==='dealership:sessions/one'));
    await assert.rejects(store.get('../escape'),/Invalid storage key/);
  }finally{
    if(oldUrl===undefined)delete process.env.UPSTASH_REDIS_REST_URL;else process.env.UPSTASH_REDIS_REST_URL=oldUrl;
    if(oldToken===undefined)delete process.env.UPSTASH_REDIS_REST_TOKEN;else process.env.UPSTASH_REDIS_REST_TOKEN=oldToken;
  }
});
