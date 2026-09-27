const goldenAngle=Math.PI*(3-Math.sqrt(5));
const money=value=>value==null?'Not published':'$'+Number(value).toLocaleString('en-US');
const detail=node=>`${node.bodyStyle} · ${node.powertrain} · ${node.seats??'Unknown'} seats · ${node.cargo==null?'cargo unknown':`${node.cargo} cu ft cargo`} · ${node.drivetrain??'drive unknown'} · ${money(node.price)} · about $${Number(node.costPerMile).toFixed(2)}/mi${node.costBasis==='class'?' (AAA class estimate)':''}`;
const rankedValue=(node,sort)=>{
 const key=sort.split('-')[0];
 if(key==='cost')return `≈${money(node.fiveYearCost)} / 5 years${node.costBasis==='class'?'*':''}`;
 if(key==='mile')return `≈$${Number(node.costPerMile).toFixed(2)}/mi${node.costBasis==='class'?'*':''}`;
 if(key==='seats')return node.seats==null?'seats unknown':`${node.seats} seats`;
 if(key==='cargo')return node.cargo==null?'cargo unknown':`${node.cargo} cu ft cargo`;
 if(key==='towing')return node.towing==null?'tow rating unknown':`${Number(node.towing).toLocaleString('en-US')} lb tow`;
 return money(node.price);
};

export function createVehicleUniverse(canvas,tooltip,summary,shortlist){
 const ctx=canvas.getContext('2d');
 const motion=matchMedia('(prefers-reduced-motion: reduce)');
 const points=[];let width=0,height=0,angle=.32,tilt=-.12,dragging=false,paused=false,lastX=0,activeId=null,frame=0,visible=true;
 const observer=new ResizeObserver(resize);
 const intersect=new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting??true;if(visible)draw();});
 observer.observe(canvas);intersect.observe(canvas);
 function resize(){
  const box=canvas.getBoundingClientRect();width=box.width;height=box.height;
  if(!width||!height)return;
  const ratio=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
  ctx.setTransform(ratio,0,0,ratio,0,0);draw();
 }
 function update(nodes,sort='price-asc'){
  for(const node of nodes){
   const i=node.id,n=nodes.length,y=1-2*(i+.5)/n,r=Math.sqrt(1-y*y),theta=goldenAngle*i;
   const old=points[i];points[i]={...node,x:Math.cos(theta)*r,y,z:Math.sin(theta)*r,strength:old?.strength??(node.match?1:0),screenX:0,screenY:0,screenR:0};
  }
  points.length=nodes.length;
  summary.textContent=`${nodes.filter(node=>node.match).length} of ${nodes.length} car models still in view`;
  shortlist.replaceChildren(...nodes.filter(node=>node.match).sort((a,b)=>a.rank-b.rank).slice(0,5).map(node=>{
   const button=document.createElement('button');button.type='button';button.className='universe-shortlist-item';button.textContent=`${String(node.rank+1).padStart(2,'0')} / ${node.bodyStyle} · ${node.powertrain} · ${rankedValue(node,sort)}`;
   button.setAttribute('aria-label',`Highlight ranked model ${node.rank+1}: ${detail(node)}`);
   button.onclick=()=>{activeId=node.id;describe(node);draw();};return button;
  }));
  if(activeId!=null&&!points[activeId]?.match){activeId=null;tooltip.textContent='Drag to explore. Tap a point for its specs.';}
  draw();
 }
 function describe(node){
  tooltip.textContent=node.match?`MODEL ${String(node.id+1).padStart(3,'0')} · ${detail(node)}${node.confirmed?' · filter match confirmed':' · verify missing specs'}`:`MODEL ${String(node.id+1).padStart(3,'0')} · filtered out`;
 }
 function draw(){
  cancelAnimationFrame(frame);
  if(!width||!height||!visible)return;
  ctx.clearRect(0,0,width,height);
  const radius=Math.min(width*.43,height*.45),cx=width/2,cy=height/2;
  const glow=ctx.createRadialGradient(cx,cy,8,cx,cy,radius*1.25);glow.addColorStop(0,'rgba(30,88,81,.44)');glow.addColorStop(1,'rgba(8,18,20,0)');ctx.fillStyle=glow;ctx.fillRect(0,0,width,height);
  ctx.beginPath();ctx.ellipse(cx,cy,radius,radius,0,0,Math.PI*2);ctx.strokeStyle='rgba(181,220,211,.18)';ctx.lineWidth=1;ctx.stroke();
  ctx.beginPath();ctx.ellipse(cx,cy,radius*.37,radius,0,0,Math.PI*2);ctx.strokeStyle='rgba(181,220,211,.09)';ctx.stroke();
  const cos=Math.cos(angle),sin=Math.sin(angle),ct=Math.cos(tilt),st=Math.sin(tilt);
  const projected=points.map(node=>{
   node.strength+=(Number(node.match)-node.strength)*.16;
   const x=node.x*cos+node.z*sin,z=-node.x*sin+node.z*cos,y=node.y*ct-z*st,depth=node.y*st+z*ct;
   const perspective=1+depth*.17;
   node.screenX=cx+x*radius*perspective;node.screenY=cy+y*radius*perspective;
   node.screenR=(node.rank!=null&&node.rank<5?4.2:2.25)*(1+depth*.25)*(.25+.75*node.strength);
   return {node,depth};
  }).sort((a,b)=>a.depth-b.depth);
  for(const {node,depth} of projected){
   const highlighted=node.id===activeId;
   const alpha=node.match?(.35+.55*(depth+1)/2)*node.strength:.07*node.strength;
   if(alpha<.01)continue;
   const color=node.confirmed?'137,224,197':'244,191,113';
   ctx.beginPath();ctx.arc(node.screenX,node.screenY,node.screenR+(highlighted?4:0),0,Math.PI*2);
   ctx.fillStyle=`rgba(${color},${highlighted?1:alpha})`;ctx.fill();
   if(highlighted){ctx.beginPath();ctx.arc(node.screenX,node.screenY,node.screenR+9,0,Math.PI*2);ctx.strokeStyle='rgba(255,255,255,.85)';ctx.lineWidth=1;ctx.stroke();}
  }
  if(!motion.matches&&!dragging&&!paused){angle+=.0018;frame=requestAnimationFrame(draw);}
 }
 function nearest(event){
  const box=canvas.getBoundingClientRect(),x=event.clientX-box.left,y=event.clientY-box.top;
  let winner=null,distance=16;
  for(const node of points){if(!node.match)continue;const d=Math.hypot(node.screenX-x,node.screenY-y);if(d<distance){winner=node;distance=d;}}
  return winner;
 }
 canvas.addEventListener('pointerdown',event=>{dragging=true;lastX=event.clientX;canvas.setPointerCapture(event.pointerId);canvas.classList.add('dragging');cancelAnimationFrame(frame);});
 canvas.addEventListener('pointermove',event=>{
  if(dragging){angle+=(event.clientX-lastX)*.006;lastX=event.clientX;draw();return;}
  const node=nearest(event);canvas.style.cursor=node?'pointer':'grab';if(node){activeId=node.id;describe(node);draw();}
 });
 canvas.addEventListener('pointerup',event=>{dragging=false;canvas.classList.remove('dragging');const node=nearest(event);if(node){activeId=node.id;describe(node);}draw();});
 canvas.addEventListener('pointercancel',()=>{dragging=false;canvas.classList.remove('dragging');draw();});
 motion.addEventListener('change',draw);
 return {update,togglePause(){paused=!paused;draw();return paused;},destroy(){cancelAnimationFrame(frame);observer.disconnect();intersect.disconnect();}};
}
