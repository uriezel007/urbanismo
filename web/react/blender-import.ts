/* Importador Blender -> PHEI WebGL, solo visual.
   Nunca modifica Scene, navegacion, capacidades o simulaciones. */
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

export const MAX_MODEL_BYTES=20_000_000;
type AssetInfo={version?:string};
type UriResource={uri?:string;bufferView?:number;mimeType?:string};
type GltfDoc={
 asset?:AssetInfo;buffers?:UriResource[];images?:UriResource[];
 meshes?:unknown[];nodes?:unknown[];materials?:unknown[];
 accessors?:Array<{count?:number}>;extensionsRequired?:string[];
};
export type BlenderAsset={object:THREE.Group;name:string;bytes:number;
 width:number;height:number;depth:number;center:[number,number,number]};
export type CheckedModel={format:'glb'|'gltf';text?:string;json:GltfDoc};

function readJSON(text:string):GltfDoc{
 let doc:unknown;
 try{doc=JSON.parse(text)}catch{throw Error('El archivo no contiene JSON glTF válido.')}
 if(!doc||typeof doc!=='object'||Array.isArray(doc))throw Error('Estructura glTF inválida.');
 return doc as GltfDoc;
}
function isEmbeddedBuffer(uri:string):boolean{
 return /^data:(?:application\/octet-stream|application\/gltf-buffer)?;base64,[a-z0-9+/=]+$/i.test(uri);
}
function isEmbeddedImage(uri:string):boolean{
 return /^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(uri);
}
export function inspectBlenderFile(name:string,data:ArrayBuffer):CheckedModel{
 if(data.byteLength===0||data.byteLength>MAX_MODEL_BYTES)throw Error('El modelo debe tener entre 1 byte y 20 MB.');
 const ext=name.toLowerCase().split('.').pop();
 if(ext!=='glb'&&ext!=='gltf')throw Error('Solo se admiten archivos .glb o .gltf.');
 let doc:GltfDoc;
 let text:string|undefined;
 if(ext==='glb'){
  if(data.byteLength<20)throw Error('Cabecera GLB incompleta.');
  const view=new DataView(data);
  if(view.getUint32(0,true)!==0x46546c67||view.getUint32(4,true)!==2||view.getUint32(8,true)!==data.byteLength)
   throw Error('Archivo GLB inválido o versión distinta de glTF 2.0.');
  const jsonLength=view.getUint32(12,true);
  if(view.getUint32(16,true)!==0x4e4f534a||jsonLength>4_000_000||jsonLength+20>data.byteLength)
   throw Error('Bloque JSON de GLB inválido.');
  doc=readJSON(new TextDecoder('utf-8',{fatal:true}).decode(new Uint8Array(data,20,jsonLength)).trim());
 }else{
  text=new TextDecoder('utf-8',{fatal:true}).decode(data);
  doc=readJSON(text);
 }
 if(doc.asset?.version!=='2.0')throw Error('PHEI requiere glTF 2.0.');
 if(!Array.isArray(doc.nodes)||doc.nodes.length>1000||!Array.isArray(doc.meshes)||doc.meshes.length>250)
  throw Error('Modelo demasiado complejo o sin nodos/mallas.');
 if((doc.materials?.length||0)>250)throw Error('Demasiados materiales.');
 if(!Array.isArray(doc.accessors)||doc.accessors.length>2000||
    doc.accessors.reduce((total,a)=>total+(typeof a.count==='number'&&Number.isInteger(a.count)&&a.count>=0?a.count:1_500_001),0)>1_500_000)
  throw Error('Modelo demasiado grande para el visor exploratorio.');
 if((doc.extensionsRequired||[]).some(e=>['KHR_draco_mesh_compression','EXT_meshopt_compression','KHR_texture_basisu'].includes(e)))
  throw Error('Esta versión no admite mallas/texturas comprimidas. Exporta GLB sin compresión.');
 for(const buffer of doc.buffers||[]){
  if(typeof buffer.uri==='string'&&!isEmbeddedBuffer(buffer.uri))
   throw Error('No se permiten recursos externos: incrusta los buffers al exportar desde Blender.');
  if(ext==='gltf'&&typeof buffer.uri!=='string')
   throw Error('El archivo .gltf debe llevar sus buffers incrustados; usa GLB para archivos con recursos separados.');
 }
 for(const image of doc.images||[]){
  if(typeof image.uri==='string'&&!isEmbeddedImage(image.uri))
   throw Error('No se permiten imágenes externas ni SVG. Incrusta PNG, JPG o WebP.');
  if(image.uri===undefined&&(!Number.isInteger(image.bufferView)||!['image/png','image/jpeg','image/webp'].includes(image.mimeType||'')))
   throw Error('Imagen GLB sin buffer o con formato no admitido.');
 }
 return {format:ext,text,json:doc};
}
export async function loadBlenderAsset(file:File):Promise<BlenderAsset>{
 if(file.size>MAX_MODEL_BYTES)throw Error('El archivo supera 20 MB.');
 const data=await file.arrayBuffer();
 const checked=inspectBlenderFile(file.name,data);
 const gltf=await new GLTFLoader().parseAsync(checked.format==='glb'?data:checked.text!,'');
 const object=gltf.scene;
 if(!object)throw Error('El modelo no contiene una escena visual.');
 object.updateMatrixWorld(true);
 const bounds=new THREE.Box3().setFromObject(object);
 if(bounds.isEmpty())throw Error('La escena no contiene geometría visible.');
 const size=bounds.getSize(new THREE.Vector3());
 const center=bounds.getCenter(new THREE.Vector3());
 if(![size.x,size.y,size.z,center.x,center.y,center.z].every(Number.isFinite)||
    Math.max(size.x,size.y,size.z)>2000||Math.max(Math.abs(center.x),Math.abs(center.y),Math.abs(center.z))>2000)
  throw Error('Las dimensiones del modelo exceden el visor; revisa unidades y origen en Blender.');
 return {object,name:file.name,bytes:data.byteLength,width:size.x,height:size.y,depth:size.z,
  center:[center.x,center.y,center.z]};
}
export function disposeBlenderAsset(asset:BlenderAsset):void{
 asset.object.traverse(node=>{
  const mesh=node as THREE.Mesh;
  if(mesh.geometry)mesh.geometry.dispose();
  if(!mesh.material)return;
  const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];
  for(const mat of materials){
   for(const property of Object.values(mat)){
    if(property instanceof THREE.Texture)property.dispose();
   }
   mat.dispose();
  }
 });
}
