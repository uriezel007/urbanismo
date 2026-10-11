// Pruebas sin dependencias externas: node --test phei/tests/simulacion.test.cjs
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const repo=path.join(__dirname,'..');
const sim=fs.readFileSync(path.join(repo,'simulacion.js'),'utf8');
const exp=fs.readFileSync(path.join(repo,'exportar_obj.js'),'utf8');
const html=fs.readFileSync(path.join(repo,'index.html'),'utf8');
function extract(source,start,end){
 const a=source.indexOf(start),b=source.indexOf(end,a+start.length);
 assert.ok(a>=0&&b>a,'Marcadores de extracción presentes');
 return source.slice(a,b);
}
const pure=extract(sim,'function random(seed)','function readControls()');
const {initialize,advance,runBatch}=new Function('const horizon=40,dtFixed=0.1;\n'+pure+'\nreturn {initialize,advance,runBatch};')();
const buildOBJ=new Function(extract(exp,'function buildOBJ(zones)','function download()')+'\nreturn buildOBJ;')();
const base=()=>runBatch(72,1.4,'flujo',42);

test('conserva versión original y su respaldo local',()=>{
 assert.match(html,/PHEI Studio 0\.5/);
 assert.match(html,/PHEI_STUDIO_0_4/);
 assert.match(html,/window\.PHEI_RUNTIME=\{model3d:phei3dFull/);
 assert.match(html,/<script src="\.\/simulacion\.js"><\/script>/);
 assert.match(html,/<script src="\.\/exportar_obj\.js"><\/script>/);
});
test('algoritmo reproducible con semilla fija',()=>{
 assert.deepEqual(base(),base());
});
test('agentes dentro de límites físicos abstractos y temporales',()=>{
 const x=base();
 assert.equal(x.count,72);
 assert.ok(x.completed>=0&&x.completed<=x.count);
 assert.ok(x.peak>=0&&x.peak<=x.count);
 assert.ok(x.progress>=0&&x.progress<=1);
});
test('finalizaciones no decrecen y tiempo es monótono',()=>{
 const m=initialize(72,1.4,'flujo',42);
 let done=0,previous=0;
 for(let i=0;i<400;i++){
  advance(m,0.1);assert.ok(m.time>=previous);previous=m.time;
  assert.ok(m.completed>=done);done=m.completed;
 }
 assert.ok(m.time>=39.9&&m.time<=40);
});
test('comparación pareada detecta efecto algorítmico de ancho',()=>{
 const pairs=Array.from({length:12},(_,i)=>[runBatch(72,1.4,'flujo',42+i),runBatch(72,3,'flujo',42+i)]);
 const a=pairs.reduce((s,r)=>s+r[0].completed,0)/pairs.length;
 const b=pairs.reduce((s,r)=>s+r[1].completed,0)/pairs.length;
 assert.ok(a>0,'escenario estrecho no queda inmóvil');
 assert.ok(b>a,'el ancho mayor mejora finalizaciones en este modelo simplificado');
});
test('malla OBJ exportable y sin muros coincidentes duplicados',()=>{
 const p=[[.1,.1],[.9,.1],[.9,.9],[.1,.9]];
 const o=buildOBJ([{polygon:p},{polygon:p}]);
 assert.equal(o.walls,4);
 assert.match(o.obj,/^v -?\d+\.?\d* /m);
 assert.match(o.obj,/^f \d+ \d+ \d+ \d+$/m);
 assert.match(o.obj,/NO ESCALA REAL/);
});
test('polígonos no finitos se omiten',()=>{
 const o=buildOBJ([{polygon:[[.1,.1],[Infinity,.1],[.8,.8]]}]);
 assert.equal(o.walls,1); // El tramo entre dos coordenadas válidas aún puede exportarse
});
