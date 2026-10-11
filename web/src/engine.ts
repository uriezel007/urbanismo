import {center,area} from './model.ts';
import type {Scene,Parameters,Point} from './model.ts';
export interface Agent {id:number;room:string;position:Point;path:string[];destination:string;phase:'pending'|'walking'|'waiting'|'dwell'|'finished';remaining:number;wait:number;distance:number;returning:boolean}
export interface Simulation {time:number;tick:number;agents:Agent[];doorNext:Record<string,number>;params:Parameters;scene:Scene;peak:Record<string,number>}
export function route(scene:Scene,start:string,end:string):string[]{
 const q=[[start]],seen=new Set([start]);while(q.length){const path=q.shift()!;const tail=path.at(-1)!;if(tail===end)return path.slice(1);for(const d of scene.doors){const n=d.a===tail?d.b:d.b===tail?d.a:null;if(n&&!seen.has(n)){seen.add(n);q.push([...path,n])}}}throw Error('No hay ruta entre ambientes');
}
function rng(seed:number){let x=seed>>>0;return()=>{x=(Math.imul(1664525,x)+1013904223)>>>0;return x/4294967296}}
export function createSimulation(scene:Scene,params:Parameters):Simulation{
 for(const [k,v] of Object.entries(params))if(!Number.isFinite(v))throw Error('Parámetro no finito: '+k);
 if(!Number.isInteger(params.seed)||params.seed<0||params.seed>4294967295||!Number.isInteger(params.population)||params.population<1||params.population>200||params.speed<.1||params.speed>3||params.arrivalInterval<.1||params.arrivalInterval>60||params.dwell<0||params.dwell>600||params.orientationDelay<0||params.orientationDelay>60||params.environmentalMultiplier<.2||params.environmentalMultiplier>2)throw Error('Parámetros fuera de rango');
 if(scene.provenance!=='hypothetical')throw Error('Este motor solo acepta geometría hipotética');
 if(scene.rooms.length<2||new Set(scene.rooms.map(r=>r.id)).size!==scene.rooms.length)throw Error('Ambientes inválidos');
 for(const r of scene.rooms)if(![r.x,r.z,r.width,r.depth,r.capacity].every(Number.isFinite)||r.width<=0||r.depth<=0||!Number.isInteger(r.capacity)||r.capacity<1)throw Error('Ambiente fuera de rango');
 const entry=scene.rooms.find(r=>r.id===scene.entry);if(!entry)throw Error('Entrada ausente');
 for(const d of scene.doors)if(!scene.rooms.some(r=>r.id===d.a)||!scene.rooms.some(r=>r.id===d.b)||!Number.isFinite(d.width)||d.width<.6)throw Error('Puerta inválida');
 const random=rng(params.seed),dest=scene.rooms.filter(r=>r.id!==scene.entry);
 dest.forEach(r=>route(scene,scene.entry,r.id));
 return{scene:structuredClone(scene),params:{...params},time:0,tick:0,doorNext:{},peak:{},agents:Array.from({length:params.population},(_,id)=>{const target=dest[Math.floor(random()*dest.length)].id;return{id,room:entry.id,position:center(entry),destination:target,path:route(scene,entry.id,target),phase:'pending',remaining:id*params.arrivalInterval,wait:0,distance:0,returning:false}})};
}
// Fixed 100 ms ticks. Paths join room centres through explicit portals; no clinical states.
export function step(s:Simulation):void{
 const dt=.1;s.tick++;s.time=s.tick*dt;
 const count:Record<string,number>={};for(const a of s.agents)if(a.phase!=='pending'&&a.phase!=='finished')count[a.room]=(count[a.room]||0)+1;
 for(const a of s.agents){
  if(a.phase==='finished')continue;
  if(a.phase==='pending'){if(s.time<a.remaining)continue;const entry=s.scene.rooms.find(r=>r.id===a.room)!;if((count[a.room]||0)>=entry.capacity){a.wait+=dt;continue}a.phase='walking';a.remaining=s.params.orientationDelay;count[a.room]=(count[a.room]||0)+1;}
  if(a.phase==='dwell'){a.remaining-=dt;if(a.remaining>0)continue;a.returning=true;a.path=route(s.scene,a.room,s.scene.entry);a.phase='walking';a.remaining=s.params.orientationDelay;}
  if(a.remaining>0){a.remaining=Math.max(0,a.remaining-dt);continue}
  const next=a.path[0],room=s.scene.rooms.find(r=>r.id===a.room)!;
  const door=next?s.scene.doors.find(d=>(d.a===a.room&&d.b===next)||(d.b===a.room&&d.a===next)):undefined;
  const target=door?door.at:center(room),dx=target[0]-a.position[0],dz=target[1]-a.position[1],length=Math.hypot(dx,dz),travel=Math.min(length,s.params.speed*s.params.environmentalMultiplier*dt);
  if(length>1e-9){a.position=[a.position[0]+dx/length*travel,a.position[1]+dz/length*travel];a.distance+=travel;a.phase='walking';if(travel<length)continue;}
  if(door&&next){const r=s.scene.rooms.find(r=>r.id===next)!;
   if((count[next]||0)>=r.capacity||(s.doorNext[door.id]||0)>s.time){a.phase='waiting';a.wait+=dt;continue;}
   s.doorNext[door.id]=s.time+1/(door.width*1.3);count[a.room]--;count[next]=(count[next]||0)+1;a.room=next;a.path.shift();a.phase='walking';a.remaining=s.params.orientationDelay;
  }else if(a.returning){a.phase='finished';count[a.room]--;}else{a.phase='dwell';a.remaining=s.params.dwell;}
 }
 for(const r of s.scene.rooms)s.peak[r.id]=Math.max(s.peak[r.id]||0,count[r.id]||0);
}
export function metrics(s:Simulation){return s.scene.rooms.map(r=>{const people=s.agents.filter(a=>a.room===r.id&&a.phase!=='pending'&&a.phase!=='finished');return{id:r.id,occupancy:people.length,capacity:r.capacity,density:people.length/area(r),queue:people.filter(a=>a.phase==='waiting').length,peak:s.peak[r.id]||0}})}
export function result(s:Simulation){return{kind:'simulated' as const,engine:'phei-graph-1.0.0',time:s.time,seed:s.params.seed,parameters:s.params,scene:s.scene,metrics:metrics(s),completed:s.agents.filter(a=>a.phase==='finished').length,totalWait:s.agents.reduce((v,a)=>v+a.wait,0),distance:s.agents.reduce((v,a)=>v+a.distance,0),limitations:['Geometría hipotética en metros; no BIM ni GIS calibrado.','Modelo por portales, sin colisiones interpersonales ni evitación de mobiliario.','Capacidades y caudal de puertas son hipótesis, no aforo reglamentario.','No representa emociones, resultados clínicos ni evacuación oficial.']}}
