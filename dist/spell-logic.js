export const SPELLS={
 jab:{name:'Firebolt',cue:'JAB · Forward',color:'#ffaf72',sound:'firebolt'},
 hook:{name:'Arc',cue:'HOOK · Sideways arc',color:'#a9a3ff',sound:'arcSpell'},
 uppercut:{name:'Rise',cue:'UPPERCUT · Upward arc',color:'#89f3d3',sound:'riseSpell'}
};
const order=Object.keys(SPELLS);

export class SpellRun {
 constructor(){this.reset();}
 reset(){this.time=0;this.score=0;this.hp=5;this.combo=0;this.bestCombo=0;this.defeated=0;this.casts=0;this.correct=0;this.overdrive=0;this.next=2.9;this.index=0;this.cooldown=0;this.enemies=[];this.spawn();}
 spawn(){
  const id=this.index++,first=order[id%3],layers=id<3?1:2;
  this.enemies.push({id,z:id===0?-4.4:-6.6,x:Math.sin(id*2.4)*.38,y:1.55+Math.sin(id*1.7)*.16,types:layers===1?[first]:[first,order[(id+1)%3]],layer:0,dead:false,warning:false,born:this.time});
 }
 get front(){return this.enemies.find(e=>!e.dead)||null;}
 get over(){return this.hp<=0||this.time>=60;}
 cast(type){
  const e=this.front;if(this.over||!e||!SPELLS[type]||this.cooldown>0)return null;
  this.cooldown=.32;this.casts++;
  if(type!==e.types[e.layer]){this.combo=0;return {type:'deflect',enemy:e,required:e.types[e.layer]};}
  this.correct++;this.combo++;this.bestCombo=Math.max(this.bestCombo,this.combo);e.layer++;
  const destroyed=e.layer===e.types.length,multiplier=this.overdrive>0?2:1,points=(destroyed?150:75)*multiplier+Math.min(10,this.combo-1)*10;
  this.score+=points;let overdrive=false;
  if(destroyed){e.dead=true;this.defeated++;if(this.defeated%5===0){this.overdrive=6;overdrive=true;}}
  return {type:destroyed?'shatter':'break',enemy:e,spell:type,points,overdrive};
 }
 step(dt){
  if(this.over||!Number.isFinite(dt)||dt<=0||dt>.25)return [];
  this.time+=dt;this.cooldown=Math.max(0,this.cooldown-dt);this.overdrive=Math.max(0,this.overdrive-dt);
  const events=[];this.enemies=this.enemies.filter(e=>!e.dead);
  if(this.time>=this.next&&this.enemies.length<3){this.spawn();this.next=this.time+Math.max(1.8,3-this.defeated*.06);}
  let limit=-.52;
  for(const e of this.enemies){
   e.z=Math.min(limit,e.z+dt*(.82+Math.min(.38,this.defeated*.02)));limit=e.z-1.4;
   if(e.z>-1.55&&!e.warning){e.warning=true;events.push({type:'warn',enemy:e});}
   if(e.z>=-.53){e.dead=true;this.hp=Math.max(0,this.hp-1);this.combo=0;events.push({type:'hurt',enemy:e});if(this.hp===0)break;}
  }
  // An empty lane refills promptly; the next gesture is visible during a short demo.
  if(!this.front&&this.time<this.next)this.next=Math.min(this.next,this.time+.45);
  return events;
 }
}
