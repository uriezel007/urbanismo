const {test}=require('node:test'),assert=require('node:assert/strict'),C=require('./core.js');
const d={id:'1',name:'Empresa demo',offer:'PHEI Diagnóstico',stage:'Propuesta',amount:2900,paidAmount:0,next:'Enviar propuesta',channel:'Referido',consent:false,due:'2026-10-01',note:''};
test('distingue valor abierto de pagos',()=>{const x=C.pipeline([d],'2026-10-19');assert.equal(x.openValue,2900);assert.equal(x.declaredPaid,0);assert.equal(x.overdue,1)});
test('acuerdo no es cobro',()=>{const x=C.pipeline([{...d,stage:'Ganado',paidAmount:500}],'2026-10-19');assert.equal(x.wonAgreements,2900);assert.equal(x.declaredPaid,500);assert.equal(x.wonWithBalance,1)});
test('importes y estados inválidos son rechazados',()=>{assert.ok(C.validateLead(d));assert.ok(!C.validateLead({...d,paidAmount:3000}));assert.ok(!C.validateLead({...d,stage:'XYZ'}))});
test('migración v1 no inventa cobros o consentimiento',()=>{const x=C.migrateV1({leads:[d],approved:[]});assert.equal(x.leads[0].paidAmount,0);assert.equal(x.leads[0].consent,false)});
test('respaldo duplicado rechazado',()=>assert.throws(()=>C.validateBackup({schema:'preser.growth.v2',leads:[d,d],approved:[]})));
test('CSV protege de fórmulas',()=>assert.ok(C.csv([{...d,name:'=HYPERLINK("x")'}]).includes("'=HYPERLINK")));
