import {test} from 'node:test';import assert from 'node:assert/strict';
import {freeMove,BODY_RADIUS} from '../web/src/navigation.ts';
import {demo,defaults} from '../web/src/model.ts';
import {createSimulation,step} from '../web/src/engine.ts';
test('impide atravesar mobiliario, paredes y otros agentes en un paso',()=>{
 const room=demo.rooms[1];assert.equal(freeMove(demo,room,[.3,-4],[3,-4],[]),false);
 assert.equal(freeMove(demo,room,[1,-1],[1,1],[]),false);
 assert.equal(freeMove(demo,demo.rooms[0],[8,1],[10,1],[[9,1]]),false);
 assert.equal(freeMove(demo,room,[3,-.5],[3,0],[]),true);
});
test('modo físico mantiene separación durante afluencia y cruces',()=>{const s=createSimulation(demo,{...defaults,population:40,arrivalInterval:.1,collisionAvoidance:1});for(let i=0;i<1200;i++){step(s);const active=s.agents.filter(a=>!['pending','finished'].includes(a.phase));for(let j=0;j<active.length;j++)for(let k=j+1;k<active.length;k++)assert.ok(Math.hypot(active[j].position[0]-active[k].position[0],active[j].position[1]-active[k].position[1])>=2*BODY_RADIUS-1e-8)}});
test('rechaza modo desconocido y reproduce separación con misma semilla',()=>{assert.throws(()=>createSimulation(demo,{...defaults,collisionAvoidance:2}));const a=createSimulation(demo,{...defaults,collisionAvoidance:1}),b=createSimulation(demo,{...defaults,collisionAvoidance:1});for(let i=0;i<500;i++){step(a);step(b)}assert.deepEqual(a,b)});
