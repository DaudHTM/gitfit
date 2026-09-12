import test from 'node:test';import assert from 'node:assert/strict';
import {classifyPunch,TrajectoryPunchTracker,damageFromSpeed,FlapTracker,FlightDynamics,practiceStroke} from '../dist/motion.js';
import {strike} from '../dist/game-logic.js';
const points=(fn,n=30)=>Array.from({length:n+1},(_,i)=>({p:fn(i/n),time:100+i*10}));
const paths={jab:t=>[.23,1.27,-.22-.36*t],hook:t=>[.49-.49*(1-Math.cos(t*Math.PI/2)),1.27,-.26-.31*Math.sin(t*Math.PI/2)],uppercut:t=>[.23,1.01+.51*Math.sin(t*Math.PI/2),-.28-.25*(1-Math.cos(t*Math.PI/2))]};
for(const type of Object.keys(paths))test(`recognizes ${type} from the trajectory`,()=>assert.equal(classifyPunch(points(paths[type])).type,type));
test('straight lateral motion is not mislabeled as a curved hook',()=>assert.equal(classifyPunch(points(t=>[t,1.2,-.3])).type,'swing'));
test('small resting noise does not generate a punch',()=>{const p=new TrajectoryPunchTracker();for(let i=0;i<200;i++)assert.equal(p.sample([.23+.001*Math.sin(i),1.2+.001*Math.cos(i),-.3],i*10),null);});
test('a consumed stroke can only damage once, then rest rearms it',()=>{const p=new TrajectoryPunchTracker();let events=0;for(const point of points(paths.jab)){const e=p.sample(point.p,point.time);if(e){events++;p.consume();}}assert.equal(events,1);for(let t=410;t<800;t+=10)p.sample(paths.jab(1),t);let second=false;for(const point of points(t=>[.23,1.27,-.58-.25*t])){const e=p.sample(point.p,point.time+700);if(e){second=true;p.consume();}}assert.ok(second);});
test('reconnect gap cannot turn a position jump into a strike',()=>{const p=new TrajectoryPunchTracker();p.sample([0,1,0],0);assert.equal(p.sample([0,1,-1],800),null);});
test('faster estimated speed gives more damage, bounded and health never negative',()=>{assert.ok(damageFromSpeed(3)>damageFromSpeed(1));assert.equal(damageFromSpeed(100),damageFromSpeed(4));assert.equal(damageFromSpeed(NaN),0);const z={hp:40};assert.equal(strike(z,damageFromSpeed(3)),true);assert.equal(z.hp,0);});
test('all three practice animations are detected by the same trajectory classifier',()=>{for(const type of Object.keys(paths)){const tracker=new TrajectoryPunchTracker();let event;for(let i=0;i<70;i++){const time=i*10,s=practiceStroke(time/1000,type,2);if(s.phase!=='strike'){tracker.reset();tracker.sample(s.p,time);}else{const next=tracker.sample(s.p,time);if(next)event=next;}}assert.equal(event?.type,type);}});
function flap(speed,side=0){const f=new FlapTracker(),sum={lift:0,thrust:0,side:0};for(let i=0;i<=20;i++){const e=f.sample([side*i*.01,1.6-speed*i*.01,-.3],i*10);if(e)for(const k of Object.keys(sum))sum[k]+=e[k];}return sum;}
test('stronger downstrokes produce more lift and thrust',()=>{const easy=flap(1),hard=flap(2);assert.ok(hard.lift>easy.lift*2);assert.ok(hard.thrust>easy.thrust*2);});
test('upstrokes do not propel and opposing diagonal flaps steer opposite ways',()=>{assert.equal(flap(-1).lift,0);assert.ok(flap(1,-1).side>0);assert.ok(flap(1,1).side<0);});
test('flight coasts and descends without flaps; impulses lift and accelerate',()=>{const a=new FlightDynamics(),b=new FlightDynamics();b.impulse({...flap(2),strength:2});for(let i=0;i<30;i++){a.step(.01);b.step(.01);}assert.ok(b.y>a.y);assert.ok(b.speed>a.speed);assert.ok(a.y<2.2);});
import {gripQuaternion} from '../dist/motion.js';
test('blade remains perpendicular to the forearm for arbitrary wrist orientations',()=>{
 const rotate=(v,q)=>{const [x,y,z,w]=q,[vx,vy,vz]=v;const tx=2*(y*vz-z*vy),ty=2*(z*vx-x*vz),tz=2*(x*vy-y*vx);return [vx+w*tx+y*tz-z*ty,vy+w*ty+z*tx-x*tz,vz+w*tz+x*ty-y*tx];};
 for(let i=0;i<60;i++){let q=[Math.sin(i*.7),Math.cos(i*.3),Math.sin(i*.4),Math.cos(i*.9)];const n=Math.hypot(...q);q=q.map(v=>v/n);const arm=rotate([0,-1,0],q),blade=rotate([0,1,0],gripQuaternion(q));assert.ok(Math.abs(arm.reduce((sum,v,j)=>sum+v*blade[j],0))<1e-10);}
});
