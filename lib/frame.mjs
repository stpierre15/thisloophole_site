import { priceGapEntries } from '../assets/price-gaps.mjs';
import { rankPriceGaps } from '../assets/price-gap-engine.mjs';
import { renderExperimentList, renderFindingList } from '../.generated/circular/frame.mjs';
export function renderFrame(html){
 const findings=rankPriceGaps(priceGapEntries).map(e=>({id:e.id,name:e.name,observedAt:[e.highest.observedAt,e.lowest.observedAt].sort()[0],savings:e.savings,highStore:e.highest.store,lowStore:e.lowest.store})).sort((a,b)=>b.observedAt.localeCompare(a.observedAt)||a.id.localeCompare(b.id)).slice(0,3);
 return html.replace('<!-- FRAME:EXPERIMENTS -->',renderExperimentList()).replace('<!-- FRAME:FINDINGS -->',renderFindingList(findings));
}
