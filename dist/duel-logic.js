import {sweptCapsuleHit} from './game-logic.js';
import {gripQuaternion} from './motion.js';
export const DUEL_STYLES=[
 {name:'Vanguard',windup:1.05,swing:.48,guard:.65,opening:1.65,points:200,color:'#8fbcc4'},
 {name:'Duelist',windup:.78,swing:.36,guard:.55,opening:1.35,points:250,color:'#c9a6df'},
 {name:'Warden',windup:1.3,swing:.56,guard:.7,opening:1.8,points:300,color:'#e2ba78'}
];
export class SwordDuel {
 constructor(index=0){this.style=DUEL_STYLES[index%DUEL_STYLES.length];this.phase='approach';this.time=0;this.parryStroke=-1;this.parries=0;}
 enter(phase){this.phase=phase;this.time=0;}
 step(dt,inReach){
  if(this.phase==='dead'||!inReach)return null;
  if(this.phase==='approach')this.enter('guard');
  this.time+=dt;
  if(this.phase==='guard'&&this.time>=this.style.guard){this.enter('windup');return 'warn';}
  if(this.phase==='windup'&&this.time>=this.style.windup){this.enter('swing');return 'swing';}
  if(this.phase==='swing'&&this.time>=this.style.swing){this.enter('recover');return 'hurt';}
  if(this.phase==='open'&&this.time>=this.style.opening){this.enter('guard');return 'closed';}
  if(this.phase==='recover'&&this.time>=.65)this.enter('guard');
  return null;
 }
 get canParry(){return this.phase==='swing'||this.phase==='windup'&&this.time>=this.style.windup-.12;}
 parry(stroke){if(!this.canParry)return false;this.parryStroke=stroke;this.parries++;this.enter('open');return true;}
 counter(stroke,speed,contact){
  if(this.phase!=='open'||this.time<.14||stroke<=this.parryStroke||speed<.65||!contact)return false;
  this.enter('dead');return true;
 }
}

export function bladesMeet(player,enemy,previousPlayer=player,previousEnemy=enemy){
 const axis=b=>b.tip.map((v,i)=>v-b.base[i]),a=axis(player),b=axis(enemy),an=Math.hypot(...a),bn=Math.hypot(...b);
 // The blades must cross, rather than merely point alongside one another.
 if(an<.1||bn<.1||Math.abs(a.reduce((s,x,i)=>s+x*b[i],0)/(an*bn))>.96)return false;
 return sweptCapsuleHit(player.base,player.tip,enemy.base,enemy.tip,.11)
  ||sweptCapsuleHit(previousEnemy.tip,enemy.tip,player.base,player.tip,.11)
  ||sweptCapsuleHit(previousPlayer.tip,player.tip,enemy.base,enemy.tip,.11);
}

export class BladeStroke {
 constructor(){this.reset();}
 reset(preserveId=false){this.previous=null;this.time=0;this.id=preserveId?(this.id||0):0;this.moving=false;this.quiet=0;this.direction=null;this.tip=null;this.reach=0;}
 sample(p,time){
  const dt=(time-this.time)/1000,previous=this.previous;this.previous=p;this.time=time;
  if(!previous||dt<=0||dt>.15){this.moving=false;this.quiet=0;return {id:this.id,speed:0};}
  const delta=p.map((v,i)=>v-previous[i]),speed=Math.hypot(...delta)/dt;
  if(speed<.28){this.quiet+=dt;if(this.quiet>.08)this.moving=false;}else this.quiet=0;
  if(speed>.65){
   const dir=delta.map(v=>v/(speed*dt));
   if(!this.moving){this.id++;this.moving=true;this.direction=dir;this.tip=p;}
   else if(dir.reduce((s,v,i)=>s+v*this.direction[i],0)<-.35&&Math.hypot(...p.map((v,i)=>v-this.tip[i]))>.07){this.id++;this.direction=dir;this.tip=p;}
   else if(dir.reduce((s,v,i)=>s+v*this.direction[i],0)>.3)this.tip=p;
  }
  return {id:this.id,speed};
 }
}

function rotate([vx,vy,vz],[x,y,z,w]){const tx=2*(y*vz-z*vy),ty=2*(z*vx-x*vz),tz=2*(x*vy-y*vx);return [vx+w*tx+y*tz-z*ty,vy+w*ty+z*tx-x*tz,vz+w*tz+x*ty-y*tx];}
export function bladePose(wrist,quaternion){
 const offset=rotate([0,-.07,-.075],quaternion),axis=rotate([0,.72,0],gripQuaternion(quaternion));
 const base=wrist.map((v,i)=>v+offset[i]);return {base,tip:base.map((v,i)=>v+axis[i])};
}

// Retain curved travel between rendered frames without queuing the displayed pose.
export class BladeHistory {
 constructor(){this.stroke=new BladeStroke();this.previous=null;}
 reset(preserveId=false){this.previous=null;this.stroke.reset(preserveId);}
 consume(samples){
  const sweeps=[],latest=samples.at(-1)?.time;
  if(this.previous&&latest-this.previous.time>100)this.reset(true);
  for(const sample of samples.slice(-12)){
   if(!Number.isFinite(sample.time)||latest-sample.time>100||!sample.p?.every(Number.isFinite)||!sample.q?.every(Number.isFinite)||sample.p.length!==3||sample.q.length!==4)continue;
   if(this.previous&&sample.time<=this.previous.time)continue;
   const current={...bladePose(sample.p,sample.q),time:sample.time};
   const continuous=this.previous&&sample.time-this.previous.time<=150;
   const motion=this.stroke.sample(current.tip,sample.time);
   sweeps.push({current,previous:continuous?this.previous:current,speed:continuous?motion.speed:0,id:motion.id});this.previous=current;
  }
  return sweeps;
 }
}
