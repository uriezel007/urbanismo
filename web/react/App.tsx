import React,{Component,useEffect,useMemo,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Canvas} from '@react-three/fiber';
import {OrbitControls,Grid,Html} from '@react-three/drei';
import {demo,defaults,center} from '../src/model.ts';
import type {Scene,Parameters,Room} from '../src/model.ts';
import {createSimulation,step,metrics,result} from '../src/engine.ts';
import type {Simulation,Agent} from '../src/engine.ts';
import {PERSON_HEIGHT,DOOR_HEIGHT,WALL_HEIGHT} from '../src/viewer.ts';
import './webgl.css';

type ViewMode='perspective'|'plan';
type Handoff={schema:string;savedAt:number;projectName:string;scene:Scene;parameters:Parameters};
const KEY='PHEI_WEBGL_SCENE_V1';
const isFiniteNumber=(v:unknown)=>typeof v==='number'&&Number.isFinite(v);
function loadHandoff():{scene:Scene;params:Parameters;title:string;connected:boolean}{
 const fallback={scene:structuredClone(demo),params:{...defaults},title:'Centro de atención · demostración',connected:false};
 try{
   const stored=sessionStorage.getItem(KEY);
   if(!stored||stored.length>100_000)return fallback;
   const data=JSON.parse(stored) as Handoff;
   if(data.schema!=='phei-webgl-scene-1'||!isFiniteNumber(data.savedAt)||Date.now()-data.savedAt>86400_000||data.savedAt>Date.now()+60_000)return fallback;
   if(!data.scene||!Array.isArray(data.scene.rooms)||data.scene.rooms.length>30||!Array.isArray(data.scene.doors)||data.scene.doors.length>100||!Array.isArray(data.scene.furniture)||data.scene.furniture.length>100)return fallback;
   if(data.scene.unit!=='m'||data.scene.provenance!=='hypothetical'||!data.scene.rooms.every(r=>typeof r.name==='string'&&r.name.length<=100&&[r.x,r.z,r.width,r.depth,r.capacity].every(isFiniteNumber)))return fallback;
   createSimulation(data.scene,data.parameters);
   return {scene:structuredClone(data.scene),params:{...data.parameters},title:String(data.projectName||'Proyecto sin nombre').slice(0,90),connected:true};
 }catch{return fallback}
}
const initial=loadHandoff();
type Object3DShape={position:[number,number,number];size:[number,number,number];color:string};
const Shape=({position,size,color}:Object3DShape)=><mesh position={position} receiveShadow><boxGeometry args={size}/><meshStandardMaterial color={color} roughness={.76}/></mesh>;

function AgentFigure({agent,time}:{agent:Agent;time:number}){
 const moving=agent.phase==='walking';
 const swing=moving?Math.sin(time*8+agent.id)*.11:0;
 const color=agent.phase==='waiting'?'#e4b37b':'#8cd5c4';
 return <group position={[agent.position[0],0,agent.position[1]]}>
  <Shape position={[-.1,.4,swing]} size={[.14,.8,.19]} color="#294852"/>
  <Shape position={[.1,.4,-swing]} size={[.14,.8,.19]} color="#294852"/>
  <Shape position={[0,1.10,0]} size={[.4,.6,.26]} color={color}/>
  <Shape position={[-.25,1.12,-swing]} size={[.10,.49,.17]} color={color}/>
  <Shape position={[.25,1.12,swing]} size={[.10,.49,.17]} color={color}/>
  <Shape position={[0,1.45,0]} size={[.11,.10,.11]} color="#c99c83"/>
  <mesh position={[0,PERSON_HEIGHT-.125,0]}><sphereGeometry args={[.125,12,10]}/><meshStandardMaterial color="#e2bda2"/></mesh>
 </group>;
}
function createWalls(scene:Scene){
 const segments:Object3DShape[]=[];
 const visited=new Set<string>();
 function addWall(a:[number,number],b:[number,number],room:Room){
  const horiz=Math.abs(a[1]-b[1])<.00001;
  const fixed=horiz?a[1]:a[0],start=Math.min(horiz?a[0]:a[1],horiz?b[0]:b[1]),end=Math.max(horiz?a[0]:a[1],horiz?b[0]:b[1]);
  const wallKey=(horiz?'h':'v')+':'+fixed.toFixed(4)+':'+start.toFixed(4)+':'+end.toFixed(4);
  if(visited.has(wallKey))return;visited.add(wallKey);
  const doors=scene.doors.filter(d=>(d.a===room.id||d.b===room.id)&&Math.abs((horiz?d.at[1]:d.at[0])-fixed)<.00001).map(d=>({start:(horiz?d.at[0]:d.at[1])-d.width/2,end:(horiz?d.at[0]:d.at[1])+d.width/2})).filter(d=>d.start>=start&&d.end<=end).sort((a,b)=>a.start-b.start);
  function block(lo:number,hi:number,y=0,height=WALL_HEIGHT){
   if(hi-lo<.001)return;
   const middle=(lo+hi)/2;
   segments.push({position:horiz?[middle,y+height/2,fixed]:[fixed,y+height/2,middle],size:horiz?[hi-lo,height,.12]:[.12,height,hi-lo],color:'#64818a'});
  }
  let from=start;
  for(const d of doors){if(d.start<from)continue;block(from,d.start);block(d.start,d.end,DOOR_HEIGHT,WALL_HEIGHT-DOOR_HEIGHT);from=d.end;}
  block(from,end);
 }
 for(const room of scene.rooms){
  const {x,z,width:w,depth:d}=room;
  addWall([x,z],[x+w,z],room);
  addWall([x,z+d],[x+w,z+d],room);
  addWall([x,z],[x,z+d],room);
  addWall([x+w,z],[x+w,z+d],room);
 }
 return segments;
}
class WebGLBoundary extends Component<{children:React.ReactNode},{error:boolean}>{
 state={error:false};
 static getDerivedStateFromError(){return{error:true}};
 render(){return this.state.error?<div className="webgl-error" role="alert">No fue posible iniciar el visor WebGL en este dispositivo. <a href="/">Abrir el visor compatible de PHEI</a>.</div>:this.props.children}
}
function exportRun(sim:Simulation){
 const data={...result(sim),exportedAt:new Date().toISOString(),source:'PHEI React WebGL: motor compartido',scientificValidation:false};
 const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download='PHEI_webgl_corrida_sintetica.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
}

function WebGLApp(){
 const [scene]=useState(()=>initial.scene);
 const [params,setParams]=useState(()=>initial.params);
 const [sim,setSim]=useState<Simulation>(()=>createSimulation(initial.scene,initial.params));
 const [running,setRunning]=useState(false);
 const [selected,setSelected]=useState<string>(scene.entry);
 const [walls,setWalls]=useState(true),[heat,setHeat]=useState(false),[showAgents,setShowAgents]=useState(true);
 const [view,setView]=useState<ViewMode>('perspective');
 const [population,setPopulation]=useState(String(initial.params.population));
 const [playback,setPlayback]=useState(1);
 const [message,setMessage]=useState('');
 const segments=useMemo(()=>createWalls(scene),[scene]);
 const values=metrics(sim);
 const selectedRoom=scene.rooms.find(r=>r.id===selected) || scene.rooms[0];
 const selectedMetrics=values.find(v=>v.id===selectedRoom.id)!;
 const results=result(sim);
 const live=sim.agents.filter(a=>a.phase!=='pending'&&a.phase!=='finished');
 const waiting=live.filter(a=>a.phase==='waiting').length;
 const peak=Math.max(0,...values.map(r=>r.peak));
 const active=values.reduce((sum,r)=>sum+r.occupancy,0);
 useEffect(()=>{
  if(!running)return;
  const timer=window.setInterval(()=>setSim(previous=>{
   if(previous.time>=3600||previous.agents.every(a=>a.phase==='finished'))return previous;
   const next=structuredClone(previous);
   for(let i=0;i<playback;i++)step(next);
   return next;
  }),100);
  return()=>window.clearInterval(timer);
 },[running,playback]);
 useEffect(()=>{
  if(sim.time>=3600||sim.agents.every(a=>a.phase==='finished'))setRunning(false);
 },[sim]);
 function reset(next:Parameters=params){
  setRunning(false);setSim(createSimulation(scene,next));
 }
 function applyPopulation(){
  const n=Number(population);
  if(!Number.isInteger(n)||n<1||n>200){setMessage('Elige una población entera entre 1 y 200.');return;}
  const next={...params,population:n};
  setParams(next);reset(next);
  setMessage('Población hipotética actualizada. Se inició una nueva corrida.');
 }
 function chooseRoom(id:string){setSelected(id)}
 return <div className="phei-gl">
  <header className="phei-gl-header">
   <div className="phei-gl-brand"><span className="phei-gl-logo">P·</span><div><strong>PHEI DIGITAL TWIN</strong><small>PRESER · HUMAN ENVIRONMENT INTELLIGENCE</small></div></div>
   <a href="/" className="phei-gl-return">← Volver al estudio y evaluaciones</a>
  </header>
  <main className="phei-gl-main">
   <div className="phei-gl-intro">
    <div><span className="phei-gl-eyebrow">EXPLORADOR ESPACIAL · WEBGL</span><h1>El espacio a escala humana.</h1><p>{initial.connected?'Escena transferida desde tu proyecto de PHEI.':'Escena de demostración reproducible.'} Modelo hipotético en metros con agentes sintéticos.</p></div>
    <div className="phei-gl-ident"><small>PROYECTO</small><strong>{initial.title}</strong><span>Sin validación normativa o clínica</span></div>
   </div>
   <div className="phei-gl-kpis" aria-label="Métricas de la simulación">
    <div><small>Personas activas</small><strong data-testid="active-agents">{active}</strong><span>Agentes sintéticos</span></div>
    <div><small>Esperando</small><strong data-testid="waiting-agents">{waiting}</strong><span>En puertas o espacios</span></div>
    <div><small>Finalizaron</small><strong data-testid="completed-agents">{results.completed}</strong><span>De {sim.params.population} personas</span></div>
    <div><small>Tiempo simulado</small><strong>{sim.time.toFixed(1)} s</strong><span>Motor determinista 0,1 s</span></div>
   </div>
   <div className="phei-gl-layout">
    <section className="phei-gl-viewer" aria-label="Visor de espacios tridimensionales">
     <div className="phei-gl-viewhead"><div><b>PLANTA 01 · ESCENA INTERACTIVA</b><small>Arrastra para girar · Pellizca para ampliar</small></div><div className="phei-gl-segment"><button type="button" className={view==='perspective'?'active':''} aria-pressed={view==='perspective'} onClick={()=>setView('perspective')}>Perspectiva</button><button type="button" className={view==='plan'?'active':''} aria-pressed={view==='plan'} onClick={()=>setView('plan')}>Planta</button></div></div>
     <div className="phei-gl-stage" data-testid="webgl-stage">
      <WebGLBoundary><Canvas key={view} dpr={[1,1.6]} gl={{antialias:true,powerPreference:'default'}} camera={{position:view==='plan'?[9,29,1]:[25,23,27],fov:44,near:.1,far:220}} fallback={<p className="webgl-error">WebGL no disponible en este navegador. <a href="/">Abrir visor compatible</a></p>}>
       <color attach="background" args={['#10252a']}/><ambientLight intensity={1.25}/>
       <directionalLight position={[2,18,7]} intensity={1.8}/>
       <Grid position={[9,-.07,1]} args={[25,19]} cellSize={1} sectionSize={5} cellColor="#43615e" sectionColor="#78978c" infiniteGrid={false}/>
       {scene.rooms.map(room=>{const p=center(room);const m=values.find(v=>v.id===room.id)!;const density=m.occupancy/Math.max(1,room.width*room.depth);const color=heat?(density>.7?'#b56d53':density>.25?'#95774b':'#447f72'):room.id===selected?'#5c9e91':'#42645f';return <group key={room.id}>
        <mesh position={[p[0],-.025,p[1]]} receiveShadow onClick={e=>{e.stopPropagation();chooseRoom(room.id)}}><boxGeometry args={[room.width,.06,room.depth]}/><meshStandardMaterial color={color} roughness={.9}/></mesh>
        <Html position={[p[0],WALL_HEIGHT+.3,p[1]]} center style={{pointerEvents:'none',whiteSpace:'nowrap'}}><span className="phei-gl-label">{room.name}</span></Html>
       </group>})}
       {walls&&view!=='plan'&&segments.map((s,i)=><Shape key={i} {...s}/>)}
       {scene.furniture.map((f,i)=><Shape key={i} position={[f.x+f.width/2,.375,f.z+f.depth/2]} size={[f.width,.75,f.depth]} color="#bba889"/>)}
       {showAgents&&live.map(a=><AgentFigure key={a.id} agent={a} time={sim.time}/>)}
       <mesh position={[19,PERSON_HEIGHT/2,4]}><boxGeometry args={[.10,PERSON_HEIGHT,.10]}/><meshStandardMaterial color="#ebd4a5"/></mesh>
       <Html position={[19,2.45,4]} center style={{pointerEvents:'none'}}><span className="phei-gl-label">Referencia 1,75 m</span></Html>
       <OrbitControls target={[9,0,1]} minDistance={5} maxDistance={72} enablePan={view!=='plan'} enableRotate={view!=='plan'} maxPolarAngle={Math.PI/2.05}/>
      </Canvas></WebGLBoundary>
      <span className="phei-gl-scenenote">GEOMETRÍA HIPOTÉTICA · SIN BIM</span>
     </div>
     <div className="phei-gl-controls" aria-label="Control de la simulación">
      <button type="button" className="phei-gl-primary" onClick={()=>setRunning(v=>!v)}>{running?'Pausar':'Iniciar'}</button>
      <button type="button" onClick={()=>reset()}>Reiniciar</button>
      <label>Velocidad<select aria-label="Velocidad de reproducción" value={playback} onChange={e=>setPlayback(Number(e.target.value))}><option value={1}>1×</option><option value={2}>2×</option><option value={4}>4×</option></select></label>
      <button type="button" onClick={()=>exportRun(sim)}>Exportar corrida ↓</button>
     </div>
     <div className="phei-gl-roomlist" aria-label="Ambientes seleccionables">{scene.rooms.map(r=><button type="button" key={r.id} className={selected===r.id?'active':''} aria-pressed={selected===r.id} onClick={()=>chooseRoom(r.id)}>{r.name}</button>)}</div>
    </section>
    <aside className="phei-gl-inspector">
     <span className="phei-gl-eyebrow">INSPECTOR DEL AMBIENTE</span>
     <h2>{selectedRoom.name}</h2>
     <p>{selectedRoom.width.toFixed(2)} × {selectedRoom.depth.toFixed(2)} m · área bruta {(selectedRoom.width*selectedRoom.depth).toFixed(1)} m²</p>
     <div className="phei-gl-inspector-kpis"><div><small>Ocupación</small><strong>{selectedMetrics.occupancy} / {selectedRoom.capacity}</strong></div><div><small>Densidad</small><strong>{selectedMetrics.density.toFixed(2)}</strong><span>personas/m²</span></div><div><small>Pico</small><strong>{selectedMetrics.peak}</strong></div><div><small>Cola</small><strong>{selectedMetrics.queue}</strong></div></div>
     <h3>Capas de visualización</h3>
     <label className="phei-gl-check"><span>Muros / cerramientos</span><input type="checkbox" checked={walls} onChange={e=>setWalls(e.target.checked)}/></label>
     <label className="phei-gl-check"><span>Ocupación por ambiente</span><input type="checkbox" checked={heat} onChange={e=>setHeat(e.target.checked)}/></label>
     <label className="phei-gl-check"><span>Personas sintéticas</span><input type="checkbox" checked={showAgents} onChange={e=>setShowAgents(e.target.checked)}/></label>
     <h3>Parámetros</h3>
     <label className="phei-gl-poplabel">Personas<input aria-label="Número de personas" type="number" min={1} max={200} value={population} onChange={e=>setPopulation(e.target.value)}/></label>
     <button className="phei-gl-apply" type="button" onClick={applyPopulation}>Aplicar y reiniciar</button>
     {message&&<p role="status" className="phei-gl-message">{message}</p>}
     <p className="phei-gl-warning">Este escenario no permite predecir el estrés, la ansiedad, el llanto ni calcular evacuaciones o aforos reglamentarios.</p>
    </aside>
   </div>
   <div className="phei-gl-limits"><strong>Qué representa y qué no representa</strong><span>Todos los recorridos utilizan el mismo motor determinista del Digital Twin. El WebGL es una vista complementaria de la geometría hipotética; la evidencia, calibración e historial continúan en la aplicación principal. No se han calibrado colisiones, perfiles humanos, iluminación, seguridad ni rendimiento en un dispositivo físico.</span></div>
  </main>
 </div>;
}
createRoot(document.getElementById('root')!).render(<WebGLBoundary><WebGLApp/></WebGLBoundary>);