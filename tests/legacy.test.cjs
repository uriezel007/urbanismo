const {test}=require('node:test');const assert=require('node:assert/strict');require('../phei/safety.js');
const {validateBackup,persist}=globalThis.PHEISafety;
const valid=()=>({schema:'phei-studio-v0.4',data:{zones:[{id:'z1',name:'Sala',kind:'real',n:0,stress:null,polygon:null}],observations:[{id:'o1',zid:'z1',cid:'cg1',score:2,notes:'Registro',demo:false}],planData:null}});
test('permite respaldo compatible sin mutarlo',()=>{let x=valid();assert.deepEqual(validateBackup(x,['cg1']),x.data);assert.notEqual(validateBackup(x,['cg1']),x.data)});
for(const [name,change] of Object.entries({
 'HTML en score':x=>x.data.observations[0].score='<img src=x onerror=alert(1)>',
 'muestra textual':x=>x.data.zones[0].n='18',
 'origen sin identificar':x=>delete x.data.zones[0].kind,
 'referencia huérfana':x=>x.data.observations[0].zid='missing',
 'IDs repetidos':x=>x.data.zones.push(x.data.zones[0]),
 'criterio duplicado':x=>x.data.observations.push({...x.data.observations[0],id:'o2'}),
 'muestra sin media':x=>x.data.zones[0].n=1,
 'plano remoto':x=>x.data.planData='https://example.com/track.png',
 'polígono inválido':x=>x.data.zones[0].polygon=[[0,0],[1,1]],
 'notas no textuales':x=>x.data.observations[0].notes={}
}))test('rechaza '+name,()=>{let x=valid();change(x);assert.throws(()=>validateBackup(x,['cg1']))});
test('archiva antes de sustituir; nunca borra claves',()=>{const m=new Map([['key','original']]);persist({getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)},'key',{new:true});assert.equal(m.get('key'),'{"new":true}');assert.ok([...m.entries()].some(([k,v])=>k.startsWith('key_HISTORY_')&&v==='original'))});
test('si falla respaldo no sustituye el original',()=>{let written=false;assert.throws(()=>persist({getItem:()=> 'original',setItem:k=>{if(k!=='key')throw Error('quota');written=true}},'key',{}));assert.equal(written,false)});
