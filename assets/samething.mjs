import { priceGapEntries } from './price-gaps.mjs';
import { rankPriceGaps } from './price-gap-engine.mjs';
import { renderPriceBoard, money } from './price-gap-view.mjs';
const board=document.querySelector('#price-board');
if(!board.children.length)board.innerHTML=renderPriceBoard(priceGapEntries);
const event=(name,metadata={})=>fetch('/api/studio-event',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,metadata})}).catch(()=>{});
event('same_thing_page_view',{mode:'PRICE_BOARD'});
const ranked=rankPriceGaps(priceGapEntries);
for(const item of board.querySelectorAll('details'))item.addEventListener('toggle',()=>{if(item.open)event('curated_comparison_viewed',{product:item.id,mode:'PRICE_BOARD'});});
for(const link of board.querySelectorAll('[data-outbound]'))link.addEventListener('click',()=>event('outbound_alternative_click',{product:link.dataset.outbound}));
for(const button of board.querySelectorAll('[data-share]'))button.addEventListener('click',async()=>{
 const e=ranked.find(x=>x.id===button.dataset.share),status=button.closest('details').querySelector('.share-status');if(!e)return;
 const url=location.origin+'/samething/#'+e.id,text=e.name+': '+money(e.highest.price)+' at '+e.highest.store+' vs '+money(e.lowest.price)+' at '+e.lowest.store+'. Same model '+e.model+'. Prices observed September 16, 2026. '+url;
 event('share_clicked',{product:e.id});
 try{if(navigator.share){await navigator.share({title:'The Same Thing — loophole',text,url});status.textContent='Shared.';}else{await navigator.clipboard.writeText(text);status.textContent='Copied. Send the better link.';}}
 catch(err){status.textContent=err.name==='AbortError'?'Sharing cancelled.':'Copy this link: '+url;}
});
function openLinkedEntry(){const id=location.hash.slice(1),item=document.getElementById(id);if(item?.matches('.gap-item')){item.open=true;item.scrollIntoView({behavior:'auto'});}}
openLinkedEntry();window.addEventListener('hashchange',openLinkedEntry);
