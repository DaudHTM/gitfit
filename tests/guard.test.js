import test from 'node:test';import assert from 'node:assert/strict';
import {GuardCourse,guardPosition,guardShotPosition,GUARD} from '../dist/guard-logic.js';

test('shield arrows have equal speed at different frame rates and tracked positions stay immediate',()=>{
 for(const hz of [30,60,120]){let p=[.18,1.3];for(let i=0;i<hz/5;i++)p=guardPosition(p,1/hz,['ArrowLeft']);assert.ok(Math.abs(p[0]-(.18-GUARD.speed*.2))<1e-12);}
 assert.deepEqual(guardPosition([.18,1.3],.01,[],[.42,1.66]),[.42,1.66]);assert.deepEqual(guardPosition([0,1],.02,[],[100,-100]),[GUARD.x[1],GUARD.y[0]]);
});
function single(target){const c=new GuardCourse();c.next=100;c.shots=[{id:0,born:0,target,age:0,duration:.1,radius:.13,sway:.38}];return c;}
test('collision evaluates shield placement at the exact incoming plane crossing',()=>{
 const hit=single([.075,1.3]),events=hit.step(.2,[-.4,1.3],[.55,1.3]);assert.equal(events[0].type,'block');assert.equal(events[0].perfect,true);assert.equal(hit.score,150);assert.equal(hit.hp,5);
 const miss=single([.55,1.3]);assert.equal(miss.step(.2,[-.4,1.3],[.55,1.3])[0].type,'miss');assert.equal(miss.hp,4);assert.deepEqual(miss.step(.2,[.55,1.3],[.55,1.3]),[]);
});
test('perfect blocks are distinct from edge catches and four perfects enlarge the shield',()=>{
 const edge=single([.18,1.3]);assert.equal(edge.step(.2,[.30,1.3],[.30,1.3])[0].perfect,false);assert.equal(edge.score,100);assert.equal(edge.perfects,0);
 const c=new GuardCourse();for(let i=0;i<1400&&c.perfects<4;i++){const p=c.front?.target||[.18,1.3];c.step(.01,p,p);}
 assert.equal(c.perfects,4);assert.equal(c.hp,5);assert.equal(c.totalHits,4);assert.equal(c.score,660);assert.equal(c.radius,GUARD.surgeRadius);
 c.surge=.01;c.step(.02,[0,1],[0,1]);assert.equal(c.radius,GUARD.radius);
});
test('waves introduce ion shots while hazards and their target positions remain bounded',()=>{
 const c=new GuardCourse(),types=new Set();for(let i=0;i<6100&&!c.over;i++){
  for(const s of c.shots){types.add(s.type);assert.ok(s.target[0]>=GUARD.x[0]&&s.target[0]<=GUARD.x[1]);assert.ok(s.target[1]>=GUARD.y[0]&&s.target[1]<=GUARD.y[1]);const end=guardShotPosition({...s,age:s.duration});assert.ok(Math.hypot(end[0]-s.target[0],end[1]-s.target[1],end[2]-GUARD.plane)<1e-12);}
  const p=c.front?.target||[.18,1.3];c.step(.01,p,p);assert.ok(c.shots.length<=6);
 }
 assert.deepEqual(types,new Set(['METEOR','ION']));assert.ok(c.wave>3);assert.equal(c.hp,5);assert.ok(c.over);assert.equal(c.totalHits,c.perfects);assert.ok(c.bestCombo>8);
});
test('a missed course stops once, and stationary play has identical outcomes at 20 and 120 Hz',()=>{
 const results=[];for(const hz of [20,120]){const c=new GuardCourse();let misses=0;for(let i=0;i<hz*65;i++)for(const e of c.step(1/hz,[.18,1.3],[.18,1.3]))if(e.type==='miss')misses++;results.push([c.score,c.totalHits,c.perfects,c.hp,misses]);assert.equal(misses,5);assert.equal(c.hp,0);assert.ok(c.over);}
 assert.deepEqual(results[0],results[1]);
});
