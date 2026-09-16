import { identify, search, loadResult, publicResult, saveAlert, verifyOutbound, InputError, cleanRequest } from './service.mjs';
import type { Store } from './schema.mjs';
import type { ServiceOptions } from './service.mjs';
import { esc } from './view.mjs';
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
async function bodyOf(request:Request) {
 if(request.method!=='POST')throw new InputError('Use POST.',405);
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)throw new InputError('Cross-origin requests are not accepted.',403);
 if(!request.headers.get('content-type')?.startsWith('application/json'))throw new InputError('Send JSON.',415);
 const reader=request.body?.getReader();let size=0;const chunks:Uint8Array[]=[];
 if(reader)while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>12000){await reader.cancel();throw new InputError('Request too large.',413);}chunks.push(value);}
 let body:any;try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new InputError('Invalid JSON.');}
 if(!body||typeof body!=='object'||Array.isArray(body))throw new InputError('Invalid request.');return body;
}
export function createHandlers(storeFor:(context:any)=>Store,options:ServiceOptions) {
 const endpoint=(fn:(r:Request,db:Store)=>Promise<Response>)=>async(r:Request,context:any={})=>{
  try{return await fn(r,storeFor(context));}catch(e){if(e instanceof InputError)return json({error:e.message},e.status);console.error('Circular endpoint failed:',e instanceof Error?e.name:'unknown');return json({error:'THE SUPPLY CHAIN IS MISBEHAVING. Please retry shortly.'},503);}
 };
 return {
  identify:endpoint(async(r,db)=>json({product:await identify(cleanRequest(await bodyOf(r)),db,options)})),
  search:endpoint(async(r,db)=>{
   if(r.method==='GET'){const id=new URL(r.url).searchParams.get('id');if(!id)throw new InputError('A saved result ID is required.');return json(publicResult(await loadResult(id,db,options)));}
   return json(publicResult(await search(await bodyOf(r),db,options)),201);
  }),
  alert:endpoint(async(r,db)=>json(await saveAlert(await bodyOf(r),db,options),201)),
  outbound:async(r:Request,context:any={})=>{
   const u=new URL(r.url),id=u.searchParams.get('result')||'';
   try{
    if(r.method!=='GET')throw new InputError('Use GET.',405);
    const destination=await verifyOutbound(id,u.searchParams.get('listing')||'',storeFor(context),options);
    return new Response(null,{status:302,headers:{Location:destination,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
   }catch(e){
    const message=e instanceof InputError?e.message:'We could not recheck this listing. Please retry shortly.';
    return new Response('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Listing check — loophole</title><link rel="stylesheet" href="/assets/studio.css"><header class="site-nav"><a class="wordmark" href="/">loophole</a></header><main class="site-main board-intro"><p class="eyebrow">THE SAME THING / LISTING CHECK</p><h1>This one changed.</h1><p>'+esc(message)+'</p><a class="text-link" href="/samething/'+(/^[0-9a-f-]{36}$/i.test(id)?'?result='+encodeURIComponent(id):'')+'">Back to the comparison ↗</a></main></html>',{status:e instanceof InputError?e.status:503,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
   }
  }
 };
}
