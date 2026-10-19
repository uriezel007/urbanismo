/* PHEI Pilot v0.2: comparación geométrica exploratoria, no normativa. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.PHEIMetrics=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const valid=(x,min,max)=>typeof x==='number'&&Number.isFinite(x)&&x>=min&&x<=max;
function analyse(d){
 if(!d||!d.ambiente||!valid(d.ancho,.1,1000)||!valid(d.largo,.1,1000))throw Error('Dimensiones inválidas');
 if(!Number.isInteger(d.personasA)||!Number.isInteger(d.personasB)||!valid(d.personasA,0,100000)||!valid(d.personasB,0,100000))throw Error('Número de personas inválido');
 if(!valid(d.puertaA,.1,100)||!valid(d.puertaB,.1,100))throw Error('Ancho de acceso inválido');
 if(d.tope!==null&&(!Number.isInteger(d.tope)||d.tope<1))throw Error('Referencia inválida');
 if(!['demo','estimado','medido'].includes(d.provenance))throw Error('Procedencia obligatoria');
 if(d.provenance==='medido'&&(!d.source||!d.source.trim()))throw Error('Medición sin fuente documentada');
 const area=d.ancho*d.largo;
 const stats=n=>({density:n/area,perPerson:n>0?area/n:null,referencePercent:d.tope?100*n/d.tope:null});
 return {...d,model:'geometría-rectangular-v0.2',area,scenarioA:stats(d.personasA),scenarioB:stats(d.personasB),relativeDensityChange:d.personasA?100*(d.personasB-d.personasA)/d.personasA:null,disclaimer:'No determina aforo legal, accesibilidad, emociones ni evacuación certificada.'};
}
function toCSV(r){const rows=[['indicador','A','B','unidad'],['personas',r.personasA,r.personasB,'personas'],['densidad',r.scenarioA.density,r.scenarioB.density,'personas/m2'],['area_por_persona',r.scenarioA.perPerson??'',r.scenarioB.perPerson??'','m2/persona'],['ancho_acceso',r.puertaA,r.puertaB,'m'],['superficie',r.area,r.area,'m2'],['provenance',r.provenance,r.provenance,'categoría']];return '\ufeff'+rows.map(row=>row.map(x=>'"'+String(x).replace(/"/g,'""')+'"').join(',')).join('\r\n')+'\r\n';}
return {analyse,toCSV};
});
