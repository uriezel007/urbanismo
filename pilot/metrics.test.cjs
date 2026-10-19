const {test}=require('node:test'),assert=require('node:assert/strict'),C=require('./metrics.js');
const d={ambiente:'Sala demo',ancho:8,largo:6,tope:null,personasA:24,personasB:18,puertaA:1.2,puertaB:1.8,provenance:'demo',source:'',notes:''};
test('8x6 m; 24 vs 18 personas; densidad -25%',()=>{const r=C.analyse(d);assert.equal(r.area,48);assert.equal(r.scenarioA.density,.5);assert.equal(r.scenarioB.density,.375);assert.equal(r.relativeDensityChange,-25)});
test('denominador cero da comparación indefinida',()=>{const r=C.analyse({...d,personasA:0});assert.equal(r.relativeDensityChange,null);assert.equal(r.scenarioA.perPerson,null)});
test('medición requiere fuente documentada',()=>{assert.throws(()=>C.analyse({...d,provenance:'medido'}))});
test('rechaza dimensión infinita',()=>{assert.throws(()=>C.analyse({...d,ancho:Infinity}))});
test('CSV exporta métricas con unidad',()=>{const s=C.toCSV(C.analyse(d));assert.ok(s.includes('personas/m2'));assert.ok(s.includes('0.375'))});
