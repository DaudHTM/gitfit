// World-space swept collision prevents a fast fist skipping through a target.
export function sweptHit(a,b,c,r){const d=b.map((v,i)=>v-a[i]);const n=d.reduce((s,v)=>s+v*v,0);const t=n?Math.max(0,Math.min(1,c.reduce((s,v,i)=>s+(v-a[i])*d[i],0)/n)):0;return c.reduce((s,v,i)=>s+(a[i]+t*d[i]-v)**2,0)<=r*r;}
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
export function strike(enemy){if(enemy.hp<=0)return false;enemy.hp--;return enemy.hp===0;}
