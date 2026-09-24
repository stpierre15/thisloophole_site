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
async function api(path,init={}){const res=await fetch(path,{cache:'no-store',...init,headers:{...(init.body?{'Content-Type':'application/json'}:{}),...(init.headers||{})}});let data;try{data=await res.json();}catch{throw new Error('The experiment is unavailable.');}if(!res.ok)throw new Error(data.error||'The request failed.');return data;}
function loading(){app.innerHTML='<div class="loading" role="status">LOADING THE EXPERIMENT…</div>';}
function errorView(message,title='Something went wrong.'){app.innerHTML=`<section class="error"><p class="eyebrow">LOOPHOLE DEALERSHIP</p><h1>${html(title)}</h1><p>${html(message)}</p><a class="button" href="/dealership/quiz/">TAKE THE TEST AGAIN <span>↗</span></a></section>`;}
function home(){app.innerHTML='<section class="home"><p class="eyebrow">AN EXPERIMENT IN BUYING CARS</p><h1>Buy the car.<br><em>Not the badge.</em></h1><div class="intro"><p>You already know what brands you like. That’s the problem.</p><p>We stripped the styling off the cars. Tell us what you need, pick one, then we’ll tell you what you bought.</p></div><a class="button" href="/dealership/quiz/">TAKE THE BLIND TEST <span>↗</span></a><p class="caption">EARLY COVERAGE: ONLY MODELS WITH VERIFIED SPECS AND BOTH IMAGES ENTER THE BLIND TEST.</p><div class="motto"><span>NO AFFILIATE LINKS</span><span>NO SPONSORED RANKINGS</span><span>NO BRANDING</span><span>JUST THE CAR</span></div></section>';}
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
 return `<article class="card ${selected===car.anonymousId?'chosen':''}" data-car="${html(car.anonymousId)}"><div class="card-top"><span>CAR ${'ABC'[i]}</span><span class="match">${html(car.matchPercent)}% FIT</span></div><div class="image-stage"><img class="structural" style="--relative-length:${size}" src="${html(car.anonymousImageUrl)}" alt="Anonymous structural concept of car ${'ABC'[i]}" width="1536" height="1024"></div><h2 class="spec-type">${html(car.bodyStyle)} · ${html(car.powertrain)}</h2><div class="specs">${traits.join('')}</div>${dims}<div class="notes"><h3>WHY IT FITS YOU</h3><ul>${car.fitReasons.map(x=>`<li>${html(x)}</li>`).join('')||'<li>Meets your hard requirements</li>'}</ul></div><div class="notes trade"><h3>TRADEOFF</h3><ul>${(car.weaknesses.length?car.weaknesses:['No verified tradeoff published']).slice(0,2).map(x=>`<li>${html(x)}</li>`).join('')}</ul></div><button class="outline-button choice" type="button" data-choice="${html(car.anonymousId)}" aria-pressed="${selected===car.anonymousId}">${selected===car.anonymousId?'SELECTED ✓':"I'D BUY THIS ONE"}</button></article>`;
}
function results(data){
 current=data;if(data.locked){location.replace('/dealership/reveal/'+data.sessionId+'/');return;}
 if(!data.candidates.length){app.innerHTML='<section class="error"><p class="eyebrow">NO HONEST MATCH</p><h1>No car made the cut.</h1><p>No verified, rendered model currently meets every hard requirement you set. Adjust your budget, seating, size, fuel or towing answers and try again.</p><a class="button" href="/dealership/quiz/">ADJUST ANSWERS <span>↗</span></a></section>';return;}
 const amount=['','One car made the cut.','Two cars made the cut.','Three cars made the cut.'][data.candidates.length];
 app.innerHTML=`<section class="results"><div class="results-head"><div><p class="eyebrow">BEFORE THE BADGE</p><h1>${amount}</h1></div><label class="dimension-toggle"><input id="dimensions" type="checkbox" ${showDimensions?'checked':''}>SHOW DIMENSIONS</label></div><div class="cards">${data.candidates.map(card).join('')}</div><p class="caption">LOOPHOLE VISUALIZATION — NOT MANUFACTURER CAD. STRUCTURAL CONCEPTS BASED ON PUBLISHED DIMENSIONS AND PACKAGING. IMAGES USE A SHARED CAMERA AND STUDIO TREATMENT; DISPLAY WIDTH REFLECTS PUBLISHED LENGTH.</p></section><div class="lockbar"><strong>Which one would you buy?</strong><button id="lock" class="button" type="button" ${selected?'':'disabled'}>LOCK IT IN <span>→</span></button></div>`;
 app.querySelector('#dimensions').onchange=e=>{showDimensions=e.target.checked;results(data);};
 app.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>{selected=b.dataset.choice;results(data);});
 app.querySelector('#lock').onclick=async()=>{if(!selected)return;const b=app.querySelector('#lock');b.disabled=true;try{const x=await api('/api/dealership-lock',{method:'POST',body:JSON.stringify({sessionId:data.sessionId,anonymousId:selected})});location.href=x.revealUrl;}catch(e){errorView(e.message);}};
}
function reveal(data){
 if(!data.locked){location.replace('/dealership/results/'+data.sessionId+'/');return;}
 current=data;const chosen=data.reveal.find(c=>c.anonymousId===data.blindChoice);const blind=data.candidates.find(c=>c.anonymousId===data.blindChoice);
 if(!chosen||!blind){errorView('We could not load your choice.');return;}
 const others=data.reveal.filter(c=>c.anonymousId!==chosen.anonymousId);
 app.innerHTML=`<section class="reveal"><div class="reveal-lead"><p class="eyebrow">NOW PUT THE BADGE BACK ON</p><h1>You picked this before you knew the badge.</h1><p class="micro">YOUR PICK</p><h2 class="selected-name">${html(chosen.year)} ${html(chosen.make)} ${html(chosen.model)} <small>${html(chosen.powertrain)}</small></h2><div class="transform"><figure><figcaption>UNDERNEATH</figcaption><img src="${html(blind.anonymousImageUrl)}" alt="Anonymous structural concept of your selected vehicle"></figure><figure><figcaption>WITH THE SKIN</figcaption><img class="skin" src="${html(chosen.revealedImageUrl)}" alt="Exterior of ${html(chosen.year)} ${html(chosen.make)} ${html(chosen.model)}"></figure></div><p class="caption">STRUCTURAL VISUALIZATION IS CONCEPTUAL, NOT MANUFACTURER CAD. EXTERIOR: MANUFACTURER IMAGE.</p><p class="overline">THE OTHER FINALISTS</p><div class="other-finalists">${others.map(c=>`<article class="mini-reveal"><span class="micro">FINALIST</span><img src="${html(c.revealedImageUrl)}" alt="Exterior of ${html(c.year)} ${html(c.make)} ${html(c.model)}"><h3>${html(c.year)} ${html(c.make)} ${html(c.model)}</h3><p class="subtle">${html(c.powertrain)}</p></article>`).join('')}</div><div id="decision" class="decision"></div></div></section>`;
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
function payoff(changed){const el=app.querySelector('#decision');el.innerHTML=`<div class="payoff"><p class="eyebrow">RESULT</p><h2>${changed?'The badge changed your mind.':'The badge didn’t change your mind.'}</h2><p>That’s the experiment.</p><a class="button" href="/dealership/quiz/" id="again">DO IT AGAIN <span>↗</span></a></div>`;el.querySelector('#again').onclick=()=>sessionStorage.removeItem('loophole-dealership-answers');}
async function loadSession(id,which){try{loading();const data=await api('/api/dealership-session?session='+encodeURIComponent(id));if(which==='results')results(data);else reveal(data);}catch(e){errorView(e.message);}}
const parts=location.pathname.split('/').filter(Boolean);
if(parts.length===1&&parts[0]==='dealership')home();
else if(parts[0]==='dealership'&&parts[1]==='quiz'){renderQuiz();}
else if(parts[0]==='dealership'&&['results','reveal'].includes(parts[1])&&parts[2])loadSession(parts[2],parts[1]);
else errorView('This part of the experiment could not be found.');
