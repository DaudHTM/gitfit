import test from 'node:test';import assert from 'node:assert/strict';
import {SwordDuel,bladesMeet,BladeStroke,DUEL_STYLES,BladeHistory,bladePose} from '../dist/duel-logic.js';
import {sweptHit} from '../dist/game-logic.js';
import * as T from '../dist/vendor/three/three.module.min.js';
import {saberPracticeRoll,SABER_CUE_START_Z} from '../dist/motion.js';
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
test('sensor blade reconstruction agrees with the rendered grip for arbitrary orientations',()=>{
 const grip=new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),-Math.PI/2),wrist=new T.Vector3(.2,1.3,-.4);
 for(let i=0;i<50;i++){
  const q=new T.Quaternion(Math.sin(i),Math.cos(i*.7),Math.sin(i*.8),Math.cos(i*.3)).normalize();
  const base=wrist.clone().add(new T.Vector3(0,-.07,-.075).applyQuaternion(q)),tip=new T.Vector3(0,.72,0).applyQuaternion(q.clone().multiply(grip)).add(base);
  const reconstructed=bladePose(wrist.toArray(),q.toArray());assert.ok(base.distanceTo(new T.Vector3(...reconstructed.base))<1e-12);assert.ok(tip.distanceTo(new T.Vector3(...reconstructed.tip))<1e-12);
 }
});
test('intermediate sensor poses catch a curved swing that rendered endpoints miss',()=>{
 const h=new BladeHistory(),q=[0,0,0,1],sample=(p,time)=>({p,q,time});
 h.consume([sample([-.35,1.07,-.2],100)]);
 const paths=h.consume([sample([0,1.07,-.5],110),sample([.35,1.07,-.2],120)]),center=[0,1,-1.295];
 assert.equal(sweptHit(paths[0].previous.tip,paths.at(-1).current.tip,center,.1),false);
 assert.ok(paths.some(p=>sweptHit(p.previous.tip,p.current.tip,center,.1)));assert.ok(paths.every(p=>p.speed>0));
 assert.equal(h.consume([sample([.35,1.07,-.2],120)]).length,0);
});
test('blade backlog is bounded, stale jumps cannot hit, and pause retains stroke identity',()=>{
 const h=new BladeHistory(),q=[0,0,0,1];h.consume([{p:[0,1,0],q,time:0},{p:[.1,1,0],q,time:10}]);const id=h.stroke.id;
 const jump=h.consume([{p:[2,1,0],q,time:500}])[0];assert.equal(jump.speed,0);assert.deepEqual(jump.previous,jump.current);
 const batch=h.consume(Array.from({length:100},(_,i)=>({p:[i*.01,1,0],q,time:600+i*10})));assert.ok(batch.length<=11);assert.equal(batch[0].speed,0);
 h.reset(true);assert.ok(h.stroke.id>=id);assert.deepEqual(h.consume([{p:[NaN,1,0],q,time:2000}]),[]);
});
test('saber practice cuts through every block lane after the visible lead cue',()=>{
 const down=new T.Vector3(0,-1,0),x=new T.Vector3(1,0,0),z=new T.Vector3(0,0,1);
 const elbow=down.clone().applyQuaternion(new T.Quaternion().setFromAxisAngle(x,.55)).multiplyScalar(.3).add(new T.Vector3(.23,1.35,0));
 for(const reaction of [0,.04,.08,.12])for(let lane=0;lane<6;lane++){
  const history=new BladeHistory();let hit=false;
  for(let i=0;i<65;i++){
   const t=i*.01,q=new T.Quaternion().setFromAxisAngle(x,1.4).premultiply(new T.Quaternion().setFromAxisAngle(z,saberPracticeRoll(t-reaction))),fist=down.clone().applyQuaternion(q).multiplyScalar(.315).add(elbow);
   const center=[.2+(lane%3-1)*.07,1.4+(lane%2)*.07,SABER_CUE_START_Z+4.5*t];
   for(const path of history.consume([{p:fist.toArray(),q:q.toArray(),time:t*1000}]))if(Math.abs(center[2]+.5)<.36&&path.speed>.55&&(sweptHit(path.previous.tip,path.current.tip,center,.23)||sweptHit(path.current.base,path.current.tip,center,.19)))hit=true;
  }
  assert.ok(hit,`lane ${lane}, reaction ${reaction}`);
 }
});
