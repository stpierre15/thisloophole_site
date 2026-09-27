const money=value=>value==null?'Not published':'$'+Number(value).toLocaleString('en-US');
const detail=node=>`${node.bodyStyle} · ${node.powertrain} · ${node.seats??'unknown'} seats · ${node.cargo==null?'cargo unknown':`${node.cargo} cu ft cargo`} · ${money(node.price)} · ${node.mpg==null?(node.mpge==null?'efficiency unknown':`${node.mpge} MPGe`):`${node.mpg} MPG`} · about $${Number(node.costPerMile).toFixed(2)}/mi`;
const label=node=>`MODEL ${String(node.id+1).padStart(3,'0')}`;

// The horizontal coordinate is a measured or estimated dollar value. The vertical
// coordinate is a labeled vehicle class; offsets within a class only prevent overlap.
export function createVehicleUniverse(canvas,tooltip,summary,onSelect=()=>{}){
 const ctx=canvas.getContext('2d');
 const rows=['SUV','Sedan','Pickup','Truck','Minivan','Van','Wagon','Hatchback','Coupe'];
 let nodes=[],axis='cost',activeId=null,width=0,height=0,spots=[];
 const observer=new ResizeObserver(resize);observer.observe(canvas);
 function resize(){const box=canvas.getBoundingClientRect();width=box.width;height=box.height;if(!width||!height)return;const ratio=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);ctx.setTransform(ratio,0,0,ratio,0,0);draw();}
 function draw(){
  if(!width||!height)return;
  ctx.clearRect(0,0,width,height);spots=[];
  const compact=width<470,left=compact?67:87,right=compact?56:91,top=37,bottom=45,plotWidth=Math.max(20,width-left-right),plotHeight=height-top-bottom;
  const known=nodes.map(node=>axis==='cost'?node.fiveYearCost:node.price).filter(value=>Number.isFinite(value));
  const ceiling=Math.max(axis==='cost'?50000:25000,Math.ceil(Math.max(...known,0)/25000)*25000);
  const knownWidth=plotWidth-(compact?46:68),unknownX=left+plotWidth-4;
  ctx.font=`${compact?9:10}px Arial`;ctx.textBaseline='middle';
  for(let i=0;i<=4;i++){
   const x=left+knownWidth*i/4;ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x,height-bottom);ctx.strokeStyle='rgba(195,226,216,.17)';ctx.stroke();
   ctx.fillStyle='#b7cec5';ctx.textAlign='center';ctx.fillText(`$${Math.round(ceiling*i/4000)}k`,x,height-bottom+17);
  }
  ctx.textAlign='center';ctx.fillStyle='#b7cec5';ctx.fillText(compact?'N/A':'PRICE N/A',unknownX,height-bottom+17);
  rows.forEach((row,index)=>{const y=top+(index+.5)*plotHeight/rows.length;ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(width-right+10,y);ctx.strokeStyle='rgba(195,226,216,.13)';ctx.stroke();ctx.textAlign='right';ctx.fillStyle='#d9eee6';ctx.fillText(row.toUpperCase(),left-9,y);});
  const occupied=new Map();
  for(const node of nodes){
   const row=rows.indexOf(node.bodyStyle);if(row<0)continue;
   const value=axis==='cost'?node.fiveYearCost:node.price;
   const x=value==null?unknownX:left+Math.min(1,Math.max(0,value/ceiling))*knownWidth;
   const baseY=top+(row+.5)*plotHeight/rows.length;
   const bucket=`${row}:${Math.round(x/9)}`;const slot=occupied.get(bucket)??0;occupied.set(bucket,slot+1);
   const spread=((slot%9)-4)*Math.min(2.3,plotHeight/rows.length/11);
   const y=baseY+spread;
   if(!node.match){ctx.fillStyle='rgba(140,170,161,.18)';ctx.beginPath();ctx.arc(x,y,2.1,0,Math.PI*2);ctx.fill();continue;}
   const active=node.id===activeId;ctx.beginPath();ctx.arc(x,y,active?6:node.rank<5?4.2:3.1,0,Math.PI*2);ctx.fillStyle=node.confirmed?'#89e0c5':'#f4bf71';ctx.fill();
   if(active){ctx.beginPath();ctx.arc(x,y,9,0,Math.PI*2);ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.stroke();}
   spots.push({x,y,node});
  }
  ctx.fillStyle='#b7cec5';ctx.textAlign='left';ctx.font='10px Arial';ctx.fillText(axis==='cost'?'EST. FIVE-YEAR OWNERSHIP COST →':'STARTING PRICE →',left,14);
 }
 function nearest(event){const box=canvas.getBoundingClientRect(),x=event.clientX-box.left,y=event.clientY-box.top;let found=null,distance=14;for(const spot of spots){const d=Math.hypot(x-spot.x,y-spot.y);if(d<distance){found=spot.node;distance=d;}}return found;}
 function select(node,notify=true){activeId=node?.id??null;tooltip.textContent=node?`${label(node)} · ${detail(node)}${node.confirmed?' · selected filters confirmed':` · check ${node.verificationNeeded?.join(', ')||'missing filter data'}`}`:'Select a point or a row to inspect a model.';draw();if(node&&notify)onSelect(node.id);}
 canvas.addEventListener('pointermove',event=>{const node=nearest(event);canvas.style.cursor=node?'pointer':'default';});
 canvas.addEventListener('click',event=>{const node=nearest(event);if(node)select(node);});
 function update(nextNodes){nodes=nextNodes;summary.textContent=`${nodes.filter(node=>node.match).length} of ${nodes.length} models match`;if(activeId!=null&&!nodes.find(node=>node.id===activeId)?.match)select(null,false);draw();}
 return {update,setAxis(value){axis=value==='price'?'price':'cost';draw();},select(id){select(nodes.find(node=>node.id===id),false);},destroy(){observer.disconnect();}};
}
