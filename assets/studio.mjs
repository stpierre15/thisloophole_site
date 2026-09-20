import { priceGapEntries } from './price-gaps.mjs';
import { renderMonthlyPick } from './price-gap-view.mjs';
const pick=document.querySelector('#monthly-pick');
if(pick&&!pick.children.length)pick.innerHTML=renderMonthlyPick(priceGapEntries);

const homeQuery=document.querySelector('#home-query');
for(const example of document.querySelectorAll('[data-home-example]'))example.addEventListener('click',()=>{
 if(!(homeQuery instanceof HTMLInputElement))return;
 homeQuery.value=example.dataset.homeExample||'';
 homeQuery.focus();
});

const fridayForm=document.querySelector('#friday-form');
if(fridayForm instanceof HTMLFormElement)fridayForm.addEventListener('submit',async event=>{
 event.preventDefault();
 if(!fridayForm.reportValidity())return;
 const button=fridayForm.querySelector('button');
 const email=fridayForm.querySelector('[name="email"]');
 const company=fridayForm.querySelector('[name="company"]');
 const status=document.querySelector('#friday-status');
 if(!(button instanceof HTMLButtonElement)||!(email instanceof HTMLInputElement)||!(company instanceof HTMLInputElement)||!status)return;
 button.disabled=true;
 status.textContent='Saving your email…';
 try{
  const response=await fetch('/api/email-capture',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:email.value,company:company.value,requested_experiment:'monthly'})});
  if(!response.ok)throw new Error('Please try again.');
  email.value='';
  status.textContent='Saved. We’ll send the first Friday Loophole when it’s ready.';
 }catch{
  status.textContent='We could not save that email. Please try again.';
 }finally{
  button.disabled=false;
 }
});
