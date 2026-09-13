import {test} from 'node:test';import assert from 'node:assert/strict';import {PunchTracker,sweptHit,strike} from '../dist/game-logic.js';
test('fast punches sweep through a target; misses stay misses',()=>{assert.equal(sweptHit([0,1,0],[0,1,-1],[0,1,-.5],.15),true);assert.equal(sweptHit([.5,1,0],[.5,1,-1],[0,1,-.5],.15),false)});
test('one punch cannot hit twice; retract permits another strike',()=>{const p=new PunchTracker();p.sample([0,1,0],100);assert.ok(p.sample([0,1,-.2],120));p.consume();assert.equal(p.sample([0,1,-.4],140),null);assert.equal(p.sample([0,1,-.4],160),null);assert.equal(p.sample([0,1,-.2],180),null);assert.ok(p.sample([0,1,-.4],200));});
test('zombie dies on second distinct strike only',()=>{const z={hp:2};assert.equal(strike(z),false);assert.equal(z.hp,1);assert.equal(strike(z),true);assert.equal(z.hp,0);assert.equal(strike(z),false);});
test('stale sample cannot create a phantom punch',()=>{const p=new PunchTracker();p.sample([0,1,0],100);assert.equal(p.sample([0,1,-1],500),null);});
import {nextOpponent,punchExtension} from '../dist/game-logic.js';
import {sweptCapsuleHit,punchHitsBody,BOXING_STOP_Z} from '../dist/game-logic.js';
import {zombieProfile} from '../dist/game-logic.js';
test('early waves introduce distinct enemies and brutes survive two maximum-power hits',()=>{
 const brawler=zombieProfile(0),runner=zombieProfile(1),brute=zombieProfile(2);
 assert.ok(runner.speed>brawler.speed);assert.ok(runner.attackPeriod<brawler.attackPeriod);assert.ok(brute.hp>brawler.hp*2);
 assert.equal(strike(brute,93),false);assert.equal(strike(brute,93),false);assert.equal(strike(brute,93),true);
 assert.equal(zombieProfile(2).hp,220);assert.ok(zombieProfile(2,5).hp>220);assert.equal(zombieProfile(3).name,brawler.name);
});
test('close zombie head and body register short, inside, and fast glove sweeps',()=>{
 const z=BOXING_STOP_Z;
 const torso={a:[.16,1.06,z+.02],b:[.16,1.21,z+.02],radius:.235};
 const head={a:[.16,1.43,z+.043],b:[.16,1.585,z+.033],radius:.15};
 const hit=(a,b)=>punchHitsBody({a,b},[torso,head]);
 assert.equal(hit([.23,1.15,-.25],[.23,1.15,-.6]),true);
 assert.equal(hit([.23,1.65,-.35],[.23,1.65,-.62]),true);
 assert.equal(hit([.23,1.2,-.5],[.23,1.2,-.62]),true);
 assert.equal(hit([.23,1.2,0],[.23,1.2,-1.1]),true);
 assert.equal(hit([1,1.2,0],[1,1.2,-1.1]),false);
 assert.equal(hit([.23,2.1,0],[.23,2.1,-1.1]),false);
 assert.equal(hit([.23,1.2,.15],[.23,1.2,.05]),false);
});
test('delayed arc classification checks earlier contact and capsule endpoints',()=>{
 const c={a:[0,1,-.5],b:[0,1.5,-.5],radius:.1};
 assert.equal(punchHitsBody({a:[.4,1.2,-.5],b:[.5,1.2,-.5],path:[[-.5,1.2,-.5],[0,1.2,-.5],[.4,1.2,-.5],[.5,1.2,-.5]]},[c]),true);
 assert.equal(sweptCapsuleHit([0,1.6,-.5],[0,1.6,-.5],c.a,c.b,.11),true);
 assert.equal(sweptCapsuleHit([0,2,-.5],[0,2,-.5],c.a,c.b,.11),false);
});
test('camera targets the nearest living opponent and advances on knockout',()=>{const far={hp:2,root:{position:{z:-4}}},near={hp:2,root:{position:{z:-.7}}};assert.equal(nextOpponent([far,near]),near);strike(near);assert.equal(nextOpponent([far,near]),near);strike(near);assert.equal(nextOpponent([far,near]),far);far.dead=.1;assert.equal(nextOpponent([far,near]),null);});
test('practice punch extends smoothly and fully retracts',()=>{assert.equal(punchExtension(-1),0);assert.equal(punchExtension(0),0);assert.equal(punchExtension(.15),1);assert.ok(punchExtension(.3)>0&&punchExtension(.3)<1);assert.equal(punchExtension(.5),0);});
