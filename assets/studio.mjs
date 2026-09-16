import { experiments } from './experiments.mjs';
const list=document.querySelector('#experiment-list');
if(list){
  list.innerHTML=experiments.map(x=>`<article class="experiment ${x.status==='LIVE'?'is-live':''}"><div class="experiment-number">${x.number}</div><div><h3>${x.title}</h3><p>${x.tagline}</p></div><div class="experiment-status"><span>${x.status}</span>${x.status==='LIVE'?`<a href="/${x.slug}/">ENTER EXPERIMENT <b>↗</b></a>`:'<span>NOT YET.</span>'}</div></article>`).join('');
  document.querySelector('#live-count').textContent=String(experiments.filter(x=>x.status==='LIVE').length).padStart(2,'0');
}
for(const form of document.querySelectorAll('[data-capture]'))form.addEventListener('submit',async e=>{
  e.preventDefault();const status=form.querySelector('.form-status');const button=form.querySelector('button');
  if(!form.reportValidity())return;button.disabled=true;status.textContent='TUNING THE FREQUENCY…';
  try{const body=Object.fromEntries(new FormData(form));body.requested_experiment=form.dataset.capture;const r=await fetch('/api/email-capture',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await r.json();if(!r.ok)throw new Error(data.error||'Could not save that.');status.textContent='YOU’RE ON THE LIST. EXPECT IRREGULARITY.';form.reset();}
  catch(err){status.textContent=err.message+' TRY AGAIN.';}finally{button.disabled=false;}
});
