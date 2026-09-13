import test from 'node:test';
import assert from 'node:assert/strict';
import {FlightCourse,flightGate,flightGateHit} from '../dist/flight-logic.js';
import {FLIGHT} from '../dist/motion.js';

test('flight waits without consuming distance or time until the first valid downstroke',()=>{
 const c=new FlightCourse(),start=c.gates.map(g=>g.z),height=c.flight.y;
 for(let i=0;i<600;i++)c.step(.02);
 assert.equal(c.started,false);assert.equal(c.over,false);assert.equal(c.time,0);assert.equal(c.distance,0);assert.equal(c.flight.y,height);assert.deepEqual(c.gates.map(g=>g.z),start);
 for(const f of [null,{lift:0},{lift:-1},{lift:NaN}])assert.equal(c.flap(f),false);
 assert.equal(c.flap({lift:2.4,started:true,strength:2}),true);c.step(.1);assert.ok(c.flight.y>height);assert.equal(c.distance,.4);assert.equal(c.time,.1);
 c.reset();c.step(.2);assert.equal(c.started,false);assert.equal(c.time,0);
});

test('flight gates leave achievable vertical gaps, with no lateral route',()=>{
 let previous=2.6;
 for(let i=0;i<100;i++){const g=flightGate(i),center=(g.top+g.bottom)/2;assert.ok(g.bottom>FLIGHT.floor);assert.ok(g.top<FLIGHT.ceiling);assert.ok(g.top-g.bottom>=1.8-1e-9);assert.ok(Math.abs(center-previous)<=1.5);previous=center;}
});
test('gate collision checks upper/lower obstacles across the full depth and fast frames',()=>{
 const g=flightGate(0);
 assert.equal(flightGateHit(g,-2,1,2.6,2.6),false);
 assert.equal(flightGateHit(g,-2,1,1,1),true);
 assert.equal(flightGateHit(g,-2,1,4,4),true);
 assert.equal(flightGateHit(g,-.8,-.2,2.6,4),true);
 assert.equal(flightGateHit(g,-10,-9,1,1),false);
 assert.equal(flightGateHit(g,1,2,1,1),false);
});
test('gaps score only after fully clearing the obstacle and never twice',()=>{
 const c=new FlightCourse();c.flap({lift:.001,started:true,strength:.001});c.gates=[flightGate(0,-1),flightGate(1,-20)];
 assert.deepEqual(c.step(.1),[]);assert.equal(c.score,0);
 c.step(.1);assert.equal(c.score,0);
 const events=c.step(.1);assert.equal(events[0].type,'clear');assert.equal(c.score,100);assert.equal(c.passed,1);
 for(let i=0;i<5;i++)c.step(.05);assert.equal(c.score,100);
});
test('a collision ends flight once, freezes scoring, and reset starts a fresh course',()=>{
 const c=new FlightCourse();c.flap({lift:.001,started:true,strength:.001});c.gates=[flightGate(0,-1),flightGate(1,-20)];c.flight.y=1;
 assert.equal(c.step(.1)[0].type,'crash');assert.equal(c.over,true);assert.equal(c.score,0);
 const distance=c.distance;assert.deepEqual(c.step(.1),[]);assert.equal(c.distance,distance);
 c.reset();assert.equal(c.over,false);assert.equal(c.distance,0);assert.equal(c.gates.length,3);
 c.flap({lift:.001,started:true,strength:.001});let crash;for(let i=0;i<200&&!crash;i++)crash=c.step(.01).find(e=>e.type==='crash');assert.equal(crash.reason,'ground');
});
test('the sky limit clamps height without an invisible ceiling collision',()=>{
 const c=new FlightCourse();c.flap({lift:.001,started:true,strength:.001});c.flight.y=5.7;c.flight.vy=3;
 assert.deepEqual(c.step(.1),[]);assert.equal(c.over,false);assert.equal(c.flight.y,FLIGHT.ceiling-FLIGHT.radius);assert.equal(c.flight.vy,0);
});
