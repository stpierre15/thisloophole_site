const app=document.querySelector('#app');
const html=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>n==null?'Not published':'$'+Number(n).toLocaleString('en-US');
const moneyPerMile=n=>'$'+Number(n).toFixed(2);
const fmt=(v,suffix='')=>v==null?'—':html(v)+suffix;
const questions=[
 {key:'budget',title:"What's the most you'd spend?",options:[['under25','Under $25k'],['25-35','$25k–$35k'],['35-45','$35k–$45k'],['45-60','$45k–$60k'],['60-80','$60k–$80k'],['80-120','$80k–$120k'],['120+','$120k+'],['any',"Doesn't matter"]]},
 {key:'seats',title:'How many seats do you need?',options:[['2','2'],['4','4'],['5','5'],['6','6'],['7','7'],['8','8+']]},
 {key:'kids',title:'Do you regularly carry kids?',options:[['no','No'],['one','One child'],['two','Two children'],['three','Three+']]},
 {key:'dogs',title:'Any dogs?',options:[['no','No'],['small','One small dog'],['large','One large dog'],['multiple','Two or more dogs']]},
 {key:'cargo',title:'How much stuff do you usually carry?',options:[['little','Almost nothing'],['normal','Normal groceries / luggage'],['a-lot','A lot'],['bulky','Bulky equipment']]},
 {key:'powertrain',title:'What powers it?',multi:true,options:[['Gas','Gas'],['Hybrid','Hybrid'],['Plug-in hybrid','Plug-in hybrid'],['Electric','Electric'],['any',"Doesn't matter"]]},
 {key:'daily',title:'How far do you usually drive?',options:[['under20','Under 20 miles'],['20-50','20–50 miles'],['50-100','50–100 miles'],['100+','100+ miles']]},
 {key:'trips',title:'How often do you take long road trips?',options:[['never','Almost never'],['few','A few times a year'],['monthly','Monthly'],['frequent','Frequently']]},
 {key:'camping',title:'Do you go camping?',options:[['never','Never'],['occasional','Occasionally'],['often','Often']]},
 {key:'offroad',title:'Do you leave the pavement?',options:[['never','Never'],['dirt','Dirt roads / campsites'],['rough','Regular rough roads'],['real','Real off-roading']]},
 {key:'weather',title:'Do you regularly drive in snow or bad weather?',options:[['yes','Yes'],['sometimes','Sometimes'],['no','No']]},
 {key:'towing',title:'Do you tow?',options:[['never','Never'],['under3500','Under 3,500 lbs'],['3500-5000','3,500–5,000 lbs'],['5000-8000','5,000–8,000 lbs'],['8000+','8,000+ lbs']]},
 {key:'size',title:'How big are you comfortable going?',options:[['small','Small'],['medium','Medium'],['large','Large'],['any','Anything']]},
 {key:'priorities',title:'Pick the THREE things you care about most.',multi:true,options:['Low price','Fuel economy','Reliability','Resale value','Cargo room','Passenger room','Performance','Towing','Easy parking','Road trips','Off-road ability','Technology','Luxury','Environmental impact'].map(x=>[x,x])}
];
const allPowertrains=['Gas','Hybrid','Plug-in hybrid','Electric'];
let answers={};try{answers=JSON.parse(sessionStorage.getItem('loophole-dealership-answers')||'{}')||{};}catch{answers={};}
let step=0,selected=null,showDimensions=false,showCosts=false,current=null,visibleCount=36,listSort='default';
const columnFilterDefaults={bodyStyle:'any',powertrain:'any',priceMax:'',costMax:'',costBasis:'any',mileMax:'',runningMax:'',seatsMin:'',cargoMin:'',towingMin:'',drivetrain:'any',efficiencyUnit:'mpg',efficiencyMin:''};
let columnFilters={...columnFilterDefaults};
const save=()=>sessionStorage.setItem('loophole-dealership-answers',JSON.stringify(answers));
const filterDefaults={budget:'any',seats:'any',cargo:'any',drivetrain:'any',powertrain:'any',towing:'never',size:'any',bodyStyle:'any',sort:'price-asc'};
let filters={...filterDefaults};try{filters={...filters,...JSON.parse(sessionStorage.getItem('loophole-dealership-filters')||'{}')};}catch{filters={...filterDefaults};}
const filterOptions={
  budget:[['any','No budget cap'],['under25','Up to $25k'],['25-35','Up to $35k'],['35-45','Up to $45k'],['45-60','Up to $60k'],['60-80','Up to $80k'],['80-120','Up to $120k']],
  seats:[['any','Any'],['2','2+ seats'],['4','4+ seats'],['5','5+ seats'],['6','6+ seats'],['7','7+ seats'],['8','8+ seats']],
  cargo:[['any','Any'],['small','Small · 15+ cu ft'],['medium','Medium · 25+ cu ft'],['huge','Huge · 35+ cu ft']],
  drivetrain:[['any','Any'],['fwd','Front-wheel drive'],['rwd','Rear-wheel drive'],['awd-standard','AWD / 4WD listed'],['awd-capable','AWD / 4WD available']],
  powertrain:[['any','Any'],['Gas','Gas'],['Hybrid','Hybrid'],['Plug-in hybrid','Plug-in hybrid'],['Electric','Electric'],['Diesel','Diesel'],['Flex fuel','Flex fuel'],['Hydrogen fuel cell','Hydrogen fuel cell'],['Plug-in fuel cell','Plug-in fuel cell']],
  towing:[['never','Any'],['under3500','3,500+ lb'],['3500-5000','5,000+ lb'],['5000-8000','8,000+ lb']],
  size:[['any','Any'],['small','Small · up to 185 in'],['medium','Medium · up to 195 in'],['large','Large · up to 230 in']],
  bodyStyle:[['any','Any'],['SUV','SUV'],['Sedan','Sedan'],['Pickup','Pickup'],['Truck','Truck'],['Minivan','Minivan'],['Van','Van'],['Wagon','Wagon'],['Hatchback','Hatchback'],['Coupe','Coupe']],
  sort:[['price-asc','Price · low to high'],['price-desc','Price · high to low'],['cargo-desc','Cargo · most first']],
};
let previewSequence=0,previewTimer=null;
function filterSelect(key,label,detail=''){
 const options=filterOptions[key];const selectedValue=options.some(([value])=>value===filters[key])?filters[key]:filterDefaults[key];
 return `<label class="filter-field"><span class="filter-label">${html(label)}</span><select name="${html(key)}">${options.map(([value,title])=>`<option value="${html(value)}" ${selectedValue===value?'selected':''}>${html(title)}</option>`).join('')}</select>${detail?`<small>${html(detail)}</small>`:''}</label>`;
}
async function api(path,init={}){const res=await fetch(path,{cache:'no-store',...init,headers:{...(init.body?{'Content-Type':'application/json'}:{}),...(init.headers||{})}});let data;try{data=await res.json();}catch{throw new Error('The experiment is unavailable.');}if(!res.ok)throw new Error(data.error||'The request failed.');return data;}
function loading(){app.innerHTML='<div class="loading" role="status">LOADING THE EXPERIMENT…</div>';}
function errorView(message,title='Something went wrong.'){app.innerHTML=`<section class="error"><p class="eyebrow">LOOPHOLE DEALERSHIP</p><h1>${html(title)}</h1><p>${html(message)}</p><a class="button" href="/dealership/">BACK TO FILTERS <span>↗</span></a></section>`;}
function home(){
 app.innerHTML=`<section class="filter-home"><div class="filter-intro"><p class="eyebrow">LOOPHOLE DEALERSHIP / FIND WHAT FITS</p><h1>Start with what<br>you <em>need.</em></h1><p>Seats, cargo, drivetrain, budget. Filter the machines first. We’ll show the badge only after you choose.</p><div class="filter-index"><span>01 / SET YOUR NEEDS</span><span>02 / COMPARE ANONYMOUS CARS</span><span>03 / REVEAL THE BADGE</span></div></div><form id="filter-form" class="filter-panel"><div class="filter-panel-head"><div><p class="eyebrow">YOUR REQUIREMENTS</p><h2>Find your fit.</h2></div><button type="button" id="reset-filters" class="text-button">RESET ↺</button></div><div class="filter-grid">${filterSelect('seats','Seats needed')}${filterSelect('cargo','Cargo room','Volume behind occupied seats or pickup bed.')}${filterSelect('drivetrain','Drivetrain','Drive shown is an EPA-listed configuration; trim availability may vary.')}${filterSelect('powertrain','Powertrain')}${filterSelect('budget','Maximum starting price')}${filterSelect('bodyStyle','Body style')}${filterSelect('towing','Minimum towing')}${filterSelect('size','Maximum footprint')}${filterSelect('sort','Sort matches')}</div><div class="filter-submit"><p id="filter-count" role="status">CHECKING THE CATALOG…</p><button class="button" id="filter-submit" type="submit">SHOW MATCHES <span>→</span></button></div><p class="caption">Seating is the manufacturer-listed maximum and may require a specific trim. Models with unknown price, cargo, or dimensions appear separately as possible matches. Unknown values never count as confirmed.</p></form><div class="motto"><span>NO AFFILIATE LINKS</span><span>NO SPONSORED RANKINGS</span><span>NO BRANDING BEFORE CHOICE</span></div></section>`;
 const form=app.querySelector('#filter-form');const count=app.querySelector('#filter-count');const submit=app.querySelector('#filter-submit');
 const read=()=>Object.fromEntries(Object.keys(filterDefaults).map(key=>[key,form.elements.namedItem(key).value]));
 const preview=async()=>{const sequence=++previewSequence;count.textContent='CHECKING THE CATALOG…';try{const result=await api('/api/dealership-filter',{method:'POST',body:JSON.stringify({filters,preview:true})});if(sequence!==previewSequence)return;count.textContent=result.confirmedCount===result.count?`${result.count} MODELS MATCH`:`${result.confirmedCount} CONFIRMED · ${result.count-result.confirmedCount} NEED VERIFICATION`;submit.disabled=result.count===0;}catch{if(sequence!==previewSequence)return;count.textContent='COUNT UNAVAILABLE · YOU CAN STILL SEARCH';submit.disabled=false;}};
 form.onchange=()=>{filters=read();sessionStorage.setItem('loophole-dealership-filters',JSON.stringify(filters));clearTimeout(previewTimer);previewTimer=setTimeout(preview,180);};
 app.querySelector('#reset-filters').onclick=()=>{filters={...filterDefaults};sessionStorage.removeItem('loophole-dealership-filters');for(const key of Object.keys(filters))form.elements.namedItem(key).value=filters[key];clearTimeout(previewTimer);preview();};
 form.onsubmit=async event=>{event.preventDefault();filters=read();submit.disabled=true;count.textContent='FINDING YOUR MATCHES…';try{const result=await api('/api/dealership-filter',{method:'POST',body:JSON.stringify({filters})});location.href=result.resultsUrl;}catch(e){count.textContent=e.message;submit.disabled=false;}};
 preview();
}
function renderQuiz(){
 const q=questions[step];const value=answers[q.key];const progress=Math.round(step/questions.length*100);
 app.innerHTML=`<section class="quiz"><div class="progress-row"><span>THE BLIND TEST</span><span>${String(step+1).padStart(2,'0')} / ${questions.length}</span></div><div class="progress-track" role="progressbar" aria-valuenow="${step+1}" aria-valuemin="1" aria-valuemax="${questions.length}" aria-label="Question progress"><div class="progress-fill" style="width:${progress}%"></div></div><p class="eyebrow">QUESTION ${String(step+1).padStart(2,'0')}</p><h1>${html(q.title)}</h1>${q.multi?`<p class="subtle">${q.key==='priorities'?'Choose exactly three.':'Choose any that work for you.'}</p>`:''}<div class="option-grid" role="group" aria-label="${html(q.title)}">${q.options.map(([id,label])=>`<button class="option" type="button" data-value="${html(id)}" aria-pressed="${q.multi?(id==='any'?Array.isArray(value)&&value.length===4:Array.isArray(value)&&value.includes(id)):value===id}"><span>${html(label)}</span><span aria-hidden="true">↗</span></button>`).join('')}</div><div class="quiz-actions"><button type="button" class="back" id="back">← BACK</button>${q.multi?`<button type="button" class="button" id="next" ${!canNext(q)?'disabled':''}>${step===questions.length-1?'FIND MY CARS':'NEXT'} <span>→</span></button>`:''}</div></section>`;
 app.querySelector('#back').onclick=()=>{if(step===0)location.href='/dealership/';else{step--;renderQuiz();}};
 app.querySelectorAll('[data-value]').forEach(button=>button.onclick=()=>{
  const v=button.dataset.value;
  if(q.multi){let currentValue=Array.isArray(answers[q.key])?[...answers[q.key]]:[];
   if(q.key==='powertrain'&&v==='any')currentValue=[...allPowertrains];
   else if(currentValue.includes(v))currentValue=currentValue.filter(x=>x!==v);
   else if(q.key!=='priorities'||currentValue.length<3)currentValue.push(v);
   answers[q.key]=currentValue;save();renderQuiz();
  }else{answers[q.key]=v;save();if(step<questions.length-1){step++;renderQuiz();}else submit();}
 });
 const next=app.querySelector('#next');if(next)next.onclick=()=>{if(!canNext(q))return;if(step<questions.length-1){step++;renderQuiz();}else submit();};
}
function canNext(q){return q.key==='priorities'?Array.isArray(answers.priorities)&&answers.priorities.length===3:Array.isArray(answers[q.key])&&answers[q.key].length>0;}
async function submit(){
 try{loading();const result=await api('/api/dealership-start',{method:'POST',body:JSON.stringify({answers})});location.href=result.resultsUrl;}
 catch(e){errorView(e.message);}
}
const resultSortOptions=[['default','Original order'],['type-asc','Vehicle type · A to Z'],['type-desc','Vehicle type · Z to A'],['price-asc','Price · low to high'],['price-desc','Price · high to low'],['cost-asc','5-year cost · low to high'],['cost-desc','5-year cost · high to low'],['mile-asc','Total cost per mile · low to high'],['mile-desc','Total cost per mile · high to low'],['running-asc','Running cost per mile · low to high'],['running-desc','Running cost per mile · high to low'],['seats-asc','Seats · fewest first'],['seats-desc','Seats · most first'],['cargo-asc','Cargo · least first'],['cargo-desc','Cargo · most first'],['towing-asc','Towing · least first'],['towing-desc','Towing · most first'],['drive-asc','Drivetrain · A to Z'],['drive-desc','Drivetrain · Z to A'],['eff-asc','Selected efficiency unit · low to high'],['eff-desc','Selected efficiency unit · high to low'],['length-asc','Length · shortest first'],['length-desc','Length · longest first'],['mpg-asc','Gas / hybrid MPG · least first'],['mpg-desc','Gas / hybrid MPG · most first'],['mpge-asc','Electric MPGe · least first'],['mpge-desc','Electric MPGe · most first']];
function filteredCandidates(data){
 const f=columnFilters;
 const fits=(value,limit,direction)=>limit===''||value!=null&&(direction==='max'?value<=Number(limit):value>=Number(limit));
 return data.candidates.filter(car=>
  (f.bodyStyle==='any'||car.bodyStyle===f.bodyStyle)&&
  (f.powertrain==='any'||car.powertrain===f.powertrain)&&
  fits(car.price,f.priceMax,'max')&&fits(car.fiveYearCost?.total,f.costMax,'max')&&
  (f.costBasis==='any'||car.fiveYearCost?.priceBasisType===f.costBasis)&&
  fits(car.fiveYearCost?.costPerMile,f.mileMax,'max')&&fits(car.fiveYearCost?.operatingPerMile,f.runningMax,'max')&&
  fits(car.seats,f.seatsMin,'min')&&fits(car.cargo,f.cargoMin,'min')&&fits(car.towing,f.towingMin,'min')&&
  (f.drivetrain==='any'||car.drivetrain===f.drivetrain)&&
  fits(f.efficiencyUnit==='mpge'?car.mpge:car.mpg,f.efficiencyMin,'min')
 );
}
function sortedCandidates(data,candidates){
 const rows=candidates.map(car=>({car,index:data.candidates.indexOf(car)}));
 if(listSort==='default')return rows.map(row=>row.car);
 const [key,direction]=listSort.split('-');const field={price:'price',seats:'seats',cargo:'cargo',towing:'towing',length:'length',mpg:'mpg',mpge:'mpge'}[key];
 rows.sort((a,b)=>{
  const value=car=>key==='type'?`${car.bodyStyle} · ${car.powertrain}`:key==='drive'?car.drivetrain:key==='eff'?(columnFilters.efficiencyUnit==='mpge'?car.mpge:car.mpg):key==='cost'?car.fiveYearCost?.total:key==='mile'?car.fiveYearCost?.costPerMile:key==='running'?car.fiveYearCost?.operatingPerMile:car[field];
  const left=value(a.car),right=value(b.car);
  if(left==null||right==null)return left==null?right==null?a.index-b.index:1:-1;
  const comparison=typeof left==='string'?left.localeCompare(right,'en-US'):left-right;
  return (direction==='asc'?comparison:-comparison)||a.index-b.index;
 });
 return rows.map(row=>row.car);
}
function sortHeading(key,label){
 const active=listSort===`${key}-asc`||listSort===`${key}-desc`;
 const next=listSort===`${key}-asc`?'descending':'ascending';
 return `<span role="columnheader" aria-sort="${active?(listSort.endsWith('-asc')?'ascending':'descending'):'none'}"><button type="button" class="sort-heading${active?' active':''}" data-sort-key="${key}" aria-label="Sort ${html(label)} ${next}">${html(label)} <span aria-hidden="true">${active?(listSort.endsWith('-asc')?'↑':'↓'):'↕'}</span></button></span>`;
}
function columnSelect(key,label,options){
 return `<label class="column-control"><span>${html(label)}</span><select data-column-filter="${html(key)}" aria-label="${html(label)}">${options.map(([value,title])=>`<option value="${html(value)}" ${columnFilters[key]===value?'selected':''}>${html(title)}</option>`).join('')}</select></label>`;
}
function columnNumber(key,label,placeholder,step='1'){
 return `<label class="column-control"><span>${html(label)}</span><input data-column-filter="${html(key)}" aria-label="${html(label)}" type="number" min="0" step="${step}" inputmode="decimal" placeholder="${html(placeholder)}" value="${html(columnFilters[key])}"></label>`;
}
function columnFilterRow(data){
 const values=key=>[['any','Any'],...[...new Set(data.candidates.map(car=>car[key]).filter(Boolean))].sort().map(value=>[value,value])];
 return `<div class="compare-filter-row" aria-label="Filter these columns"><div class="column-filter identity-filter">${columnSelect('bodyStyle','Body style',values('bodyStyle'))}${columnSelect('powertrain','Powertrain',values('powertrain'))}</div><div class="column-filter">${columnNumber('priceMax','Price at most','$ max')}</div><div class="column-filter">${columnNumber('costMax','Five-year cost at most','$ max')}${columnSelect('costBasis','Estimate basis',[['any','All estimates'],['model','Listed price'],['class','AAA class']])}</div><div class="column-filter">${columnNumber('mileMax','Total cost per mile at most','$/mi','0.01')}${columnNumber('runningMax','Running cost per mile at most','$/mi','0.01')}</div><div class="column-filter">${columnNumber('seatsMin','Seats at least','Min')}</div><div class="column-filter">${columnNumber('cargoMin','Cargo at least','Cu ft')}</div><div class="column-filter">${columnNumber('towingMin','Towing at least','Lb')}</div><div class="column-filter">${columnSelect('drivetrain','Drivetrain',values('drivetrain'))}</div><div class="column-filter">${columnSelect('efficiencyUnit','Efficiency unit',[['mpg','MPG'],['mpge','MPGe']])}${columnNumber('efficiencyMin','Efficiency at least','Min')}</div><button class="column-clear" id="clear-columns" type="button">CLEAR FILTERS ↺</button></div>`;
}
function resultRow(car,i){
 const letter=i<26?String.fromCharCode(65+i):String(i+1);
 const status=current?.mode==='filters'?(car.verificationNeeded.length?`Possible · verify ${html(car.verificationNeeded.join(', '))}`:'Selected filters confirmed'):`${html(car.matchPercent)}% fit`;
 const seats=car.seats==null?'—':car.seatingVaries?`Up to ${html(car.seats)}`:fmt(car.seats);
 const efficiency=car.powertrain==='Electric'?fmt(car.mpge,' MPGe'):fmt(car.mpg,' MPG');
 const cost=car.fiveYearCost;
 const costCell=`<strong>≈${money(cost.total)}</strong><small>${cost.priceBasisType==='class'?'AAA class estimate':'price-based estimate'}</small>`;
 const dimensions=showDimensions?`<span>Length ${fmt(car.length,' in')}</span><span>Width ${fmt(car.width,' in')}</span><span>Wheelbase ${fmt(car.wheelbase,' in')}</span><span>Height ${fmt(car.height,' in')}</span><span>Clearance ${fmt(car.groundClearance,' in')}</span>`:'';
 const breakdown=showCosts?`<div class="cost-breakdown"><strong>5-year estimate · ${html(cost.category)}</strong><span>Depreciation ${money(cost.components.depreciation)}</span><span>Insurance ${money(cost.components.insurance)}</span><span>Maintenance / repairs / tires ${money(cost.components.maintenance)}</span><span>Fuel / electricity ${money(cost.components.energy)}</span><span>Taxes / registration ${money(cost.components.fees)}</span><span>Financing charges ${money(cost.components.financing)}</span><span>Running cost ${money(cost.components.maintenance+cost.components.energy)} / 60,000 mi = ${moneyPerMile(cost.operatingPerMile)}/mi</span><small>${html(cost.energyBasis)} · ${html(cost.priceBasis)}</small></div>`:'';
 const details=dimensions||breakdown?`<div class="compare-details">${dimensions}${breakdown}</div>`:'';
 return `<article class="compare-row ${selected===car.anonymousId?'chosen':''}" data-car="${html(car.anonymousId)}"><div class="compare-identity"><span class="compare-number">CAR ${letter}</span>${car.anonymousImageUrl?`<img loading="lazy" decoding="async" src="${html(car.anonymousImageUrl)}" alt="${car.imageIsGeneric?`Generic ${html(car.bodyStyle)} class diagram, not this model's structure`:`Structural concept of car ${letter}`}" width="100" height="68">`:``}<div><h2>${html(car.bodyStyle)} · ${html(car.powertrain)}</h2><p>${status}${car.imageIsGeneric?' · CLASS DIAGRAM':''}</p></div></div><div class="compare-cell" data-label="Price">${car.priceIsModelBase?'From ':''}${money(car.price)}${car.priceIsModelBase?'*':''}</div><div class="compare-cell compare-cost" data-label="5-year cost">${costCell}</div><div class="compare-cell compare-mile" data-label="Total cost / mi"><strong>≈${moneyPerMile(cost.costPerMile)}/mi</strong><small>running ≈${moneyPerMile(cost.operatingPerMile)}/mi</small></div><div class="compare-cell" data-label="Seats">${seats}</div><div class="compare-cell" data-label="Cargo">${fmt(car.cargo,' cu ft')}</div><div class="compare-cell" data-label="Towing">${car.towing==null?'—':Number(car.towing).toLocaleString('en-US')+' lb'+(car.towingIsMaximum?' max*':'')}</div><div class="compare-cell" data-label="Drive">${fmt(car.drivetrain)}</div><div class="compare-cell" data-label="Efficiency">${efficiency}</div><button class="outline-button compare-choice" type="button" data-choice="${html(car.anonymousId)}" aria-pressed="${selected===car.anonymousId}">${selected===car.anonymousId?'UNSELECT ↶':'CHOOSE →'}</button>${details}</article>`;
}
function results(data){
 current=data;if(data.locked){location.replace('/dealership/reveal/'+data.sessionId+'/');return;}
 if(!data.candidates.length){app.innerHTML=`<section class="error"><p class="eyebrow">NO HONEST MATCH</p><h1>No car made the cut.</h1><p>No catalog model with verified values meets every hard requirement you set. Broaden a filter and try again.</p><a class="button" href="${data.mode==='filters'?'/dealership/':'/dealership/quiz/'}">${data.mode==='filters'?'EDIT FILTERS':'ADJUST ANSWERS'} <span>↗</span></a></section>`;return;}
 const amount=data.mode==='filters'?(data.confirmedCount===data.candidates.length?`${data.candidates.length} models match.`:`${data.confirmedCount} match. ${data.candidates.length-data.confirmedCount} need checking.`):(data.candidates.length===1?'One car made the cut.':`${data.candidates.length} cars made the cut.`);
 const filtered=filteredCandidates(data);
 const ordered=sortedCandidates(data,filtered);
 const indexById=new Map(data.candidates.map((car,index)=>[car.anonymousId,index]));
 app.innerHTML=`<section class="results"><div class="results-head"><div><p class="eyebrow">BEFORE THE BADGE / ${data.mode==='filters'?'FILTERED RESULTS':'QUIZ RESULTS'}</p><h1>${amount}</h1></div><div class="results-tools"><a class="text-link" href="${data.mode==='filters'?'/dealership/':'/dealership/quiz/'}">${data.mode==='filters'?'EDIT FILTERS':'RETAKE QUIZ'} ↗</a><label class="dimension-toggle"><input id="dimensions" type="checkbox" ${showDimensions?'checked':''}>SHOW DIMENSIONS</label><label class="dimension-toggle"><input id="cost-breakdown" type="checkbox" ${showCosts?'checked':''}>SHOW COST BREAKDOWN</label></div></div><div class="compare-toolbar"><p>COMPARE THE SPECS · BRAND REVEALED AFTER CHOICE</p><label>Sort by <select id="result-sort">${resultSortOptions.map(([value,label])=>`<option value="${value}" ${listSort===value?'selected':''}>${label}</option>`).join('')}</select></label></div><p class="column-count" role="status">${filtered.length} OF ${data.candidates.length} MODELS MEET COLUMN FILTERS</p><div class="compare-list"><div class="compare-heading" role="row">${sortHeading('type','ANONYMOUS VEHICLE')}${sortHeading('price','PRICE')}${sortHeading('cost','5-YR COST')}${sortHeading('mile','TOTAL / MI')}${sortHeading('seats','SEATS')}${sortHeading('cargo','CARGO')}${sortHeading('towing','TOWING')}${sortHeading('drive','DRIVE')}${sortHeading('eff','EFFICIENCY')}<span></span></div>${columnFilterRow(data)}${ordered.slice(0,visibleCount).map(car=>resultRow(car,indexById.get(car.anonymousId))).join('')}${ordered.length?'':'<p class="column-empty">No models meet these column filters. Clear a filter to see more.</p>'}</div>${ordered.length>visibleCount?`<button id="more-results" class="outline-button more-results" type="button">SHOW ${Math.min(36,ordered.length-visibleCount)} MORE <span>↓</span></button>`:``}<details class="ownership-method"><summary>HOW THE FIVE-YEAR COST IS ESTIMATED</summary><p>The estimate includes depreciation, full-coverage insurance, maintenance, repairs, tires, fuel or home electricity, taxes and registration, and financing. It assumes 12,000 miles a year for five years, national prices, and a listed starting MSRP when available. Insurance and resale value are comparison assumptions, not model-specific quotes. A cash buyer can subtract the financing amount shown in the breakdown. When a model price is missing, the total uses AAA vehicle-class ownership averages and is marked as a class estimate; it is not that model’s measured cost. Hydrogen uses a class energy placeholder because national hydrogen retail-price data is insufficient. Cost per mile is the full five-year total divided by 60,000 miles; running cost per mile includes only energy and maintenance.</p><p>Method: <a href="https://newsroom.aaa.com/wp-content/uploads/2026/09/8-YDC-Brochure_2026-1.pdf" target="_blank" rel="noopener noreferrer">AAA 2026 Your Driving Costs ↗</a> · <a href="https://newsroom.aaa.com/wp-content/uploads/2026/09/AAA_YDC-Fact-Sheet_2026.pdf" target="_blank" rel="noopener noreferrer">AAA assumptions ↗</a>. Premium and diesel fuel assumptions use <a href="https://www.eia.gov/dnav/pet/pet_pri_gnd_dcus_nus_w.htm" target="_blank" rel="noopener noreferrer">EIA fuel data ↗</a>.</p></details><p class="caption">${data.mode==='filters'?'CONFIRMED MATCHES SATISFY EVERY SELECTED FILTER WITH KNOWN VALUES. POSSIBLE MATCHES HAVE UNVERIFIED FIELDS AND ARE LABELED; THEY MAY NOT QUALIFY. ONE POWERTRAIN IS SHOWN PER MODEL. SEATING CAPACITY MAY REQUIRE A SPECIFIC TRIM. ':'QUIZ RESULTS SHOW UP TO TEN MODEL FAMILIES. '}* FROM PRICE IS THE PUBLISHED STARTING MSRP; DESTINATION TERMS VARY. MAX TOWING MAY REQUIRE A PACKAGE. FIVE-YEAR COST AND COST PER MILE ARE NATIONAL 12,000-MILE/YEAR SCENARIOS, NOT QUOTES. CLASS ESTIMATES USE AAA CATEGORY AVERAGES WHEN MODEL MSRP IS UNKNOWN. UNKNOWN VALUES SORT LAST AND DO NOT MEET A COLUMN’S NUMERIC FILTER. VERIFIED STRUCTURAL VISUALS ARE CONCEPTUAL, NOT MANUFACTURER CAD. OTHER ROWS USE GENERIC CLASS DIAGRAMS, NOT MODEL-SPECIFIC RENDERS.</p></section><div class="lockbar"><strong>Which one would you buy?</strong><button id="lock" class="button" type="button" ${selected?'':'disabled'}>LOCK IT IN <span>→</span></button></div>`;
 app.querySelector('#result-sort').onchange=e=>{listSort=e.target.value;results(data);};
 app.querySelectorAll('[data-sort-key]').forEach(b=>b.onclick=()=>{const key=b.dataset.sortKey;listSort=`${key}-${listSort===`${key}-asc`?'desc':'asc'}`;results(data);app.querySelector(`[data-sort-key="${key}"]`)?.focus();});
 app.querySelector('#dimensions').onchange=e=>{showDimensions=e.target.checked;results(data);};
 app.querySelector('#cost-breakdown').onchange=e=>{showCosts=e.target.checked;results(data);};
 app.querySelectorAll('[data-column-filter]').forEach(control=>control.onchange=event=>{columnFilters[event.target.dataset.columnFilter]=event.target.value;visibleCount=36;results(data);});
 app.querySelector('#clear-columns').onclick=()=>{columnFilters={...columnFilterDefaults};visibleCount=36;results(data);};
 const more=app.querySelector('#more-results');if(more)more.onclick=()=>{visibleCount+=36;results(data);};
 app.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>{const choice=b.dataset.choice;selected=selected===choice?null:choice;results(data);app.querySelectorAll('[data-choice]').forEach(button=>{if(button.dataset.choice===choice)button.focus();});});
 app.querySelector('#lock').onclick=async()=>{if(!selected)return;const b=app.querySelector('#lock');b.disabled=true;try{const x=await api('/api/dealership-lock',{method:'POST',body:JSON.stringify({sessionId:data.sessionId,anonymousId:selected})});location.href=x.revealUrl;}catch(e){errorView(e.message);}};
}
function reveal(data){
 if(!data.locked){location.replace('/dealership/results/'+data.sessionId+'/');return;}
 current=data;const chosen=data.reveal.find(c=>c.anonymousId===data.blindChoice);const blind=data.candidates.find(c=>c.anonymousId===data.blindChoice);
 if(!chosen||!blind){errorView('We could not load your choice.');return;}
 const others=data.reveal.filter(c=>c.anonymousId!==chosen.anonymousId);
 app.innerHTML=`<section class="reveal"><div class="reveal-lead"><p class="eyebrow">NOW PUT THE BADGE BACK ON</p><h1>You picked this before you knew the badge.</h1><p class="micro">YOUR PICK</p><h2 class="selected-name">${html(chosen.year)} ${html(chosen.make)} ${html(chosen.model)} <small>${html(chosen.powertrain)}</small></h2><div class="transform"><figure><figcaption>${blind.imageIsGeneric?'GENERIC CLASS DIAGRAM':'UNDERNEATH'}</figcaption>${blind.anonymousImageUrl?`<img src="${html(blind.anonymousImageUrl)}" alt="${blind.imageIsGeneric?'Generic vehicle-class diagram, not a model-specific structural render':'Anonymous structural concept of your selected vehicle'}">`:`<div class="no-art"><small>Diagram pending</small></div>`}</figure><figure><figcaption>WITH THE SKIN</figcaption>${chosen.revealedImageUrl?`<img class="skin" src="${html(chosen.revealedImageUrl)}" alt="Exterior of ${html(chosen.year)} ${html(chosen.make)} ${html(chosen.model)}">`:`<div class="no-art"><strong>${html(chosen.make)} ${html(chosen.model)}</strong><small>Verified exterior image pending</small></div>`}</figure></div><p class="caption">${chosen.seatingSourceUrl?`<a href="${html(chosen.seatingSourceUrl)}" target="_blank" rel="noopener noreferrer">CHECK MANUFACTURER SEATING SOURCE ↗</a> · `:``} ${chosen.specSourceUrl?`<a href="${html(chosen.specSourceUrl)}" target="_blank" rel="noopener noreferrer">CHECK MANUFACTURER SPECS ↗</a> · `:``}${chosen.sourceUrl?`<a href="${html(chosen.sourceUrl)}" target="_blank" rel="noopener noreferrer">CHECK VEHICLE SOURCE ↗</a> · `:``} IMAGES, WHEN AVAILABLE, ARE CONCEPTUAL STRUCTURE OR MANUFACTURER EXTERIORS.</p><p class="overline">THE OTHER FINALISTS</p><div class="other-finalists">${others.map(c=>`<article class="mini-reveal"><span class="micro">FINALIST</span>${c.revealedImageUrl?`<img loading="lazy" decoding="async" src="${html(c.revealedImageUrl)}" alt="Exterior of ${html(c.year)} ${html(c.make)} ${html(c.model)}">`:`<div class="mini-no-art">IMAGE PENDING</div>`}<h3>${html(c.year)} ${html(c.make)} ${html(c.model)}</h3><p class="subtle">${html(c.powertrain)}</p></article>`).join('')}</div><div id="decision" class="decision"></div></div></section>`;
 const image=app.querySelector('.skin');if(image){if(image.complete){requestAnimationFrame(()=>image.classList.add('loaded'));}else image.onload=()=>image.classList.add('loaded');}
 const otherImgs=app.querySelectorAll('.mini-reveal img');otherImgs.forEach(img=>{img.onerror=()=>{img.alt+=' — image unavailable';};});
 if(data.decision)payoff(data.decision.changed);
 else decisionQuestion(data,others);
}
function decisionQuestion(data,others){const el=app.querySelector('#decision');el.innerHTML='<h2>Still your pick?</h2><div class="decision-actions"><button class="button" type="button" id="yes">YES <span>→</span></button><button class="outline-button" type="button" id="no">NO <span>→</span></button></div>';
 el.querySelector('#yes').onclick=()=>record(data,data.blindChoice);
 el.querySelector('#no').onclick=()=>{el.innerHTML=`<h2>Which would you choose now?</h2><div class="decision-list">${others.map(c=>`<button class="outline-button" type="button" data-post="${html(c.anonymousId)}">${html(c.year)} ${html(c.make)} ${html(c.model)} <span>→</span></button>`).join('')}${others.length?'':'<button class="outline-button" type="button" data-post="none">I WOULD WALK AWAY <span>→</span></button>'}</div>`;el.querySelectorAll('[data-post]').forEach(b=>b.onclick=()=>record(data,b.dataset.post==='none'?null:b.dataset.post));};
}
async function record(data,id){const el=app.querySelector('#decision');el.innerHTML='<p class="subtle">RECORDING THE DECISION…</p>';try{const result=await api('/api/dealership-decision',{method:'POST',body:JSON.stringify({sessionId:data.sessionId,anonymousId:id})});payoff(result.changed);}catch(e){errorView(e.message);}}
function payoff(changed){const el=app.querySelector('#decision');const fromFilters=current?.mode==='filters';el.innerHTML=`<div class="payoff"><p class="eyebrow">RESULT</p><h2>${changed?'The badge changed your mind.':'The badge didn’t change your mind.'}</h2><p>That’s the experiment.</p><a class="button" href="${fromFilters?'/dealership/':'/dealership/quiz/'}" id="again">${fromFilters?'FILTER AGAIN':'DO IT AGAIN'} <span>↗</span></a></div>`;if(!fromFilters)el.querySelector('#again').onclick=()=>sessionStorage.removeItem('loophole-dealership-answers');}
async function loadSession(id,which){try{visibleCount=36;loading();const data=await api('/api/dealership-session?session='+encodeURIComponent(id));if(which==='results')results(data);else reveal(data);}catch(e){errorView(e.message);}}
const parts=location.pathname.split('/').filter(Boolean);
if(parts.length===1&&parts[0]==='dealership')home();
else if(parts[0]==='dealership'&&parts[1]==='quiz'){renderQuiz();}
else if(parts[0]==='dealership'&&['results','reveal'].includes(parts[1])&&parts[2])loadSession(parts[2],parts[1]);
else errorView('This part of the experiment could not be found.');
