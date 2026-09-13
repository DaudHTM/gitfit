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
function flap(speed,side=0){const f=new FlapTracker(),sum={lift:0};for(let i=0;i<=20;i++){const e=f.sample([side*i*.01,1.6-speed*i*.01,-.3],i*10);if(e)sum.lift+=e.lift;}return sum;}
test('stronger downstrokes produce more lift',()=>{const easy=flap(1),hard=flap(2);assert.ok(hard.lift>easy.lift*2);});
test('upstrokes do not propel and lateral flaps cannot steer',()=>{assert.equal(flap(-1).lift,0);assert.equal(flap(1,-1).lift,flap(1,1).lift);const f=new FlightDynamics();f.impulse({lift:1,side:10,thrust:100,strength:1});for(let i=0;i<30;i++)f.step(.01);assert.equal(f.x,0);assert.equal(f.vx,0);assert.equal(f.speed,4);});
test('flight falls without flaps; downstrokes lift at constant forward speed',()=>{const a=new FlightDynamics(),b=new FlightDynamics();b.impulse({...flap(2),started:true,strength:2});for(let i=0;i<30;i++){a.step(.01);b.step(.01);}assert.ok(b.y>a.y);assert.equal(b.speed,a.speed);assert.ok(a.y<2.6);});
test('short retractions rearm live punches without returning to the original guard',()=>{
 const tracker=new TrajectoryPunchTracker();let time=0,hits=0,recoveryHits=0;
 const leg=(from,to,n,recovery=false)=>{for(let i=1;i<=n;i++){const e=tracker.sample([.23,1.28,from+(to-from)*i/n],time+=10);if(e){if(recovery)recoveryHits++;else{hits++;tracker.consume();}}}};
 tracker.sample([.23,1.28,-.12],time);leg(-.12,-.43,20);leg(-.43,-.28,20,true);leg(-.28,-.55,20);leg(-.55,-.36,20,true);leg(-.36,-.63,20);
 assert.equal(hits,3);assert.equal(recoveryHits,0);
 for(let i=0;i<100;i++)assert.equal(tracker.sample([.23,1.28,-.63],time+=10),null);
});
test('a missed stroke also rearms on recovery, and initial classification retains its path',()=>{
 const tracker=new TrajectoryPunchTracker();let time=0,first,id1,id2;
 for(let i=0;i<=20;i++){const e=tracker.sample([.23,1.28,-.12-i*.015],time+=10);if(e){first??=e;id1=e.id;}}
 assert.ok(first.path.length>2);assert.ok(first.path[0][2]>first.a[2]);
 for(let i=1;i<=20;i++)assert.equal(tracker.sample([.23,1.28,-.42+i*.008],time+=10),null);
 for(let i=1;i<=20;i++){const e=tracker.sample([.23,1.28,-.26-i*.015],time+=10);if(e)id2=e.id;}
 assert.ok(id2>id1);
});
import {gripQuaternion} from '../dist/motion.js';
test('blade remains perpendicular to the forearm for arbitrary wrist orientations',()=>{
 const rotate=(v,q)=>{const [x,y,z,w]=q,[vx,vy,vz]=v;const tx=2*(y*vz-z*vy),ty=2*(z*vx-x*vz),tz=2*(x*vy-y*vx);return [vx+w*tx+y*tz-z*ty,vy+w*ty+z*tx-x*tz,vz+w*tz+x*ty-y*tx];};
 for(let i=0;i<60;i++){let q=[Math.sin(i*.7),Math.cos(i*.3),Math.sin(i*.4),Math.cos(i*.9)];const n=Math.hypot(...q);q=q.map(v=>v/n);const arm=rotate([0,-1,0],q),blade=rotate([0,1,0],gripQuaternion(q));assert.ok(Math.abs(arm.reduce((sum,v,j)=>sum+v*blade[j],0))<1e-10);}
});
