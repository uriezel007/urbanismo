/* PHEI Studio — módulo experimental de circulación v0.7.
 * No infiere estados psicológicos ni representa distancias medidas del edificio.
 * Este archivo amplía el visor existente, sin alterar expedientes ni mediciones.
 */
(function(){
'use strict';
const runtime=window.PHEI_RUNTIME;
if(!runtime || !runtime.model3d){console.warn('PHEI: visor base no disponible; simulador desactivado.');return;}
const root=document.getElementById('model3dMount');
const stage=root?.querySelector('.phei-3d-stage');
const bar=root?.querySelector('.phei-3d-toolbar');
if(!stage || !bar)return;

const css=document.createElement('style');
css.textContent='.phei-sim-panel{background:#14292b;border-top:1px solid #43635b;padding:17px 19px;color:#e5eee7}.phei-sim-head{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:12px}.phei-sim-head b{font-size:13px}.phei-sim-sub{font-size:10px;color:#abc2b8;margin-top:3px}.phei-sim-pill{font-size:9px;font-weight:800;letter-spacing:.7px;padding:5px 8px;background:#57412a;color:#ffe4aa;border-radius:20px}.phei-sim-inputs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;align-items:end}.phei-sim-inputs label{display:grid;gap:6px;font-size:10px;font-weight:700;color:#a9c2b7}.phei-sim-inputs input,.phei-sim-inputs select{min-width:0;width:100%;border:1px solid #47625b;border-radius:7px;background:#102324;color:#eff4ee;padding:9px 8px;font-size:12px}.phei-sim-actions{display:flex;gap:7px;flex-wrap:wrap;margin:11px 0}.phei-sim-actions button{border:1px solid #648477;border-radius:8px;padding:9px 12px;background:#28483d;color:#e3f2e7;font-weight:700;font-size:11px}.phei-sim-actions button:first-child{background:#bad5a2;color:#1d392d}.phei-sim-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.phei-sim-metrics div{background:#102527;border:1px solid #35514c;border-radius:8px;padding:10px}.phei-sim-metrics small{display:block;font-size:10px;color:#a3b6af}.phei-sim-metrics strong{display:block;font-size:18px;margin-top:4px}.phei-sim-note{margin:10px 0 0;color:#a5bab1;font-size:10px;line-height:1.5}.phei-sim-result{font-size:11px;line-height:1.6;padding:12px;border:1px solid #597061;background:#1a342d;border-radius:8px;margin-top:10px}.phei-sim-overlay{position:absolute;inset:0;z-index:3;pointer-events:none}.phei-sim-overlay[hidden]{display:none}@media(max-width:750px){.phei-sim-inputs{grid-template-columns:repeat(2,minmax(0,1fr))}.phei-sim-metrics{grid-template-columns:repeat(3,minmax(0,1fr))}}';
document.head.appendChild(css);
const panel=document.createElement('section');
panel.className='phei-sim-panel';
panel.setAttribute('aria-label','Simulación de circulación sintética');
panel.innerHTML='<div class="phei-sim-head"><div><b>◉ Simulación de circulación · sobre modelo existente</b><div class="phei-sim-sub">Agentes sintéticos · mismos controles de cámara y capas</div></div><span class="phei-sim-pill">EXPERIMENTAL · SIN CALIBRACIÓN</span></div>'+
'<div class="phei-sim-inputs"><label>Escenario<select data-sim="scenario"><option value="calma">Calma / baja demanda</option><option value="flujo" selected>Flujo mixto</option><option value="congestion">Alta ocupación</option><option value="evacuacion">Salida dirigida (hipotética)</option></select></label>'+
'<label>Agentes sintéticos<input data-sim="count" type="number" min="8" max="150" step="1" value="72"></label>'+
'<label>Ancho hipotético (m)<input data-sim="width" type="number" min="1" max="4" step="0.1" value="1.4"></label>'+
'<label>Semilla reproducible<input data-sim="seed" type="number" min="1" max="999999" step="1" value="42"></label></div>'+
'<div class="phei-sim-actions"><button data-sim-action="run" type="button">▶ Iniciar</button><button data-sim-action="reset" type="button">↺ Reiniciar</button><button data-sim-action="compare" type="button">◫ Comparar 1.4 m vs 3.0 m</button><button data-sim-action="csv" type="button">↓ Exportar resultados CSV</button></div>'+
'<div class="phei-sim-metrics"><div><small>Tiempo simulado</small><strong data-sim-metric="time">0.0 s</strong></div><div><small>Agentes que finalizaron</small><strong data-sim-metric="completed">0 / 72</strong></div><div><small>Máximo simultáneo en cuello</small><strong data-sim-metric="peak">0 agentes</strong></div></div>'+
'<div class="phei-sim-result" data-sim-result aria-live="polite">Presiona Iniciar. Los agentes circularán sobre el corredor ilustrativo del edificio. Los resultados son propiedades del algoritmo, no mediciones de personas.</div>'+
'<p class="phei-sim-note">Precaución metodológica: el ancho es un parámetro hipotético, no medido en el plano. La geometría, la velocidad, el comportamiento y la evacuación NO están validados. No usar para seguridad de ocupantes, evacuación real ni inferencia de estrés o emociones.</p>';
bar.insertAdjacentElement('afterend',panel);
const overlay=document.createElement('canvas');overlay.className='phei-sim-overlay';overlay.setAttribute('aria-hidden','true');stage.appendChild(overlay);
const ctx=overlay.getContext('2d');if(!ctx)return;
const query=(selector)=>panel.querySelector(selector);
const metric=(name)=>query('[data-sim-metric="'+name+'"]');
const result=query('[data-sim-result]');
const state={scenario:'flujo',count:72,width:1.4,seed:42,running:false,model:null,comparison:null,lastFrame:0,acc:0};
const horizon=40,dtFixed=0.10;
function random(seed){let t=seed>>>0;return function(){t+=0x6D2B79F5;let x=t;x=Math.imul(x^(x>>>15),x|1);x^=x+Math.imul(x^(x>>>7),x|61);return ((x^(x>>>14))>>>0)/4294967296;};}
function parameters(scenario){return ({calma:{opposition:.13,speed:1.02},flujo:{opposition:.36,speed:1.12},congestion:{opposition:.48,speed:.86},evacuacion:{opposition:0,speed:1.37}})[scenario] || {opposition:.36,speed:1.12};}
function initialize(count,width,scenario,seed){
 const rnd=random(seed);const config=parameters(scenario);
 const agents=Array.from({length:count},(_,i)=>{
  const dir=rnd()<config.opposition?-1:1;
  const x=dir===1?115+rnd()*245:885-rnd()*245;
  const target=dir===1?910:90;
  return {id:i,dir,x,startX:x,target,y:318+(rnd()-.5)*Math.min(60,width*16),pace:(22+rnd()*7)*config.speed,finished:false,finishedAt:null,progress:0,load:0};
 });
 return {agents,width,scenario,seed,time:0,completed:0,peak:0,meanLoad:0,frames:0};
}
function advance(m,step){
 if(m.time>=horizon)return;
 const occupied=m.agents.filter(a=>!a.finished && a.x>405 && a.x<610).length;
 const cap=Math.max(3,Math.round(m.width*9));
 const crowd=Math.max(0,(occupied-cap)/cap);
 m.peak=Math.max(m.peak,occupied);
 m.meanLoad+=crowd;m.frames++;
 for(const a of m.agents){
  if(a.finished)continue;
  const inBottleneck=a.x>395 && a.x<620;
  const slow=inBottleneck?1/(1+.65*crowd):1;
  const pace=Math.max(2,a.pace*slow);
  a.x+=a.dir*pace*step;
  a.load=inBottleneck?crowd:0;
  a.progress=Math.min(1,Math.abs(a.x-a.startX)/Math.abs(a.target-a.startX));
  if((a.dir===1 && a.x>=a.target)||(a.dir===-1 && a.x<=a.target)){
   a.finished=true;a.finishedAt=m.time+step;a.x=a.target;m.completed++;
  }
 }
 m.time=Math.min(horizon,m.time+step);
}
function runBatch(count,width,scenario,seed){
 const m=initialize(count,width,scenario,seed);
 for(let i=0;i<Math.ceil(horizon/dtFixed);i++)advance(m,dtFixed);
 const progress=m.agents.reduce((t,a)=>t+a.progress,0)/m.agents.length;
 return {seed,count,width,scenario,completed:m.completed,peak:m.peak,progress,load:m.frames?m.meanLoad/m.frames:0};
}
function readControls(){
 const n=Number(query('[data-sim="count"]').value),w=Number(query('[data-sim="width"]').value),seed=Number(query('[data-sim="seed"]').value);
 state.count=Number.isFinite(n)?Math.round(Math.min(150,Math.max(8,n))):72;
 state.width=Number.isFinite(w)?Math.min(4,Math.max(1,w)):1.4;
 state.seed=Number.isFinite(seed)?Math.round(Math.min(999999,Math.max(1,seed))):42;
 state.scenario=query('[data-sim="scenario"]').value;
 query('[data-sim="count"]').value=state.count;
 query('[data-sim="width"]').value=state.width.toFixed(1);
 query('[data-sim="seed"]').value=state.seed;
}
function reset(){
 state.running=false;readControls();state.model=initialize(state.count,state.width,state.scenario,state.seed);
 state.comparison=null;state.lastFrame=0;state.acc=0;
 query('[data-sim-action="run"]').textContent='▶ Iniciar';
 result.textContent='Escenario preparado. Pulsa Iniciar y compara datos simulados, no emociones ni seguridad real.';
 update();draw();
}
function update(){
 const m=state.model;metric('time').textContent=m.time.toFixed(1)+' s';
 metric('completed').textContent=m.completed+' / '+m.agents.length;
 metric('peak').textContent=m.peak+' agentes';
}
function cameraPoint(px,py,y){
 const rect=stage.getBoundingClientRect();
 const W=rect.width,H=rect.height;
 const m=runtime.model3d.state;
 const scale=Math.min(W/16.5,H/12.1)*m.zoom;
 const X=(px/1000-.5)*13,Z=(py/565-.5)*8.6;
 const c=Math.cos(m.yaw),s=Math.sin(m.yaw),t=m.elevation*Math.PI/180;
 const rx=X*c-Z*s,rz=X*s+Z*c;
 return {x:W/2+rx*scale,y:H*.62+(rz*Math.sin(t)-y*Math.cos(t))*scale,scale};
}
function resize(){
 const rect=stage.getBoundingClientRect();if(rect.width<4||rect.height<4)return;
 const ratio=Math.min(2,window.devicePixelRatio||1);
 const ww=Math.round(rect.width*ratio),hh=Math.round(rect.height*ratio);
 if(overlay.width!==ww||overlay.height!==hh){overlay.width=ww;overlay.height=hh;}
 overlay.style.width=rect.width+'px';overlay.style.height=rect.height+'px';
 ctx.setTransform(ratio,0,0,ratio,0,0);
 draw();
}
function draw(){
 const rect=stage.getBoundingClientRect();
 if(rect.width<4||!overlay.width)return;
 ctx.clearRect(0,0,rect.width,rect.height);
 if(!state.model)return;
 const list=state.model.agents.filter(a=>!a.finished).map(a=>({a,p:cameraPoint(a.x,a.y,.03),mid:cameraPoint(a.x,a.y,.65),head:cameraPoint(a.x,a.y,1.02)})).sort((u,v)=>u.p.y-v.p.y);
 for(const o of list){
  const a=o.a,p=o.p,q=o.mid,h=o.head;
  const crowd=a.load>.6;
  const color=crowd?'#e6a184':a.dir===1?'#c5e2ab':'#88d6cc';
  ctx.fillStyle='rgba(4,20,23,.34)';ctx.beginPath();ctx.ellipse(p.x,p.y,4.8,2.3,0,0,Math.PI*2);ctx.fill();
  ctx.lineCap='round';ctx.strokeStyle=color;ctx.lineWidth=3.8;
  ctx.beginPath();ctx.moveTo(q.x,q.y);ctx.lineTo(p.x,p.y-2);ctx.stroke();
  ctx.strokeStyle='#203c3b';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.moveTo(p.x-2.2,p.y);ctx.lineTo(p.x-3.2,p.y+3.3);ctx.moveTo(p.x+2.2,p.y);ctx.lineTo(p.x+3.2,p.y+3.3);ctx.stroke();
  ctx.fillStyle='#f4c9ab';ctx.beginPath();ctx.arc(h.x,h.y,3.6,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#153733';ctx.lineWidth=1;ctx.stroke();
 }
 ctx.fillStyle='rgba(13,32,34,.8)';ctx.fillRect(10,34,205,26);
 ctx.fillStyle='#d9f5e5';ctx.font='bold 11px system-ui';
 ctx.fillText('AGENTES SINTÉTICOS: '+list.length+' EN MOVIMIENTO',18,51);
}
function tick(now){
 if(!state.running)return;
 if(!state.lastFrame)state.lastFrame=now;
 const elapsed=Math.min(.12,Math.max(0,(now-state.lastFrame)/1000));state.lastFrame=now;
 state.acc+=elapsed;
 while(state.acc>=dtFixed && state.model.time<horizon){
  advance(state.model,dtFixed);state.acc-=dtFixed;
 }
 update();draw();
 if(state.model.time>=horizon){state.running=false;query('[data-sim-action="run"]').textContent='▶ Repetir';result.textContent='Ensayo finalizado (40 segundos simulados). Usa Comparar para ejecutar 12 pares de semillas con idénticas condiciones.';return;}
 requestAnimationFrame(tick);
}
function toggle(){
 if(state.model.time>=horizon)reset();
 state.running=!state.running;state.lastFrame=0;
 query('[data-sim-action="run"]').textContent=state.running?'Ⅱ Pausar':'▶ Continuar';
 if(state.running){result.textContent='Simulación en curso. Los cambios en los parámetros requieren Reiniciar.';requestAnimationFrame(tick);}
}
function compare(){
 state.running=false;query('[data-sim-action="run"]').textContent='▶ Continuar';
 const count=state.count,scenario=state.scenario,seed=state.seed;
 const rows=[];
 for(let i=0;i<12;i++){
  const common=seed+i;
  rows.push({a:runBatch(count,1.4,scenario,common),b:runBatch(count,3,scenario,common)});
 }
 state.comparison=rows;
 const avg=(key,side)=>rows.reduce((total,row)=>total+row[side][key],0)/rows.length;
 const a=avg('completed','a'),b=avg('completed','b');
 const pa=avg('progress','a')*100,pb=avg('progress','b')*100;
 result.textContent='12 pares de experimentos sintéticos, 40 s cada uno. Finalizaciones promedio: 1.4 m = '+a.toFixed(1)+'; 3.0 m = '+b.toFixed(1)+' (diferencia '+(b-a).toFixed(1)+'). Progreso medio: '+pa.toFixed(1)+'% vs '+pb.toFixed(1)+'%. Son indicadores del algoritmo; NO una comparación de desempeño real de edificios. Exporta el CSV para revisar cada semilla.';
}
function exportCsv(){
 if(!state.comparison)compare();
 const header='semilla,escenario,agentes,ancho_hipotetico_m,finalizaciones_40s,ocupacion_pico_cuello,progreso_medio,indice_carga_algoritmica';
 const rows=state.comparison.flatMap(x=>[x.a,x.b]);
 const csv=[header].concat(rows.map(r=>[r.seed,r.scenario,r.count,r.width,r.completed,r.peak,r.progress.toFixed(5),r.load.toFixed(5)].join(','))).join('\n');
 const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='PHEI_experimentos_sinteticos_'+new Date().toISOString().slice(0,10)+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1200);
}
query('[data-sim-action="run"]').addEventListener('click',toggle);
query('[data-sim-action="reset"]').addEventListener('click',reset);
query('[data-sim-action="compare"]').addEventListener('click',compare);
query('[data-sim-action="csv"]').addEventListener('click',exportCsv);
panel.querySelectorAll('input,select').forEach(input=>input.addEventListener('change',reset));
const ro=new ResizeObserver(resize);ro.observe(stage);
stage.querySelector('.phei-3d-canvas')?.addEventListener('pointermove',()=>{if(!state.running)draw();});
stage.querySelector('.phei-3d-canvas')?.addEventListener('wheel',()=>{if(!state.running)requestAnimationFrame(draw);},{passive:true});
root.querySelectorAll('[data-action],[data-control],[data-layer]').forEach(el=>el.addEventListener('click',()=>{if(!state.running)requestAnimationFrame(draw);}));
window.PHEI_SIM={initialize,advance,runBatch,reset,version:'0.7-experimental'};
reset();resize();
})();
