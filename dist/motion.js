// Coordinates: +X right, +Y up, -Z forward. Positions are reconstructed wrists.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const sub=(a,b)=>a.map((x,i)=>x-b[i]);
const length=a=>Math.hypot(...a);
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);

export function classifyPunch(points){
 if(points.length<3)return {type:'swing',straightness:0,turn:0};
 const travel=[0,0,0],directions=[];let distance=0;
 for(let i=1;i<points.length;i++){
  const d=sub(points[i].p,points[i-1].p),n=length(d);if(n<.0001)continue;
  distance+=n;d.forEach((v,j)=>travel[j]+=Math.abs(v));directions.push(d.map(v=>v/n));
 }
 const displacement=sub(points.at(-1).p,points[0].p),straightness=distance?length(displacement)/distance:0;
 // Compare averaged early and late velocities, avoiding noisy adjacent angles.
 const mean=arr=>{const v=[0,0,0];arr.forEach(a=>a.forEach((x,j)=>v[j]+=x));const n=length(v)||1;return v.map(x=>x/n);};
 const n=Math.max(1,Math.floor(directions.length/3));
 const turn=directions.length?Math.acos(clamp(dot(mean(directions.slice(0,n)),mean(directions.slice(-n))),-1,1)):0;
 const [lateral,vertical,depth]=travel;let type='swing';
 if(displacement[1]>.055&&vertical>lateral*.9&&vertical>depth*.55&&turn>.12)type='uppercut';
 else if(lateral>depth*.35&&lateral>vertical*1.1&&turn>.2&&Math.abs(displacement[0])>.06)type='hook';
 else if(displacement[2]<-.06&&depth>lateral*1.35&&depth>vertical*1.2&&straightness>.84&&turn<.2)type='jab';
 return {type,straightness,turn};
}
export function damageFromSpeed(speed){return Number.isFinite(speed)?Math.round(18+clamp(speed-.6,0,3.4)*22):0;}

export class WristMotion {
 constructor(){this.reset();}
 reset(){this.previous=null;this.filtered=null;this.time=null;this.velocity=[0,0,0];}
 sample(p,time){
  if(!p.every(Number.isFinite)||!Number.isFinite(time))return null;
  const dt=(time-this.time)/1000;
  if(!this.previous||dt<=0||dt>.15){this.previous=[...p];this.filtered=[...p];this.time=time;this.velocity=[0,0,0];return null;}
  const before=[...this.filtered],rawV=p.map((v,i)=>(v-this.previous[i])/dt),alpha=1-Math.exp(-dt/.018);
  this.filtered=p.map((v,i)=>before[i]+alpha*(v-before[i]));
  const v=this.filtered.map((x,i)=>(x-before[i])/dt);this.previous=[...p];this.time=time;
  if(length(v)>12){this.reset();return null;}
  this.velocity=v;return {p:[...this.filtered],a:before,b:[...this.filtered],v,rawV,speed:length(v),time,dt};
 }
}
export class TrajectoryPunchTracker {
 constructor(){this.reset();}
 reset(){this.motion=new WristMotion();this.points=[];this.active=false;this.used=false;this.quietSince=null;this.id=0;this.peak=0;this.distance=0;this.recovering=null;this.reach=0;this.reachPoint=null;this.outward=null;this.contactSent=false;}
 sample(position,time){
  const m=this.motion.sample(position,time);if(!m){this.active=false;this.points=[];this.used=false;this.recovering=null;return null;}
  if(m.speed<.22){this.quietSince??=time;if(time-this.quietSince>120){this.active=false;this.used=false;this.points=[];this.recovering=null;}}else this.quietSince=null;
  if(!this.active){
   // Retraction rearms without requiring a perfectly still hand or the exact old guard.
   if(this.recovering&&dot(m.v,this.recovering)<.35&&m.v[2]>-.55&&m.v[1]<.55)return null;
   // Backward recovery alone never starts a new strike.
   if(m.speed<.55||m.v[2]>.5&&Math.abs(m.v[0])<.6&&m.v[1]<.5)return null;
   this.active=true;this.used=false;this.recovering=null;this.points=[{p:m.a,time:time-m.dt*1000}];this.peak=0;this.distance=0;this.reach=0;this.reachPoint=null;this.outward=null;this.contactSent=false;this.id++;
  }
  this.points.push({p:m.p,time});if(this.points.length>80)this.points.splice(1,1);this.distance+=length(sub(m.b,m.a));this.peak=Math.max(this.peak,m.speed);
  const displacement=sub(m.p,this.points[0].p),reach=length(displacement);
  if(reach>this.reach){this.reach=reach;this.reachPoint=m.p;this.outward=displacement.map(v=>v/(reach||1));}
  if(this.reach>.08&&dot(sub(this.reachPoint,m.p),this.outward)>.08&&dot(m.v,this.outward)<-.25){this.recovering=this.outward;this.active=false;this.used=false;this.points=[];return null;}
  if(time-this.points[0].time>750){this.used=true;return null;}
  if(this.used||this.distance<.06||time-this.points[0].time<35||m.speed<.3)return null;
  // The short smoothing tail must not turn actual backward recovery into a hit.
  if(this.outward&&dot(m.rawV,this.outward)<-.25)return null;
  const shape=classifyPunch(this.points);
  if(shape.type==='swing')return null;
  // Reject backward/downward recovery after a missed forward/upward stroke.
  if(shape.type==='jab'&&m.v[2]>.05||shape.type==='uppercut'&&m.v[1]<-.1)return null;
  // When an arc becomes classifiable, also test its earlier travel for contact.
  const path=this.contactSent?[m.a,m.b]:this.points.map(point=>point.p);this.contactSent=true;
  return {...m,...shape,path,peakSpeed:this.peak,damage:damageFromSpeed(this.peak),id:this.id};
 }
 consume(){this.used=true;}
}

export class FlapTracker {
 constructor(){this.motion=new WristMotion();this.travel=0;this.down=false;}
 reset(){this.motion.reset();this.travel=0;this.down=false;}
 sample(p,time){
  const m=this.motion.sample(p,time);if(!m){this.travel=0;this.down=false;return null;}
  const down=-m.v[1];if(down<.25){this.travel=0;this.down=false;return null;}
  this.travel+=Math.max(0,m.a[1]-m.b[1]);
  if(down<.5||this.travel<.025)return null;
  const started=!this.down;this.down=true;
  // Only vertical downstroke energy matters in the fixed flight lane.
  const energy=clamp(down,0,5)**2*m.dt;
  return {lift:energy*2.6,started,strength:down};
 }
}
export const FLIGHT={speed:4,floor:0,ceiling:6,radius:.18,birdZ:-.5,gateDepth:1,spacing:9.6};
export class FlightDynamics {
 constructor(){this.reset();}
 reset(){this.x=0;this.y=2.6;this.vx=0;this.vy=0;this.speed=FLIGHT.speed;this.lastStrength=0;this.flapAge=10;}
 impulse(f){if(!f||!Number.isFinite(f.lift)||f.lift<=0)return;if(f.started)this.vy=Math.max(0,this.vy);this.vy=clamp(this.vy+f.lift,-4,3.6);this.lastStrength=f.strength||0;this.flapAge=0;}
 step(dt){
  if(dt<=0||dt>.25)return false;
  this.flapAge+=dt;this.vy=Math.max(-4,this.vy-dt*2.8);this.y+=this.vy*dt;
  // Forward motion is automatic; lateral wrist movement never steers the bird.
  this.x=this.vx=0;this.speed=FLIGHT.speed;
  const crashed=this.y-FLIGHT.radius<=FLIGHT.floor;
  if(this.y+FLIGHT.radius>=FLIGHT.ceiling)this.vy=Math.min(0,this.vy);
  this.y=clamp(this.y,FLIGHT.floor+FLIGHT.radius,FLIGHT.ceiling-FLIGHT.radius);return crashed;
 }
}

export function practiceStroke(seconds,type='jab',effort=2){
 const guard=[.23,1.27,-.22],start=type==='hook'?[.49,1.27,-.26]:type==='uppercut'?[.23,1.01,-.28]:guard;
 const duration=.28/(.6+effort*.3),ease=t=>t*t*(3-2*t),mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
 if(seconds<0)return {p:guard,phase:'guard'};
 if(seconds<.12)return {p:mix(guard,start,ease(seconds/.12)),phase:'prepare'};
 const t=clamp((seconds-.12)/duration,0,1);
 function arc(u){
  if(type==='hook')return [.49-.49*(1-Math.cos(u*Math.PI/2)),1.27+.04*Math.sin(u*Math.PI),-.26-.31*Math.sin(u*Math.PI/2)];
  if(type==='uppercut')return [.23,1.01+.51*Math.sin(u*Math.PI/2),-.28-.25*(1-Math.cos(u*Math.PI/2))];
  return [.23,1.27,-.22-.36*u];
 }
 if(seconds<.12+duration)return {p:arc(t),phase:'strike'};
 const recovery=(seconds-.12-duration)/.32;
 return recovery<1?{p:mix(arc(1),guard,ease(recovery)),phase:'recover'}:{p:guard,phase:'guard'};
}

export function gripQuaternion([x,y,z,w]){
 const s=Math.SQRT1_2;return [s*(x-w),s*(y-z),s*(z+y),s*(w+x)];
}
