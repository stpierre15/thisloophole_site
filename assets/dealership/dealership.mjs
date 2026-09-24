const app=document.querySelector('#app');
const html=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>n==null?'Not published':'$'+Number(n).toLocaleString('en-US');
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
let step=0,selected=null,showDimensions=false,current=null;
const save=()=>sessionStorage.setItem('loophole-dealership-answers',JSON.stringify(answers));
const filterDefaults={budget:'any',seats:'any',cargo:'any',drivetrain:'any',powertrain:'any',towing:'never',size:'any',bodyStyle:'any',sort:'price-asc'};
let filters={...filterDefaults};try{filters={...filters,...JSON.parse(sessionStorage.getItem('loophole-dealership-filters')||'{}')};}catch{filters={...filterDefaults};}
const filterOptions={
  budget:[['any','No budget cap'],['under25','Up to $25k'],['25-35','Up to $35k'],['35-45','Up to $45k'],['45-60','Up to $60k'],['60-80','Up to $80k'],['80-120','Up to $120k']],
  seats:[['any','Any'],['2','2+ seats'],['4','4+ seats'],['5','5+ seats'],['6','6+ seats'],['7','7+ seats'],['8','8 seats']],
  cargo:[['any','Any'],['small','Small · 15+ cu ft'],['medium','Medium · 25+ cu ft'],['huge','Huge · 35+ cu ft']],
  drivetrain:[['any','Any'],['fwd','Front-wheel drive'],['rwd','Rear-wheel drive'],['awd-standard','AWD / 4WD standard'],['awd-capable','AWD / 4WD available']],
  powertrain:[['any','Any'],['Gas','Gas'],['Hybrid','Hybrid'],['Plug-in hybrid','Plug-in hybrid'],['Electric','Electric']],
  towing:[['never','Any'],['under3500','3,500+ lb'],['3500-5000','5,000+ lb'],['5000-8000','8,000+ lb']],
  size:[['any','Any'],['small','Small · up to 185 in'],['medium','Medium · up to 195 in'],['large','Large · up to 230 in']],
  bodyStyle:[['any','Any'],['SUV','SUV'],['Sedan','Sedan'],['Pickup','Pickup'],['Minivan','Minivan'],['Wagon','Wagon'],['Coupe','Coupe']],
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
 app.innerHTML=`<section class="filter-home"><div class="filter-intro"><p class="eyebrow">LOOPHOLE DEALERSHIP / FIND WHAT FITS</p><h1>Start with what<br>you <em>need.</em></h1><p>Seats, cargo, drivetrain, budget. Filter the machines first. We’ll show the badge only after you choose.</p><div class="filter-index"><span>01 / SET YOUR NEEDS</span><span>02 / COMPARE ANONYMOUS CARS</span><span>03 / REVEAL THE BADGE</span></div></div><form id="filter-form" class="filter-panel"><div class="filter-panel-head"><div><p class="eyebrow">YOUR REQUIREMENTS</p><h2>Find your fit.</h2></div><button type="button" id="reset-filters" class="text-button">RESET ↺</button></div><div class="filter-grid">${filterSelect('seats','Seats needed')}${filterSelect('cargo','Cargo room','Volume behind occupied seats or pickup bed.')}${filterSelect('drivetrain','Drivetrain','Standard means the listed base configuration.')}${filterSelect('powertrain','Powertrain')}${filterSelect('budget','Maximum starting price')}${filterSelect('bodyStyle','Body style')}${filterSelect('towing','Minimum towing')}${filterSelect('size','Maximum footprint')}${filterSelect('sort','Sort matches')}</div><div class="filter-submit"><p id="filter-count" role="status">CHECKING VERIFIED VEHICLES…</p><button class="button" id="filter-submit" type="submit">SHOW MATCHES <span>→</span></button></div><p class="caption">Only vehicles with verified specifications and both required images can enter the blind comparison. Cargo thresholds use the published volume for the listed configuration; folded-seat capacity may differ.</p></form><div class="motto"><span>NO AFFILIATE LINKS</span><span>NO SPONSORED RANKINGS</span><span>NO BRANDING BEFORE CHOICE</span></div></section>`;
 const form=app.querySelector('#filter-form');const count=app.querySelector('#filter-count');const submit=app.querySelector('#filter-submit');
 const read=()=>Object.fromEntries(Object.keys(filterDefaults).map(key=>[key,form.elements.namedItem(key).value]));
 const preview=async()=>{const sequence=++previewSequence;count.textContent='CHECKING VERIFIED VEHICLES…';try{const result=await api('/api/dealership-filter',{method:'POST',body:JSON.stringify({filters,preview:true})});if(sequence!==previewSequence)return;count.textContent=result.count===1?'1 VERIFIED VEHICLE MATCHES':`${result.count} VERIFIED VEHICLES MATCH`;submit.disabled=result.count===0;}catch{if(sequence!==previewSequence)return;count.textContent='COUNT UNAVAILABLE · YOU CAN STILL SEARCH';submit.disabled=false;}};
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
function spec(label,value){return `<div class="spec"><label>${html(label)}</label><span>${value}</span></div>`;}
function card(car,i){
 const size=Math.min(1,car.length/230);
 const traits=[spec('Starting MSRP',money(car.price)),spec(car.powertrain==='Electric'?'MPGe':'Combined MPG',fmt(car.powertrain==='Electric'?car.mpge:car.mpg)),spec('Seats',fmt(car.seats)),spec('Cargo',fmt(car.cargo,' cu ft')),spec('Towing',fmt(car.towing,' lb')),spec('Drivetrain',fmt(car.drivetrain))];
 const dims=`<div class="dimensions" ${showDimensions?'':'hidden'}><div><span>LENGTH</span><strong>${fmt(car.length,' in')}</strong></div><div><span>WHEELBASE</span><strong>${fmt(car.wheelbase,' in')}</strong></div><div><span>HEIGHT</span><strong>${fmt(car.height,' in')}</strong></div><div><span>CLEARANCE</span><strong>${fmt(car.groundClearance,' in')}</strong></div></div>`;
 const letter=String.fromCharCode(65+i);
 return `<article class="card ${selected===car.anonymousId?'chosen':''}" data-car="${html(car.anonymousId)}"><div class="card-top"><span>CAR ${letter}</span><span class="match">${current?.mode==='filters'?'MEETS FILTERS':`${html(car.matchPercent)}% FIT`}</span></div><div class="image-stage"><img class="structural" loading="${i<3?'eager':'lazy'}" decoding="async" style="--relative-length:${size}" src="${html(car.anonymousImageUrl)}" alt="Anonymous structural concept of car ${letter}" width="1536" height="1024"></div><h2 class="spec-type">${html(car.bodyStyle)} · ${html(car.powertrain)}</h2><div class="specs">${traits.join('')}</div>${dims}<div class="notes"><h3>${current?.mode==='filters'?'MATCHED NEEDS':'WHY IT FITS YOU'}</h3><ul>${car.fitReasons.map(x=>`<li>${html(x)}</li>`).join('')||'<li>Meets your hard requirements</li>'}</ul></div><div class="notes trade"><h3>TRADEOFF</h3><ul>${(car.weaknesses.length?car.weaknesses:['No verified tradeoff published']).slice(0,2).map(x=>`<li>${html(x)}</li>`).join('')}</ul></div><button class="outline-button choice" type="button" data-choice="${html(car.anonymousId)}" aria-pressed="${selected===car.anonymousId}">${selected===car.anonymousId?'SELECTED ✓':"I'D BUY THIS ONE"}</button></article>`;
}
function results(data){
 current=data;if(data.locked){location.replace('/dealership/reveal/'+data.sessionId+'/');return;}
 if(!data.candidates.length){app.innerHTML=`<section class="error"><p class="eyebrow">NO HONEST MATCH</p><h1>No car made the cut.</h1><p>No verified, rendered model currently meets every hard requirement you set. Broaden a filter and try again.</p><a class="button" href="${data.mode==='filters'?'/dealership/':'/dealership/quiz/'}">${data.mode==='filters'?'EDIT FILTERS':'ADJUST ANSWERS'} <span>↗</span></a></section>`;return;}
 const amount=data.mode==='filters'?(data.candidates.length===1?'1 vehicle matches.':`${data.candidates.length} vehicles match.`):(data.candidates.length===1?'One car made the cut.':`${data.candidates.length} cars made the cut.`);
 app.innerHTML=`<section class="results"><div class="results-head"><div><p class="eyebrow">BEFORE THE BADGE / ${data.mode==='filters'?'FILTERED RESULTS':'QUIZ RESULTS'}</p><h1>${amount}</h1></div><div class="results-tools"><a class="text-link" href="${data.mode==='filters'?'/dealership/':'/dealership/quiz/'}">${data.mode==='filters'?'EDIT FILTERS':'RETAKE QUIZ'} ↗</a><label class="dimension-toggle"><input id="dimensions" type="checkbox" ${showDimensions?'checked':''}>SHOW DIMENSIONS</label></div></div><div class="cards">${data.candidates.map(card).join('')}</div><p class="caption">${data.mode==='filters'?'FILTERED RESULTS SHOW VERIFIED MODEL CONFIGURATIONS, ONE POWERTRAIN PER MODEL. STARTING PRICE AND DRIVETRAIN REFER TO THE LISTED CONFIGURATION. ':'QUIZ RESULTS SHOW UP TO TEN MODEL FAMILIES. '}LOOPHOLE VISUALIZATION — NOT MANUFACTURER CAD. STRUCTURAL CONCEPTS BASED ON PUBLISHED DIMENSIONS AND PACKAGING.</p></section><div class="lockbar"><strong>Which one would you buy?</strong><button id="lock" class="button" type="button" ${selected?'':'disabled'}>LOCK IT IN <span>→</span></button></div>`;
 app.querySelector('#dimensions').onchange=e=>{showDimensions=e.target.checked;results(data);};
 app.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>{selected=b.dataset.choice;results(data);});
 app.querySelector('#lock').onclick=async()=>{if(!selected)return;const b=app.querySelector('#lock');b.disabled=true;try{const x=await api('/api/dealership-lock',{method:'POST',body:JSON.stringify({sessionId:data.sessionId,anonymousId:selected})});location.href=x.revealUrl;}catch(e){errorView(e.message);}};
}
function reveal(data){
 if(!data.locked){location.replace('/dealership/results/'+data.sessionId+'/');return;}
 current=data;const chosen=data.reveal.find(c=>c.anonymousId===data.blindChoice);const blind=data.candidates.find(c=>c.anonymousId===data.blindChoice);
 if(!chosen||!blind){errorView('We could not load your choice.');return;}
 const others=data.reveal.filter(c=>c.anonymousId!==chosen.anonymousId);
 app.innerHTML=`<section class="reveal"><div class="reveal-lead"><p class="eyebrow">NOW PUT THE BADGE BACK ON</p><h1>You picked this before you knew the badge.</h1><p class="micro">YOUR PICK</p><h2 class="selected-name">${html(chosen.year)} ${html(chosen.make)} ${html(chosen.model)} <small>${html(chosen.powertrain)}</small></h2><div class="transform"><figure><figcaption>UNDERNEATH</figcaption><img src="${html(blind.anonymousImageUrl)}" alt="Anonymous structural concept of your selected vehicle"></figure><figure><figcaption>WITH THE SKIN</figcaption><img class="skin" src="${html(chosen.revealedImageUrl)}" alt="Exterior of ${html(chosen.year)} ${html(chosen.make)} ${html(chosen.model)}"></figure></div><p class="caption">STRUCTURAL VISUALIZATION IS CONCEPTUAL, NOT MANUFACTURER CAD. EXTERIOR: MANUFACTURER OR AUTHORIZED DEALER IMAGE.</p><p class="overline">THE OTHER FINALISTS</p><div class="other-finalists">${others.map(c=>`<article class="mini-reveal"><span class="micro">FINALIST</span><img loading="lazy" decoding="async" src="${html(c.revealedImageUrl)}" alt="Exterior of ${html(c.year)} ${html(c.make)} ${html(c.model)}"><h3>${html(c.year)} ${html(c.make)} ${html(c.model)}</h3><p class="subtle">${html(c.powertrain)}</p></article>`).join('')}</div><div id="decision" class="decision"></div></div></section>`;
 const image=app.querySelector('.skin');if(image.complete){requestAnimationFrame(()=>image.classList.add('loaded'));}else image.onload=()=>image.classList.add('loaded');
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
async function loadSession(id,which){try{loading();const data=await api('/api/dealership-session?session='+encodeURIComponent(id));if(which==='results')results(data);else reveal(data);}catch(e){errorView(e.message);}}
const parts=location.pathname.split('/').filter(Boolean);
if(parts.length===1&&parts[0]==='dealership')home();
else if(parts[0]==='dealership'&&parts[1]==='quiz'){renderQuiz();}
else if(parts[0]==='dealership'&&['results','reveal'].includes(parts[1])&&parts[2])loadSession(parts[2],parts[1]);
else errorView('This part of the experiment could not be found.');
