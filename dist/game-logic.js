// World-space swept collision prevents a fast fist skipping through a target.
export function sweptHit(a,b,c,r){const d=b.map((v,i)=>v-a[i]);const n=d.reduce((s,v)=>s+v*v,0);const t=n?Math.max(0,Math.min(1,c.reduce((s,v,i)=>s+(v-a[i])*d[i],0)/n)):0;return c.reduce((s,v,i)=>s+(a[i]+t*d[i]-v)**2,0)<=r*r;}
export const BOXING_STOP_Z=-.78;
export const GLOVE_RADIUS=.13;
const ZOMBIE_TYPES=[
 {name:'Brawler',hp:100,speed:1,attackPeriod:2.3,points:100,build:1},
 {name:'Runner',hp:70,speed:1.35,attackPeriod:1.85,points:125,build:.9},
 {name:'Brute',hp:220,speed:.78,attackPeriod:2.85,points:225,build:1.2}
];
export function zombieProfile(index=0,wave=1){const type=ZOMBIE_TYPES[Math.abs(Math.floor(index))%ZOMBIE_TYPES.length];return {...type,hp:type.hp+Math.min(60,Math.max(0,Math.floor(wave-1))*8)};}
// Distance between two segments: a moving glove versus an animated body capsule.
// Includes strokes beginning inside a collider, and fast strokes crossing it.
export function sweptCapsuleHit(a,b,c,d,r){
 const sub=(p,q)=>p.map((v,i)=>v-q[i]),dot=(p,q)=>p.reduce((s,v,i)=>s+v*q[i],0),clamp=v=>Math.max(0,Math.min(1,v));
 const u=sub(b,a),v=sub(d,c),w=sub(a,c),aa=dot(u,u),bb=dot(u,v),cc=dot(v,v),dd=dot(u,w),ee=dot(v,w);let s=0,t=0;
 if(aa<1e-10&&cc<1e-10)return dot(w,w)<=r*r;
 if(aa<1e-10)t=clamp(ee/cc);
 else if(cc<1e-10)s=clamp(-dd/aa);
 else {const denom=aa*cc-bb*bb;s=denom>1e-10?clamp((bb*ee-cc*dd)/denom):0;t=(bb*s+ee)/cc;if(t<0){t=0;s=clamp(-dd/aa);}else if(t>1){t=1;s=clamp((bb-dd)/aa);}}
 return w.reduce((sum,x,i)=>sum+(x+s*u[i]-t*v[i])**2,0)<=r*r;
}
export function punchHitsBody(sweep,capsules){
 const path=sweep.path||[sweep.a,sweep.b];
 return capsules.some(c=>path.some((p,i)=>i>0&&sweptCapsuleHit(path[i-1],p,c.a,c.b,c.radius+GLOVE_RADIUS)));
}
export class PunchTracker{
 constructor(){this.reset()}
 reset(){this.previous=null;this.time=0;this.active=false;this.used=false;this.farthest=0;this.origin=0;}
 sample(position,time){const b=[...position],a=this.previous;const dt=(time-this.time)/1000;this.previous=b;this.time=time;if(!a||dt<=0||dt>.15){this.active=false;this.used=false;this.origin=b[2];return null;}
 const speed=Math.hypot(...b.map((v,i)=>v-a[i]))/dt,forward=(a[2]-b[2])/dt;
 if(this.active){this.farthest=Math.min(this.farthest,b[2]);if(b[2]-this.farthest>.09){this.active=false;this.used=false;this.origin=b[2];}}
 else if(forward>.45&&speed>.65){this.active=true;this.used=false;this.farthest=b[2];this.origin=a[2];}
 // Only outward travel can connect. A retraction is never a punch.
 return this.active&&!this.used&&forward>.10?{a,b,speed}:null;
 }
 consume(){this.used=true;}
}
export function strike(enemy,damage=1){if(enemy.hp<=0||!Number.isFinite(damage)||damage<=0)return false;enemy.hp=Math.max(0,enemy.hp-damage);return enemy.hp===0;}

export function nextOpponent(enemies){return enemies.reduce((nearest,e)=>e.hp>0&&!e.dead&&(!nearest||e.root.position.z>nearest.root.position.z)?e:nearest,null);}
export function punchExtension(seconds){
 if(seconds<0||seconds>.46)return 0;
 if(seconds<.15){const t=seconds/.15;return t*t*(3-2*t);}
 const t=(seconds-.15)/.31;return 1-t*t*(3-2*t);
}
