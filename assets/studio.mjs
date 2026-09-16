import { priceGapEntries } from './price-gaps.mjs';
import { renderMonthlyPick } from './price-gap-view.mjs';
const pick=document.querySelector('#monthly-pick');
if(pick&&!pick.children.length)pick.innerHTML=renderMonthlyPick(priceGapEntries);
