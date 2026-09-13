import test from 'node:test';import assert from 'node:assert/strict';
import {SwordDuel,bladesMeet,BladeStroke,DUEL_STYLES} from '../dist/duel-logic.js';
test('a real parry opens a one-hit counter, with a separate strike required',()=>{
 const d=new SwordDuel();assert.equal(d.counter(1,3,true),false);d.enter('windup');d.time=d.style.windup-.2;assert.equal(d.parry(2),false);
 d.step(.1,true);assert.equal(d.parry(2),true);assert.equal(d.phase,'open');assert.equal(d.counter(3,3,true),false);
 d.step(.2,true);assert.equal(d.counter(2,3,true),false);assert.equal(d.counter(3,.2,true),false);assert.equal(d.counter(3,3,false),false);assert.equal(d.counter(3,3,true),true);assert.equal(d.phase,'dead');assert.equal(d.counter(4,3,true),false);
});
test('missing the parry costs health once and missing the opening restores guard',()=>{
 for(let i=0;i<DUEL_STYLES.length;i++){const d=new SwordDuel(i);d.enter('swing');assert.equal(d.step(d.style.swing+.01,true),'hurt');assert.equal(d.step(.1,true),null);d.enter('open');assert.equal(d.step(d.style.opening+.01,true),'closed');assert.equal(d.counter(10,4,true),false);}
});
test('sword contacts require crossing blades and catch fast incoming tips',()=>{
 const p={base:[-.35,1.4,-.45],tip:[.35,1.4,-.45]};
 assert.equal(bladesMeet(p,{base:[0,1,-.45],tip:[0,1.8,-.45]}),true);
 assert.equal(bladesMeet(p,{base:[-.35,1.5,-.45],tip:[.35,1.5,-.45]}),false);
 assert.equal(bladesMeet(p,{base:[0,1,-2],tip:[0,1.8,-2]}),false);
 assert.equal(bladesMeet(p,{base:[0,1,-.8],tip:[0,1.4,-.2]},p,{base:[0,1,-.8],tip:[0,1.4,-.8]}),true);
});
test('a held blade is not a new strike; recovery and a fresh swing rearm',()=>{
 const b=new BladeStroke();let t=0,r;for(let i=0;i<20;i++)r=b.sample([i*.02,1,-.4],t+=10);const id=r.id;
 for(let i=0;i<10;i++)r=b.sample([.38,1,-.4],t+=10);assert.equal(r.id,id);
 for(let i=0;i<20;i++)r=b.sample([.38-i*.02,1,-.4],t+=10);assert.ok(r.id>id);
});
