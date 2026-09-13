import test from 'node:test';import assert from 'node:assert/strict';
import {FrameBudget,writeText} from '../dist/frame-budget.js';
test('render quality adapts after sustained slow frames and recovers gradually',()=>{
 const q=new FrameBudget(2);let now=100,r;for(let i=0;i<200;i++)r=q.sample(now+=33,9)||r;
 assert.ok(q.ratio<1.5);assert.ok(q.ratio>=.8);assert.equal(r.fps,30);
 const low=q.ratio;for(let i=0;i<1300;i++)q.sample(now+=16,3);assert.ok(q.ratio>low);assert.ok(q.ratio<=1.5);
});
test('hidden tabs and gaps cannot drive quality down; manual quality stays fixed',()=>{
 const q=new FrameBudget(2);q.sample(100,10);q.sample(120,10);q.sample(9000,0,false);assert.equal(q.ratio,1.5);
 q.setMode('low');for(let i=0;i<100;i++)q.sample(10000+i*35,25);assert.equal(q.ratio,1);
 q.setMode('high');for(let i=0;i<100;i++)q.sample(20000+i*35,25);assert.equal(q.ratio,1.5);
});
test('unchanged HUD text does not cause DOM writes',()=>{
 let value='',writes=0;const node={get textContent(){return value},set textContent(v){value=v;writes++}};
 for(let i=0;i<1000;i++)writeText(node,'LIVE');assert.equal(writes,1);writeText(node,'STALE');assert.equal(writes,2);
});
