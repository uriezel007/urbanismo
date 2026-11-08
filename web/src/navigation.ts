import type {Scene,Room,Point} from './model.ts';
export const BODY_RADIUS=.22;
export function walkable(scene:Scene,room:Room,p:Point):boolean{
 const r=BODY_RADIUS;
 const inside=p[0]>=room.x+r&&p[0]<=room.x+room.width-r&&p[1]>=room.z+r&&p[1]<=room.z+room.depth-r;
 const portal=scene.doors.some(d=>{if(d.a!==room.id&&d.b!==room.id)return false;const horizontal=Math.abs(d.at[1]-room.z)<1e-6||Math.abs(d.at[1]-room.z-room.depth)<1e-6;return horizontal?Math.abs(p[1]-d.at[1])<=r+.01&&Math.abs(p[0]-d.at[0])<=d.width/2-r:Math.abs(p[0]-d.at[0])<=r+.01&&Math.abs(p[1]-d.at[1])<=d.width/2-r});
 return (inside||portal)&&!scene.furniture.some(f=>p[0]>f.x-r&&p[0]<f.x+f.width+r&&p[1]>f.z-r&&p[1]<f.z+f.depth+r);
}
export function segmentDistance(p:Point,a:Point,b:Point):number{const x=b[0]-a[0],z=b[1]-a[1],l=x*x+z*z,t=l?Math.max(0,Math.min(1,((p[0]-a[0])*x+(p[1]-a[1])*z)/l)):0;return Math.hypot(p[0]-a[0]-t*x,p[1]-a[1]-t*z)}
export function freeMove(scene:Scene,room:Room,from:Point,to:Point,others:Point[]):boolean{
 if(others.some(p=>segmentDistance(p,from,to)<2*BODY_RADIUS-1e-8))return false;
 const n=Math.max(1,Math.ceil(Math.hypot(to[0]-from[0],to[1]-from[1])/.04));for(let i=1;i<=n;i++)if(!walkable(scene,room,[from[0]+(to[0]-from[0])*i/n,from[1]+(to[1]-from[1])*i/n]))return false;return true;
}
export function destinationPoint(scene:Scene,room:Room,id:number):Point{
 const points:Point[]=[];for(let z=room.z+.6;z<room.z+room.depth-.6;z+=.65)for(let x=room.x+.6;x<room.x+room.width-.6;x+=.65)if(walkable(scene,room,[x,z]))points.push([x,z]);
 return points[id%points.length]||[room.x+room.width/2,room.z+room.depth/2];
}
