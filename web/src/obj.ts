import type {Scene,Point} from './model.ts';

/**
 * Exportación OBJ para Blender desde el mismo modelo espacial de PHEI.
 * El sistema de unidades es metros, pero el edificio demuestra una geometría hipotética.
 * No exporta BIM, mapa georreferenciado ni datos clínicos.
 */
export function exportBlenderOBJ(scene:Scene):string {
  if(scene.unit!=='m'||scene.provenance!=='hypothetical')throw Error('Solo se admite escena hipotética expresada en metros');
  if(!Array.isArray(scene.rooms)||!scene.rooms.length||scene.rooms.length>250)throw Error('Ambientes inválidos');
  const out:string[]=[
    '# PHEI DIGITAL TWIN — BLENDER OBJ',
    '# units: meters; coordinate system: X right, Y up, Z depth',
    '# GEOMETRIA HIPOTETICA — NO BIM / NO LEVANTAMIENTO / NO AFORO',
    '# Aperturas representadas esquematicamente. Verificar cualquier medida real.'
  ];
  let next=1;
  function vertex(x:number,y:number,z:number):number {
    if(![x,y,z].every(Number.isFinite))throw Error('Coordenadas no finitas');
    out.push('v '+[x,y,z].map(n=>n.toFixed(5)).join(' '));
    return next++;
  }
  function face(indices:number[]){out.push('f '+indices.join(' '))}
  function object(name:string){out.push('o '+name.replace(/[^a-zA-Z0-9_-]/g,'_'))}
  function box(name:string,x:number,y:number,z:number,width:number,height:number,depth:number) {
    if(![x,y,z,width,height,depth].every(Number.isFinite)||width<=0||height<=0||depth<=0)throw Error('Caja inválida');
    object(name);
    const a=vertex(x,y,z),b=vertex(x+width,y,z),c=vertex(x+width,y,z+depth),d=vertex(x,y,z+depth);
    const e=vertex(x,y+height,z),f=vertex(x+width,y+height,z),g=vertex(x+width,y+height,z+depth),h=vertex(x,y+height,z+depth);
    face([a,d,c,b]);face([e,f,g,h]);face([a,b,f,e]);face([b,c,g,f]);face([c,d,h,g]);face([d,a,e,h]);
  }
  const edges=new Map<string,{horizontal:boolean;coordinate:number;start:number;end:number}[]>();
  const line=(horizontal:boolean,coordinate:number,start:number,end:number)=>{
    const key=(horizontal?'h':'v')+':'+coordinate.toFixed(5);
    if(!edges.has(key))edges.set(key,[]);
    edges.get(key)!.push({horizontal,coordinate,start:Math.min(start,end),end:Math.max(start,end)});
  };
  for(const room of scene.rooms){
    if(![room.x,room.z,room.width,room.depth].every(Number.isFinite)||room.width<=0||room.depth<=0)throw Error('Geometría de ambiente inválida');
    if(room.width>10000||room.depth>10000)throw Error('Geometría fuera de rango');
    box('PHEI_Piso_'+room.id,room.x,-.08,room.z,room.width,.08,room.depth);
    line(true,room.z,room.x,room.x+room.width);
    line(true,room.z+room.depth,room.x,room.x+room.width);
    line(false,room.x,room.z,room.z+room.depth);
    line(false,room.x+room.width,room.z,room.z+room.depth);
  }
  // Los bordes compartidos se segmentan por puntos de corte para no duplicar muros.
  let wallIndex=0;
  for(const [key,segments] of edges){
    const {horizontal,coordinate}=segments[0];
    const limit=(n:number)=>Math.round(n*100000)/100000;
    const cut=new Set<number>();
    for(const s of segments){cut.add(limit(s.start));cut.add(limit(s.end))}
    const openings:{start:number;end:number}[]=[];
    for(const d of scene.doors){
      if(!Number.isFinite(d.width)||d.width<=0||!d.at.every(Number.isFinite))throw Error('Puerta inválida');
      if(Math.abs((horizontal?d.at[1]:d.at[0])-coordinate)>1e-6)continue;
      const center=horizontal?d.at[0]:d.at[1],open={start:center-d.width/2,end:center+d.width/2};
      if(segments.some(s=>center>=s.start&&center<=s.end)){
        openings.push(open);cut.add(limit(open.start));cut.add(limit(open.end));
      }
    }
    const values=[...cut].sort((a,b)=>a-b);
    for(let i=0;i<values.length-1;i++){
      const a=values[i],b=values[i+1],mid=(a+b)/2;
      if(b-a<1e-5||!segments.some(s=>mid>=s.start-1e-5&&mid<=s.end+1e-5))continue;
      const door=openings.some(d=>mid>=d.start-1e-5&&mid<=d.end+1e-5);
      const thickness=.12,base=door?2.1:0,height=door?.7:2.8;
      if(horizontal)box('PHEI_Muro_'+(++wallIndex),a,base,coordinate-thickness/2,b-a,height,thickness);
      else box('PHEI_Muro_'+(++wallIndex),coordinate-thickness/2,base,a,thickness,height,b-a);
    }
  }
  for(const f of scene.furniture){
    if(![f.x,f.z,f.width,f.depth].every(Number.isFinite)||f.width<=0||f.depth<=0)throw Error('Mobiliario inválido');
    const h=f.id==='bench'||f.id==='seat'?.45:.75;
    box('PHEI_Mobiliario_'+f.id,f.x,0,f.z,f.width,h,f.depth);
  }
  // Indicador visual de proporción, no personaje medido ni objeto BIM.
  box('PHEI_Referencia_Humana_1_75m',19,0,4,.4,1.75,.25);
  return out.join('\n')+'\n';
}
