import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { dealershipStore } from './dealership-store.mjs';
import { blindCar, matchVehicles, validateAnswers } from './dealership-engine.mjs';

const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Pragma':'no-cache','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'}});
const method=(request,verb)=>request.method===verb;
const idPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
function opaqueId(value){return typeof value==='string'&&idPattern.test(value);}
async function body(request){
  if(!request.headers.get('content-type')?.includes('application/json'))throw Object.assign(new Error('Expected JSON'),{status:415});
  const raw=await request.text();if(raw.length>12000)throw Object.assign(new Error('Request too large'),{status:413});
  try{return JSON.parse(raw);}catch{throw Object.assign(new Error('Invalid JSON'),{status:400});}
}
async function sessionFor(store,id){return opaqueId(id)?store.get('sessions/'+id):null;}
function blindSession(session,lock){return {sessionId:session.id,createdAt:session.createdAt,locked:!!lock,candidates:session.candidates.map(c=>blindCar(c)),blindChoice:lock?.anonymousId??null,selectionCount:session.candidates.length};}
function revealedSession(session,lock,decision){return {...blindSession(session,lock),reveal:session.candidates.map(c=>({anonymousId:c.anonymousId,make:c.car.make,model:c.car.model,year:c.car.year,powertrain:c.car.powertrain,revealedImageUrl:'/api/dealership-image?session='+session.id+'&car='+c.anonymousId,sourceUrl:c.car.sourceUrl})),decision:decision?{postRevealChoice:decision.anonymousId,changed:decision.changed}:null};}
async function handle(request,context,op){
  const url=new URL(request.url);
  const store=dealershipStore(context);
  if(op==='start'){
    if(!method(request,'POST'))return json({error:'Method not allowed'},405);
    const answers=validateAnswers((await body(request)).answers);
    const matches=matchVehicles(answers);
    const id=randomUUID();
    const session={id,createdAt:new Date().toISOString(),answers,candidates:matches.map(row=>({...row,anonymousId:randomUUID()}))};
    if(!await store.setNew('sessions/'+id,session))return json({error:'Could not create session'},500);
    return json({sessionId:id,count:session.candidates.length,resultsUrl:'/dealership/results/'+id+'/'},201);
  }
  const payload=op==='lock'||op==='decision'?await body(request):null;
  const id=op==='session'||op==='image'?url.searchParams.get('session'):payload?.sessionId;
  const session=await sessionFor(store,id);
  if(!session)return json({error:'Session not found'},404);
  const lock=await store.get('locks/'+id);
  if(op==='session'){
    if(!method(request,'GET'))return json({error:'Method not allowed'},405);
    const decision=lock?await store.get('decisions/'+id):null;
    return json(lock?revealedSession(session,lock,decision):blindSession(session,null));
  }
  if(op==='image'){
    if(!method(request,'GET'))return json({error:'Method not allowed'},405);
    if(!lock)return json({error:'Choose before reveal'},403);
    const candidate=session.candidates.find(c=>c.anonymousId===url.searchParams.get('car'));
    if(!candidate)return json({error:'Unknown finalist'},404);
    const asset=candidate.car.revealedAsset;
    if(!/^[a-z0-9-]+\.jpg$/.test(asset))return json({error:'Image unavailable'},404);
    const bytes=await readFile(resolve(process.cwd(),'server-assets/dealership/revealed',asset));
    return new Response(bytes,{headers:{'Content-Type':'image/jpeg','Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'}});
  }
  if(op==='lock'){
    if(!method(request,'POST'))return json({error:'Method not allowed'},405);
    const value=payload;
    if(!session.candidates.some(c=>c.anonymousId===value.anonymousId))return json({error:'Choose a finalist'},400);
    if(lock)return json({error:'Choice already locked'},409);
    const locked={anonymousId:value.anonymousId,at:new Date().toISOString()};
    if(!await store.setNew('locks/'+id,locked))return json({error:'Choice already locked'},409);
    return json({revealUrl:'/dealership/reveal/'+id+'/'},201);
  }
  if(op==='decision'){
    if(!method(request,'POST'))return json({error:'Method not allowed'},405);
    if(!lock)return json({error:'Choose before reveal'},403);
    const value=payload;
    const choice=value.anonymousId;
    if(choice!==null&&!session.candidates.some(c=>c.anonymousId===choice))return json({error:'Invalid final choice'},400);
    if(choice===null&&session.candidates.length>1)return json({error:'Choose a finalist'},400);
    const decision={anonymousId:choice,changed:choice!==lock.anonymousId,at:new Date().toISOString()};
    if(!await store.setNew('decisions/'+id,decision))return json({error:'Decision already recorded'},409);
    return json({changed:decision.changed,postRevealChoice:choice},201);
  }
  return json({error:'Unknown endpoint'},404);
}
export const dealershipHandlers=Object.fromEntries(['start','session','lock','decision','image'].map(op=>[op,async(request,context={})=>{
  try{return await handle(request,context,op);}catch(error){
    if(error.status)return json({error:error.message},error.status);
    if(error.message?.startsWith('Invalid')||error.message==='Pick three priorities')return json({error:error.message},400);
    console.error('Dealership request failed',error);return json({error:'Request unavailable'},500);
  }
}]));
