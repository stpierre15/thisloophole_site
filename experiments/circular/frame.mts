interface Experiment { number:string; title:string; href:string; status:string; tagline:string; }
const experiments:Experiment[]=[
 {number:'001',title:'THE SAME THING',href:'/samething/',status:'Beta',tagline:'Why are you buying it new?'},
 {number:'002',title:'TBD',href:'/experiments/#002',status:'Coming soon',tagline:''},
 {number:'003',title:'TBD',href:'/experiments/#003',status:'Coming soon',tagline:''}
];
export interface FrameFinding { id:string; name:string; observedAt:string; savings:number; highStore:string; lowStore:string; }
const esc=(v:unknown)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function renderExperimentList(){return experiments.map(e=>`<li id="${e.number}"><a href="${e.href}">${e.number} — ${e.title}</a><p class="small">${e.status==='Beta'?'Status: Beta':e.status}${e.tagline?`<br>${e.tagline}`:''}</p></li>`).join('');}
export function renderFindingList(findings:FrameFinding[]){return findings.map(f=>{
 const stamp=new Date(f.observedAt).toISOString().slice(0,10).split('-');
 const date=`${stamp[1]}.${stamp[2]}.${stamp[0].slice(2)}`;
 const dollars=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(f.savings);
 return `<li><time datetime="${esc(f.observedAt)}">${date}</time> — <a href="/samething/#${esc(f.id)}">${esc(f.name)}: ${dollars} apart between ${esc(f.highStore)} and ${esc(f.lowStore)}.</a></li>`;
 }).join('');}
