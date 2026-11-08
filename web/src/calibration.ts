import type {Point} from './model.ts';
export interface Calibration {a:Point;b:Point;referenceMeters:number;metersPerPixel:number;imageWidth:number;imageHeight:number;source:'user_reference_unverified'}
export function calibrate(a:Point,b:Point,referenceMeters:number,imageWidth:number,imageHeight:number):Calibration {
 if(![...a,...b,referenceMeters,imageWidth,imageHeight].every(Number.isFinite)||referenceMeters<=0||referenceMeters>10000||imageWidth<=0||imageHeight<=0||imageWidth>20000||imageHeight>20000)throw Error('Referencia o dimensiones inválidas');
 for(const [x,y] of [a,b])if(x<0||x>imageWidth||y<0||y>imageHeight)throw Error('Punto fuera del plano');
 const pixels=Math.hypot(b[0]-a[0],b[1]-a[1]);if(pixels<10)throw Error('Separa los puntos al menos 10 píxeles');
 return {a,b,referenceMeters,metersPerPixel:referenceMeters/pixels,imageWidth,imageHeight,source:'user_reference_unverified'};
}
export function scaledArea(polygon:Point[],c:Calibration){let twice=0;for(let i=0;i<polygon.length;i++){const [x,y]=polygon[i],[xx,yy]=polygon[(i+1)%polygon.length];twice+=x*yy-xx*y}return Math.abs(twice)*.5*c.metersPerPixel**2}
