import test from 'node:test';
import assert from 'node:assert/strict';
import {approachAngle,turnHeading,boxingPoint,boxingSweep,engagedOpponent} from '../dist/boxing-space.js';
import {punchHitsBody} from '../dist/game-logic.js';
import {TrajectoryPunchTracker} from '../dist/motion.js';

test('angled encounters preserve close glove hits and misses in the rendered world',()=>{
 const capsule={a:[.16,1.06,-.76],b:[.16,1.21,-.76],radius:.235};
 for(let i=0;i<21;i++){
  const yaw=approachAngle(i),volume={...capsule,a:boxingPoint(capsule.a,yaw),b:boxingPoint(capsule.b,yaw)};
  const hit=boxingSweep({a:[.23,1.2,-.4],b:[.23,1.2,-.65],path:[[.23,1.2,-.3],[.23,1.2,-.4],[.23,1.2,-.65]],damage:50,type:'jab'},yaw);
  assert.equal(punchHitsBody(hit,[volume]),true);assert.equal(hit.damage,50);assert.equal(hit.type,'jab');
  assert.equal(punchHitsBody(boxingSweep({a:[1,1.2,0],b:[1,1.2,-1]},yaw),[volume]),false);
 }
});
test('the selected opponent stays locked until defeated, then changes to the nearest waiting opponent',()=>{
 const current={hp:100,distance:.8},left={hp:70,distance:1.75,angle:-.34},right={hp:220,distance:2.1,angle:.3},enemies=[right,current,left];
 assert.equal(engagedOpponent(enemies,null),current);left.distance=.7;assert.equal(engagedOpponent(enemies,current),current);
 current.hp=0;assert.equal(engagedOpponent(enemies,current),left);left.dead=.1;assert.equal(engagedOpponent(enemies,left),right);
 right.hp=0;assert.equal(engagedOpponent(enemies,right),null);
});
test('automatic view turns converge equally at different frame rates and cannot create a sensor punch',()=>{
 const headings=[];for(const hz of [30,60,120]){let yaw=-.34;const detector=new TrajectoryPunchTracker();for(let i=0;i<hz;i++){yaw=turnHeading(yaw,.39,1/hz);assert.equal(detector.sample([.23,1.3,-.3],i*1000/hz),null);}headings.push(yaw);}
 assert.ok(Math.abs(headings[0]-headings[2])<1e-12);assert.ok(Math.abs(headings[0]-.39)<.001);
 assert.ok(turnHeading(Math.PI-.02,-Math.PI+.02,.05)>Math.PI-.02);
});
