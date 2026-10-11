/* Shared legacy boundary; no dependencies, usable in Node and the browser. */
(function(root){
'use strict';
const fail=message=>{throw new Error(message)};
function validateBackup(obj,criterionIds){
 if(!obj||!['phei-studio-v0.3','phei-studio-v0.4'].includes(obj.schema))fail('Esquema no compatible');
 const d=obj.data;
 if(!d||!Array.isArray(d.zones)||!Array.isArray(d.observations))fail('Estructura inválida');
 if(d.zones.length>250||d.observations.length>10000)fail('Demasiados registros');
 if(JSON.stringify(obj).length>4e6)fail('Archivo demasiado grande');
 if(d.planData!=null&&!(typeof d.planData==='string'&&/^data:image\/(jpeg|png|webp);base64,[a-zA-Z0-9+/=]+$/.test(d.planData)))fail('Plano inválido');
 const ids=new Set(),obsIds=new Set(),pairs=new Set();
 const identifier=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(v);
 for(const z of d.zones){
  if(!z||!identifier(z.id)||ids.has(z.id)||typeof z.name!=='string'||!z.name.trim()||z.name.length>65)fail('Zona o identificador inválido');
  ids.add(z.id);
  if(!['demo','real'].includes(z.kind))fail('Origen de zona inválido');
  if(!Number.isInteger(z.n)||z.n<0||z.n>1e7)fail('Muestra inválida');
  if(z.stress!==null&&(!Number.isFinite(z.stress)||z.stress<0||z.stress>10))fail('Media fuera de rango');
  if((z.stress===null)!==(z.n===0))fail('Media y muestra inconsistentes');
  if(z.polygon!=null&&(!Array.isArray(z.polygon)||z.polygon.length<3||z.polygon.length>100||!z.polygon.every(pt=>Array.isArray(pt)&&pt.length===2&&pt.every(v=>Number.isFinite(v)&&v>=0&&v<=1))))fail('Polígono inválido');
 }
 for(const o of d.observations){
  if(!o||!identifier(o.id)||obsIds.has(o.id)||!ids.has(o.zid)||!criterionIds.includes(o.cid)||!Number.isInteger(o.score)||o.score<0||o.score>3||typeof o.notes!=='string'||o.notes.length>1600||typeof o.demo!=='boolean')fail('Observación inválida');
  const pair=JSON.stringify([o.zid,o.cid]);if(pairs.has(pair))fail('Criterio duplicado');pairs.add(pair);obsIds.add(o.id);
 }
 return structuredClone(d);
}
function persist(storage,key,data){
 const next=JSON.stringify(data),previous=storage.getItem(key);
 if(previous!==null&&previous!==next){
  const suffix=globalThis.crypto?.randomUUID?.()||Date.now()+'-'+Math.random().toString(36).slice(2);
  storage.setItem(key+'_HISTORY_'+suffix,previous);
 }
 storage.setItem(key,next);
}
root.PHEISafety={validateBackup,persist};
})(globalThis);
