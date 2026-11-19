import {test} from 'node:test';
import assert from 'node:assert/strict';
import {inspectBlenderFile,MAX_MODEL_BYTES} from '../web/react/blender-import.ts';

const bytes=(doc:unknown)=>new TextEncoder().encode(JSON.stringify(doc)).buffer;
const basic=()=>({asset:{version:'2.0'},meshes:[{}],nodes:[{}],accessors:[{count:3}],
 buffers:[{uri:'data:application/octet-stream;base64,AAAA',byteLength:3}]});
function glb(doc:unknown):ArrayBuffer{
 const src=new TextEncoder().encode(JSON.stringify(doc));
 const padded=Math.ceil(src.byteLength/4)*4;
 const buffer=new ArrayBuffer(20+padded),view=new DataView(buffer),output=new Uint8Array(buffer);
 view.setUint32(0,0x46546c67,true);view.setUint32(4,2,true);view.setUint32(8,buffer.byteLength,true);
 view.setUint32(12,padded,true);view.setUint32(16,0x4e4f534a,true);
 output.fill(32,20);output.set(src,20);
 return buffer;
}
test('acepta glTF autocontenido 2.0 y GLB con JSON incrustado',()=>{
 assert.equal(inspectBlenderFile('sala.gltf',bytes(basic())).format,'gltf');
 const doc={asset:{version:'2.0'},meshes:[{}],nodes:[{}],accessors:[{count:3}],buffers:[{byteLength:0}]};
 assert.equal(inspectBlenderFile('sala.glb',glb(doc)).format,'glb');
});
test('bloquea recursos externos antes de invocar el cargador',()=>{
 for(const uri of ['https://example.com/room.bin','../room.bin','file:///tmp/room.bin','blob:https://site/x']){
  assert.throws(()=>inspectBlenderFile('sala.gltf',bytes({...basic(),buffers:[{uri}]})),/externos/);
 }
 assert.throws(()=>inspectBlenderFile('sala.gltf',bytes({...basic(),images:[{uri:'https://example.com/track.png'}]})),/externas/);
});
test('rechaza versiones, archivos malformados, compresión y geometría extrema',()=>{
 assert.throws(()=>inspectBlenderFile('sala.blend',bytes(basic())),/Solo se admiten/);
 assert.throws(()=>inspectBlenderFile('sala.gltf',bytes({...basic(),asset:{version:'1.0'}})),/glTF 2.0/);
 assert.throws(()=>inspectBlenderFile('sala.glb',bytes(basic())),/GLB inválido/);
 assert.throws(()=>inspectBlenderFile('sala.gltf',bytes({...basic(),accessors:[{count:1_500_001}]})),/grande/);
 assert.throws(()=>inspectBlenderFile('sala.gltf',bytes({...basic(),extensionsRequired:['KHR_draco_mesh_compression']})),/comprimidas/);
 assert.throws(()=>inspectBlenderFile('sala.gltf',new ArrayBuffer(MAX_MODEL_BYTES+1)),/20 MB/);
});
