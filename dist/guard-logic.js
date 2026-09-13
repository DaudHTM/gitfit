export const GUARD={plane:-.5,radius:.23,surgeRadius:.34,speed:1.8,x:[-.4,.55],y:[.82,1.82]};
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const points=[[.18,1.3],[-.20,1.38],[.42,1.17],[.08,1.66],[.30,1.02],[-.16,1.28],[.42,1.52],[.15,1.45]];
export const GUARD_WAVES=['Warm-up','Crossfire','Meteor rush'];
export function guardPosition(from,dt,keys=[],target=null){
 if(!Number.isFinite(dt)||dt<=0||dt>.25)return [...from];
 const next=target||[from[0]+(keys.includes('ArrowRight')-keys.includes('ArrowLeft'))*GUARD.speed*dt,from[1]+(keys.includes('ArrowUp')-keys.includes('ArrowDown'))*GUARD.speed*dt];
 return [clamp(Number.isFinite(next[0])?next[0]:from[0],...GUARD.x),clamp(Number.isFinite(next[1])?next[1]:from[1],...GUARD.y)];
}
export function guardCue([x,y]){return [y>1.5?'HIGH':y<1.15?'LOW':'',x<-.05?'LEFT':x>.32?'RIGHT':'CENTER'].filter(Boolean).join(' ');}
export function guardShotPosition(shot){
 const t=clamp(shot.age/shot.duration,0,1),arc=Math.sin(t*Math.PI);
 return [shot.target[0]+arc*shot.sway,shot.target[1]+arc*.25,-6+5.5*t];
}
export class GuardCourse{
 constructor(){this.reset();}
 reset(){this.time=0;this.score=0;this.hp=5;this.combo=0;this.bestCombo=0;this.totalHits=0;this.perfects=0;this.surge=0;this.index=0;this.next=.65;this.shots=[];this.wave=1;}
 get over(){return this.hp<=0||this.time>=60;}
 get radius(){return this.surge>0?GUARD.surgeRadius:GUARD.radius;}
 get front(){return this.shots.reduce((best,s)=>!best||s.duration-s.age<best.duration-best.age?s:best,null);}
 spawn(){
  const id=this.index++,wave=1+Math.floor(id/6),ion=wave>1&&id%3===1,target=points[id%points.length];this.wave=wave;
  this.shots.push({id,target:[...target],born:this.next,age:0,duration:ion?1.85:Math.max(2.1,2.85-(wave-1)*.18),radius:ion?.09:.13,sway:(id%2?1:-1)*(ion?.15:.38),type:ion?'ION':'METEOR',color:ion?'#edbe77':'#9bdded'});
  this.next+=wave===1?1.8:wave===2?1.35:Math.max(.82,1.22-wave*.055);
 }
 step(dt,from,to){
  if(this.over||!Number.isFinite(dt)||dt<=0||dt>.25||![...from,...to].every(Number.isFinite))return [];
  this.time+=dt;this.surge=Math.max(0,this.surge-dt);if(this.time>=this.next&&this.shots.length<6)this.spawn();
  const events=[];
  for(const shot of this.shots){
   const before=shot.age;shot.age=Math.max(0,this.time-shot.born);if(shot.age<shot.duration)continue;
   // Interpolate the shield at the exact plane crossing, even on a fast frame.
   const u=clamp((shot.duration-before)/dt,0,1),point=from.map((v,i)=>v+(to[i]-v)*u),error=Math.hypot(...point.map((v,i)=>v-shot.target[i]));shot.done=true;
   if(error<=this.radius+shot.radius-.025){
    const perfect=error<=.105;this.combo++;this.bestCombo=Math.max(this.bestCombo,this.combo);this.totalHits++;if(perfect)this.perfects++;
    const points=(perfect?150:100)+Math.min(15,this.combo-1)*10;this.score+=points;const surge=perfect&&this.perfects%4===0;if(surge)this.surge=5;
    events.push({type:'block',shot,perfect,surge,points});
   }else{this.hp--;this.combo=0;events.push({type:'miss',shot});if(this.hp===0)break;}
  }
  this.shots=this.shots.filter(s=>!s.done);return events;
 }
}
