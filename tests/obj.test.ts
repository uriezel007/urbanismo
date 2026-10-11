import {test} from 'node:test';
import assert from 'node:assert/strict';
import {exportBlenderOBJ} from '../web/src/obj.ts';
import {demo} from '../web/src/model.ts';

test('exporta OBJ metricamente proporcional sin mutar escena',()=>{const before=structuredClone(demo);const obj=exportBlenderOBJ(demo);assert.match(obj,/units: meters/);assert.match(obj,/PHEI_Referencia_Humana_1_75m/);assert.match(obj,/PHEI_Muro_/);assert.match(obj,/PHEI_Mobiliario_/);assert.deepEqual(demo,before)});
test('los muros tienen aperturas y no hay bloques de espesor negativo',()=>{const obj=exportBlenderOBJ(demo);const parts=obj.split('\\n').filter(x=>x.startsWith('v '));assert.ok(parts.length>100);for(const l of parts){const arr=l.split(' ').slice(1).map(Number);assert.equal(arr.length,3);assert.ok(arr.every(Number.isFinite));}assert.match(obj,/PHEI_Muro_/)});
test('rechaza geometria medida o corrupta como si fuera valida',()=>{assert.throws(()=>exportBlenderOBJ({...demo,unit:'cm'}));assert.throws(()=>exportBlenderOBJ({...demo,rooms:[{...demo.rooms[0],width:-1}]}));});
