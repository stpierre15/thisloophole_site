import { renderResult, shareText } from './view.mjs';
import type { ComparisonResult, ProductIdentity, SearchRequest } from './schema.mjs';
const form=document.querySelector<HTMLFormElement>('#circular-form')!;
const query=document.querySelector<HTMLInputElement>('#product-query')!;
const output=document.querySelector<HTMLElement>('#circular-result')!;
const status=document.querySelector<HTMLElement>('#search-status')!;
const confirm=document.querySelector<HTMLDetailsElement>('#product-confirm')!;
const alertForm=document.querySelector<HTMLFormElement>('#price-alert')!;
let result:ComparisonResult|null=null,urlToConfirm:string|undefined,busy=false;
const el=(id:string)=>document.getElementById(id) as HTMLInputElement;
const event=(name:string,metadata:Record<string,string>={})=>fetch('/api/studio-event',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,metadata})}).catch(()=>{});
async function api(path:string,body?:unknown){const r=await fetch(path,{signal:AbortSignal.timeout(65000),...(body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})});let data;try{data=await r.json()}catch{throw Error('The experiment did not respond. Please retry.')}if(!r.ok)throw Error(data.error||'Please retry shortly.');return data;}
function setBusy(value:boolean,text=''){busy=value;for(const b of document.querySelectorAll<HTMLButtonElement>('[data-search-action]'))b.disabled=value;form.setAttribute('aria-busy',String(value));status.textContent=text;}
function price(){return el('new-price').value.trim()?Number(el('new-price').value):null;}
function render(r:ComparisonResult){result=r;output.innerHTML=renderResult(r);output.hidden=false;alertForm.hidden=r.mode==='demo'||r.mode==='sandbox';el('alert-result-id').value=r.id;history.replaceState(null,'','/samething/?result='+encodeURIComponent(r.id));document.getElementById('result-title')?.focus({preventScroll:true});output.scrollIntoView({behavior:'auto',block:'start'});}
function fill(p:ProductIdentity){el('confirmed-name').value=p.productName;el('confirmed-brand').value=p.brand||'';el('confirmed-model').value=p.model||'';if(p.newPrice!==null)el('new-price').value=String(p.newPrice);el('spec-storage').value=p.attributes.storage||'';el('spec-lock').value=p.attributes.lock||'';el('spec-color').value=p.attributes.color||'';el('spec-pack').value=p.attributes.pack||'';(document.getElementById('spec-kit') as HTMLSelectElement).value=p.attributes.kit||'';}
async function run(input:SearchRequest){if(busy)return;setBusy(true,'Checking the connected marketplace…');try{render(await api('/api/circular-search',input));status.textContent='Comparison ready.';}catch(e){status.textContent=e instanceof Error?e.message:'Please retry.';}finally{setBusy(false,status.textContent||'');}}
form.addEventListener('submit',async e=>{
 e.preventDefault();if(busy||!form.reportValidity())return;
 const value=query.value.trim();const isUrl=/^https?:\/\//i.test(value);
 if(isUrl&&urlToConfirm!==value){
  urlToConfirm=value;confirm.open=true;el('confirmed-name').value='';el('confirmed-brand').value='';el('confirmed-model').value='';el('new-price').value='';
  event('url_submitted');setBusy(true,'Reading the product listing…');
  let autoSearch=false;
  try{
   const data=await api('/api/circular-identify',{url:value}),product=data.product as ProductIdentity;fill(product);
   if(product.identityBasis==='metadata'){
    autoSearch=true;setBusy(false,'Product identified. Checking offers…');event('search_submitted',{method:'url'});
    await run({url:value,productName:product.productName,brand:product.brand||undefined,model:product.model||undefined,newPrice:product.newPrice,attributes:product.attributes,postalCode:el('postal-code').value||undefined,includePrevious:el('include-previous').checked});
   }else status.textContent=product.identificationNote||'Check these details and the new price, then find the loophole.';
  }catch(err){status.textContent=err instanceof Error?err.message:'Enter the product details below.';}
  finally{if(busy)setBusy(false,status.textContent||'');if(!autoSearch)el('confirmed-name').focus();}return;
 }
 if(isUrl&&!el('confirmed-name').value.trim()){status.textContent='Enter the product name below so we can search.';el('confirmed-name').focus();return;}
 const attributes:Record<string,string>={};if(el('spec-storage').value.trim())attributes.storage=el('spec-storage').value.trim();if(el('spec-lock').value.trim())attributes.lock=el('spec-lock').value.trim();const kit=(document.getElementById('spec-kit') as HTMLSelectElement).value;if(kit)attributes.kit=kit;
 if(el('spec-color').value.trim())attributes.color=el('spec-color').value.trim();if(el('spec-pack').value.trim())attributes.pack=el('spec-pack').value.trim();
 event('search_submitted',{method:isUrl?'url':'query'});
 await run({query:isUrl?undefined:value,url:isUrl?value:undefined,productName:el('confirmed-name').value.trim()||undefined,brand:el('confirmed-brand').value,model:el('confirmed-model').value,newPrice:price(),attributes,postalCode:el('postal-code').value||undefined,includePrevious:el('include-previous').checked});
});
query.addEventListener('input',()=>{urlToConfirm=undefined;el('confirmed-name').value='';el('confirmed-brand').value='';el('confirmed-model').value='';el('spec-storage').value='';el('spec-lock').value='';el('spec-color').value='';el('spec-pack').value='';(document.getElementById('spec-kit') as HTMLSelectElement).value='';});
document.addEventListener('click',async e=>{
 const button=(e.target as HTMLElement).closest<HTMLButtonElement>('button');if(!button)return;
 if(button.dataset.example){query.value=button.dataset.example;query.dispatchEvent(new Event('input'));el('new-price').value='';form.requestSubmit();}
 if(button.dataset.demo)await run({demoId:button.dataset.demo});
 if(button.dataset.resultShare&&result){
  const feedback=document.getElementById('result-share-status')!,url=location.origin+'/samething/?result='+encodeURIComponent(result.id);event('share_clicked',{mode:result.mode});
  try{if(button.dataset.resultShare==='share'&&typeof navigator.share==='function')await navigator.share({title:'The Same Thing — loophole',text:shareText(result,url),url});else await navigator.clipboard.writeText(button.dataset.resultShare==='link'?url:shareText(result,url));feedback.textContent=button.dataset.resultShare==='share'&&typeof navigator.share==='function'?'Shared.':'Copied.';}catch(err){feedback.textContent=err instanceof Error&&err.name==='AbortError'?'Sharing cancelled.':'Copy this link: '+url;}
 }
});
alertForm.addEventListener('submit',async e=>{e.preventDefault();if(!alertForm.reportValidity())return;const feedback=document.getElementById('alert-status')!,button=alertForm.querySelector<HTMLButtonElement>('button')!;button.disabled=true;feedback.textContent='Saving your request…';try{const response=await api('/api/circular-alert',{email:el('alert-email').value,resultId:el('alert-result-id').value,threshold:el('alert-threshold').value?Number(el('alert-threshold').value):null,company:el('alert-company').value});feedback.textContent=response.message;el('alert-email').value='';}catch(err){feedback.textContent=err instanceof Error?err.message:'Please retry.';}finally{button.disabled=false;}});
event('samething_page_view',{mode:'CIRCULAR_SEARCH'});
const params=new URL(location.href).searchParams;
const saved=params.get('result');
const initialQuery=params.get('q');
if(saved){setBusy(true,'Rechecking the saved comparison…');api('/api/circular-search?id='+encodeURIComponent(saved)).then(render).catch(err=>status.textContent=err.message).finally(()=>setBusy(false,status.textContent==='Rechecking the saved comparison…'?'Comparison ready.':status.textContent||''));}
else if(initialQuery){query.value=initialQuery.slice(0,1500);form.requestSubmit();}
