export type Point = [number, number];
export type Provenance = 'measured' | 'professional_observation' | 'hypothetical' | 'simulated';
export interface Room { id:string; name:string; x:number; z:number; width:number; depth:number; capacity:number }
export interface Door { id:string; a:string; b:string; at:Point; width:number }
export interface Furniture { id:string; x:number; z:number; width:number; depth:number }
export interface Scene { rooms:Room[]; doors:Door[]; furniture:Furniture[]; entry:string; unit:'m'; provenance:'hypothetical' }
export interface Parameters { population:number; seed:number; speed:number; arrivalInterval:number; dwell:number; orientationDelay:number; environmentalMultiplier:number }
export const defaults:Parameters={population:24,seed:42,speed:1.2,arrivalInterval:1.5,dwell:12,orientationDelay:1,environmentalMultiplier:1};
export const demo:Scene={unit:'m',provenance:'hypothetical',entry:'hall',rooms:[
 {id:'hall',name:'Circulación',x:0,z:0,width:18,depth:3,capacity:30},
 {id:'reception',name:'Recepción',x:0,z:-5,width:6,depth:5,capacity:8},
 {id:'waiting',name:'Sala de espera',x:6,z:-5,width:6,depth:5,capacity:12},
 {id:'consult',name:'Consultorio',x:12,z:-5,width:6,depth:5,capacity:4},
 {id:'quiet',name:'Sala de calma',x:0,z:3,width:6,depth:4,capacity:4},
 {id:'staff',name:'Área de personal',x:6,z:3,width:6,depth:4,capacity:6},
 {id:'garden',name:'Jardín interior',x:12,z:3,width:6,depth:4,capacity:10}
],doors:[
 {id:'d1',a:'hall',b:'reception',at:[3,0],width:1.2},
 {id:'d2',a:'hall',b:'waiting',at:[9,0],width:1.2},
 {id:'d3',a:'hall',b:'consult',at:[15,0],width:0.9},
 {id:'d4',a:'hall',b:'quiet',at:[3,3],width:1.2},
 {id:'d5',a:'hall',b:'staff',at:[9,3],width:0.9},
 {id:'d6',a:'hall',b:'garden',at:[15,3],width:1.5}
],furniture:[
 {id:'desk',x:0.6,z:-4.5,width:1.8,depth:0.7},
 {id:'bench',x:6.4,z:-4.5,width:2,depth:0.6},
 {id:'table',x:12.4,z:-4.5,width:1.8,depth:0.8},
 {id:'seat',x:0.4,z:5.8,width:1.6,depth:0.6},
 {id:'staffdesk',x:6.4,z:5.8,width:1.8,depth:0.6},
 {id:'planter',x:12.4,z:5.8,width:1.8,depth:0.6}
]};
export const center=(r:Room):Point=>[r.x+r.width/2,r.z+r.depth/2];
export const area=(r:Room)=>r.width*r.depth;
