import {area,center} from './model.ts';
import type {Scene,Point} from './model.ts';
import {metrics} from './engine.ts';
import type {Simulation} from './engine.ts';
export const PERSON_HEIGHT=1.75;
export const DOOR_HEIGHT=2.10;
export const WALL_HEIGHT=2.80;
type Vec=[number,number,number];
interface Face {points:Vec[];color:string;stroke:string}
export function createViewer(canvas:HTMLCanvasElement,onSelect:(id:string)=>void){
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas 2D no disponible');
 const c=ctx;let yaw=-.62,elevation=.73,zoom=1,view:'perspective'|'plan'='perspective',width=800,height=560,scene:Scene,sim:Simulation,selected='hall',lastPointer:{x:number;y:number;ox:number;oy:number}|null=null;
 let layers={walls:true,furniture:true,routes:true,agents:true,labels:true,heat:false};
 let hits:{id:string;points:Point[]}[]=[];
 function project(v:Vec){const dx=v[0]-9,dz=v[2]-1;const a=dx*Math.cos(yaw)-dz*Math.sin(yaw),b=dx*Math.sin(yaw)+dz*Math.cos(yaw);const scale=Math.min(width/24,height/19)*zoom;return{x:width/2+a*scale,y:height*.55+(b*Math.sin(elevation)-v[1]*Math.cos(elevation))*scale,depth:b*Math.cos(elevation)+v[1]*Math.sin(elevation)}}
 function path(points:Vec[]){c.beginPath();points.forEach((v,i)=>{const p=project(v);if(i)c.lineTo(p.x,p.y);else c.moveTo(p.x,p.y)});c.closePath()}
 function stroke(a:Vec,b:Vec,color:string,line=1){const p=project(a),q=project(b);c.beginPath();c.moveTo(p.x,p.y);c.lineTo(q.x,q.y);c.strokeStyle=color;c.lineWidth=line;c.stroke()}
 function text(point:Vec,label:string,color='#c8e0df',size=11){const p=project(point);c.font=`${size}px system-ui`;c.textAlign='center';c.fillStyle=color;c.fillText(label,p.x,p.y)}
 function box(faces:Face[],x:number,z:number,w:number,d:number,h:number,color:string,base=0){const a:Vec=[x,base,z],b:Vec=[x+w,base,z],cc:Vec=[x+w,base,z+d],dd:Vec=[x,base,z+d],e:Vec=[x,base+h,z],f:Vec=[x+w,base+h,z],g:Vec=[x+w,base+h,z+d],hh:Vec=[x,base+h,z+d];for(const points of [[a,b,f,e],[b,cc,g,f],[cc,dd,hh,g],[dd,a,e,hh],[e,f,g,hh]])faces.push({points,color,stroke:'#071c244a'})}
 function wallEdge(faces:Face[],a:Point,b:Point,room:string){
  const horizontal=a[1]===b[1],start=horizontal?a[0]:a[1],end=horizontal?b[0]:b[1];
  const doors=scene.doors.filter(d=>(d.a===room||d.b===room)&&Math.abs((horizontal?d.at[1]:d.at[0])-(horizontal?a[1]:a[0]))<.001).sort((u,v)=>(horizontal?u.at[0]-v.at[0]:u.at[1]-v.at[1]));
  let from=start;const segment=(lo:number,hi:number,h=WALL_HEIGHT,base=0)=>{if(hi<=lo)return;if(horizontal)box(faces,lo,a[1]-.06,hi-lo,.12,h,'#506d78',base);else box(faces,a[0]-.06,lo,.12,hi-lo,h,'#506d78',base)};
  for(const door of doors){const at=horizontal?door.at[0]:door.at[1],lo=at-door.width/2,hi=at+door.width/2;if(lo<start||hi>end)continue;segment(from,lo);segment(lo,hi,WALL_HEIGHT-DOOR_HEIGHT,DOOR_HEIGHT);from=hi;}
  segment(from,end);
 }
 function human(faces:Face[],x:number,z:number,phase:string,t:number,color:string){
  const stride=phase==='walking'?Math.sin(t*8)*.10:0;
  // Feet-to-crown = 0.80 + 0.60 + 0.10 + 0.25 = 1.75 m.
  box(faces,x-.17,z-.10+stride,.13,.20,.8,'#243c54');box(faces,x+.04,z-.10-stride,.13,.20,.8,'#243c54');
  box(faces,x-.21,z-.13,.42,.26,.60,color,.80);box(faces,x-.055,z-.055,.11,.11,.10,'#d9b39c',1.40);
  box(faces,x-.125,z-.125,.25,.25,.25,'#d9b39c',1.50);
  box(faces,x-.31,z-.09-stride,.09,.18,.53,color,.88);box(faces,x+.22,z-.09+stride,.09,.18,.53,color,.88);
 }
 function draw(){if(!scene||!sim)return;const rect=canvas.getBoundingClientRect();width=Math.max(300,rect.width);height=Math.max(300,rect.height);const ratio=Math.min(devicePixelRatio||1,2);if(canvas.width!==Math.round(width*ratio)||canvas.height!==Math.round(height*ratio)){canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio)}c.setTransform(ratio,0,0,ratio,0,0);c.clearRect(0,0,width,height);c.fillStyle='#0a1a25';c.fillRect(0,0,width,height);
  for(let x=-2;x<=20;x++)stroke([x,-.08,-7],[x,-.08,9],'#203641',.7);for(let z=-7;z<=9;z++)stroke([-2,-.08,z],[20,-.08,z],'#203641',.7);
  const faces:Face[]=[];hits=[];const ms=metrics(sim);
  for(const room of scene.rooms){const points:Vec[]=[[room.x,0,room.z],[room.x+room.width,0,room.z],[room.x+room.width,0,room.z+room.depth],[room.x,0,room.z+room.depth]];const m=ms.find(v=>v.id===room.id)!;const color=layers.heat?(m.occupancy/room.capacity>.75?'#b87754':m.occupancy/room.capacity>.35?'#817658':'#356d6c'):(room.id===selected?'#4d8583':'#284951');path(points);c.fillStyle=color;c.fill();c.lineWidth=room.id===selected?2:1;c.strokeStyle=room.id===selected?'#a0e6d6':'#6b9498';c.stroke();hits.push({id:room.id,points:points.map(v=>{const p=project(v);return[p.x,p.y]})});
   if(layers.walls&&view!=='plan'){wallEdge(faces,[room.x,room.z],[room.x+room.width,room.z],room.id);wallEdge(faces,[room.x,room.z+room.depth],[room.x+room.width,room.z+room.depth],room.id);wallEdge(faces,[room.x,room.z],[room.x,room.z+room.depth],room.id);wallEdge(faces,[room.x+room.width,room.z],[room.x+room.width,room.z+room.depth],room.id)}
  }
  if(layers.routes){c.setLineDash([4,5]);for(const d of scene.doors){const a=center(scene.rooms.find(r=>r.id===d.a)!),b=center(scene.rooms.find(r=>r.id===d.b)!);stroke([a[0],.03,a[1]],[d.at[0],.03,d.at[1]],'#78bcab',1.5);stroke([b[0],.03,b[1]],[d.at[0],.03,d.at[1]],'#78bcab',1.5)}c.setLineDash([])}
  for(const d of scene.doors){stroke([d.at[0]-d.width/2,.04,d.at[1]],[d.at[0]+d.width/2,.04,d.at[1]],'#eed494',3)}
  if(layers.furniture)for(const f of scene.furniture)box(faces,f.x,f.z,f.width,f.depth,f.id==='seat'||f.id==='bench'?.45:.75,'#bfa988');
  if(layers.agents)for(const agent of sim.agents){if(agent.phase==='pending'||agent.phase==='finished')continue;human(faces,agent.position[0],agent.position[1],agent.phase,sim.time+agent.id,agent.phase==='waiting'?'#f1bc70':'#81c9bf')}
  human(faces,19,4,'dwell',0,'#dce7df');
  faces.sort((a,b)=>a.points.reduce((n,v)=>n+project(v).depth,0)/a.points.length-b.points.reduce((n,v)=>n+project(v).depth,0)/b.points.length);
  for(const f of faces){path(f.points);c.fillStyle=f.color;c.fill();c.strokeStyle=f.stroke;c.lineWidth=.6;c.stroke()}
  if(layers.labels)for(const r of scene.rooms){const p=center(r);text([p[0],view==='plan'?.05:WALL_HEIGHT+.12,p[1]],r.name,r.id===selected?'#eaffeb':'#bfd3dc',11)}
  stroke([19.8,0,4],[19.8,PERSON_HEIGHT,4],'#e8d19c',2);stroke([19.55,0,4],[20.05,0,4],'#e8d19c');stroke([19.55,PERSON_HEIGHT,4],[20.05,PERSON_HEIGHT,4],'#e8d19c');text([20.3,PERSON_HEIGHT+.3,4],'1,75 m','#eed494',12);
  stroke([0,0,8.2],[18,0,8.2],'#7b9fae');text([9,0,8.8],'18,00 m · cuadrícula 1 × 1 m','#91b0bd',11);
 }
 function inside(x:number,y:number,pts:Point[]){let result=false;for(let i=0,j=pts.length-1;i<pts.length;j=i++){const [xi,yi]=pts[i],[xj,yj]=pts[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)result=!result}return result}
 canvas.addEventListener('pointerdown',e=>{lastPointer={x:e.clientX,y:e.clientY,ox:e.clientX,oy:e.clientY};canvas.setPointerCapture(e.pointerId)});
 canvas.addEventListener('pointermove',e=>{if(!lastPointer||view==='plan')return;yaw+=(e.clientX-lastPointer.x)*.008;elevation=Math.max(.2,Math.min(1.45,elevation-(e.clientY-lastPointer.y)*.007));lastPointer.x=e.clientX;lastPointer.y=e.clientY;draw()});
 canvas.addEventListener('pointerup',e=>{if(!lastPointer)return;if(Math.hypot(e.clientX-lastPointer.ox,e.clientY-lastPointer.oy)<6){const rect=canvas.getBoundingClientRect();const hit=hits.findLast(h=>inside(e.clientX-rect.left,e.clientY-rect.top,h.points));if(hit)onSelect(hit.id)}lastPointer=null});canvas.addEventListener('pointercancel',()=>lastPointer=null);
 canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(.55,Math.min(2.5,zoom*(e.deltaY>0?.92:1.08)));draw()},{passive:false});
 const ro=new ResizeObserver(draw);ro.observe(canvas);
 return{update(s:Scene,state:Simulation,id:string){scene=s;sim=state;selected=id;draw()},layer(name:keyof typeof layers,value:boolean){layers[name]=value;draw()},camera(mode:'perspective'|'plan'){view=mode;yaw=mode==='plan'?0:-.62;elevation=mode==='plan'?Math.PI/2:.73;zoom=1;draw()},dispose(){ro.disconnect()},render:draw};
}
