/* PHEI v0.7 — exportación de geometría conceptual para Blender (.obj)
   Nunca implica escala certificada, coordenadas georreferenciadas ni elementos BIM.
*/
(function(){
'use strict';
const runtime=window.PHEI_RUNTIME;
const root=document.getElementById('model3dMount');
if(!runtime?.getData||!root)return;
const actions=root.querySelector('.phei-3d-toolbar .phei-3d-actions');if(!actions)return;
const button=document.createElement('button');
button.type='button';button.textContent='↓ OBJ para Blender';button.title='Exportar geometría ilustrativa editable, SIN ESCALA REAL';actions.appendChild(button);
function buildOBJ(zones){
 const lines=['# PHEI Studio — malla esquemática (NO BIM, NO ESCALA REAL)','# Coordenadas locales arbitrarias, no metros ni georreferenciacion','o PHEI_Suelo_Conceptual'];
 let idx=1;
 function vertex(x,y,z){lines.push('v '+[x,y,z].map(n=>Number(n).toFixed(5)).join(' '));return idx++;}
 function quad(v){lines.push('f '+v.join(' '));}
 const ground=[vertex(-5.58,0,-3.22),vertex(5.58,0,-3.22),vertex(5.58,0,3.22),vertex(-5.58,0,3.22)];
 quad(ground);
 let count=0;
 const seen=new Set();
 for(const zone of zones){
  if(!Array.isArray(zone.polygon)||zone.polygon.length<3||zone.polygon.length>100)continue;
  const poly=zone.polygon;
  for(let i=0;i<poly.length;i++){
   const a=poly[i],b=poly[(i+1)%poly.length];
   if(![a,b].every(p=>Array.isArray(p)&&p.length===2&&p.every(n=>Number.isFinite(n)&&n>=0&&n<=1)))continue;
   const token=p=>p.map(n=>Math.round(n*10000)/10000).join('_');
   const key=[token(a),token(b)].sort().join(':');if(seen.has(key))continue;seen.add(key);
   const x1=(a[0]-.5)*13,z1=(a[1]-.5)*8.6,x2=(b[0]-.5)*13,z2=(b[1]-.5)*8.6;
   const dx=x2-x1,dz=z2-z1,length=Math.hypot(dx,dz);if(length<.015)continue;
   const nx=-dz/length*.045,nz=dx/length*.045,h=1.45;
   const p=[vertex(x1-nx,0,z1-nz),vertex(x2-nx,0,z2-nz),vertex(x2+nx,0,z2+nz),vertex(x1+nx,0,z1+nz),
            vertex(x1-nx,h,z1-nz),vertex(x2-nx,h,z2-nz),vertex(x2+nx,h,z2+nz),vertex(x1+nx,h,z1+nz)];
   lines.push('o Muro_Conceptual_'+String(++count).padStart(3,'0'));
   quad([p[0],p[3],p[7],p[4]]);quad([p[1],p[5],p[6],p[2]]);quad([p[0],p[4],p[5],p[1]]);
   quad([p[3],p[2],p[6],p[7]]);quad([p[4],p[7],p[6],p[5]]);quad([p[0],p[1],p[2],p[3]]);
  }
 }
 return {obj:lines.join('\n')+'\n',walls:count};
}
function download(){
 const data=runtime.getData(),areas=Array.isArray(data?.zones)?data.zones:[];
 const value=buildOBJ(areas);
 if(!value.walls){window.alert('No hay polígonos de ambientes para exportar. Delimita espacios en el plano 2D.');return;}
 const blob=new Blob([value.obj],{type:'text/plain;charset=utf-8'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='PHEI_geometria_conceptual_blender.obj';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
 window.alert('Archivo OBJ exportado: '+value.walls+' tramos de muros ilustrativos. IMPORTANTE: la escala, las alturas y las aberturas NO representan mediciones reales. Debes calibrar y revisar la malla antes de utilizarla para diseño.');
}
button.addEventListener('click',download);
window.PHEI_BLENDER_EXPORT={buildOBJ};
})();
