import test from 'node:test';
import assert from 'node:assert/strict';
import {SpellRun,SPELLS} from '../dist/spell-logic.js';
import {TrajectoryPunchTracker,practiceStroke} from '../dist/motion.js';

function advance(run,seconds){for(let t=0;t<seconds;t+=.01)run.step(.01);}
test('opening wards teach each gesture; later enemies need two different spells',()=>{
 const run=new SpellRun();
 for(const type of Object.keys(SPELLS)){assert.equal(run.front.types[0],type);assert.equal(run.cast(type).type,'shatter');advance(run,.8);}
 assert.equal(run.defeated,3);assert.equal(run.front.types.length,2);
 const first=run.front,required=first.types[0],followup=first.types[1];assert.notEqual(required,followup);
 assert.equal(run.cast(required).type,'break');assert.equal(run.front,first);assert.equal(first.layer,1);
 advance(run,.4);assert.equal(run.cast(followup).type,'shatter');assert.equal(run.defeated,4);
});
test('wrong gestures deflect, repeat notifications cannot bypass cooldown, and overdrive keeps gesture rules',()=>{
 const run=new SpellRun();assert.equal(run.cast('hook').type,'deflect');assert.equal(run.score,0);assert.equal(run.front.layer,0);
 assert.equal(run.cast('jab'),null);advance(run,.4);assert.equal(run.cast('jab').type,'shatter');assert.equal(run.cast('jab'),null);
 while(run.defeated<5){advance(run,.8);if(run.front)run.cast(run.front.types[run.front.layer]);}
 assert.ok(run.overdrive>0);advance(run,.8);const front=run.front;
 assert.equal(run.cast(Object.keys(SPELLS).find(t=>t!==front.types[front.layer])).type,'deflect');advance(run,.4);
 assert.ok(run.cast(front.types[front.layer]).points>=150);assert.equal(run.hp,5);
});
test('missed wards deal damage once and the course stays bounded through time out',()=>{
 const run=new SpellRun(),breaches=new Set();
 for(let i=0;i<7000;i++){for(const e of run.step(.01))if(e.type==='hurt'){assert.ok(!breaches.has(e.enemy.id));breaches.add(e.enemy.id);}assert.ok(run.enemies.length<=3);}
 assert.equal(run.hp,0);assert.equal(breaches.size,5);assert.ok(run.over);assert.equal(run.cast('jab'),null);
 const timed=new SpellRun();timed.time=59.99;timed.step(.02);assert.ok(timed.over);assert.deepEqual(timed.step(.02),[]);
});
test('first recognized practice trajectory casts the selected spell exactly once',()=>{
 for(const type of Object.keys(SPELLS)){
  const tracker=new TrajectoryPunchTracker();let cast=null,count=0;
  for(let i=0;i<75;i++){
   const time=i*10,s=practiceStroke(time/1000,type,2);
   if(s.phase!=='strike'){tracker.reset();tracker.sample(s.p,time);}
   else {const event=tracker.sample(s.p,time);if(event){cast=event.type;count++;tracker.consume();}}
  }
  assert.equal(cast,type);assert.equal(count,1);
 }
});
