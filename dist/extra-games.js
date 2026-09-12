import * as T from 'three';
import {sweptHit} from './game-logic.js';
import {FlapTracker,FlightDynamics,gripQuaternion} from './motion.js';
export const GAMES={
 zombies:{title:'DEAD / AHEAD',tag:'POWER BOXING',intro:'Make every punch count.',help:'Jab forward, hook in a sideways arc, or uppercut in an upward arc. Faster wrist motion deals more damage. Recover between strikes.'},
 targets:{title:'TARGET / RUSH',tag:'PRECISION · 45 SECONDS',intro:'Aim for the center.',help:'Strike glowing targets with jabs, hooks, or uppercuts. Center hits and quick reactions earn bonus points.'},
 bird:{title:'SKY / BOUND',tag:'FLAP FLIGHT · 60 SECONDS',intro:'Earn your wings.',introHelp:'Flap down for lift and speed. Faster strokes boost more. Down-left steers right; down-right steers left. Recover upward between flaps. Practice: Space to flap, arrows or drag to aim.',help:'Flap down to gain lift and speed. Faster downstrokes give a stronger boost. Sweep down-left to steer right, down-right to steer left; a backward sweep adds speed. Recover upward, then flap again. Space flaps in practice; arrows or drag aim the next flap.'},
 saber:{title:'NEON / SABER',tag:'RHYTHM · 60 SECONDS',intro:'Slice into the rhythm.',help:'Swing through the blocks when they reach the glowing strike plane. Time your cuts to the pulse to build a combo. Space swings in practice.'},
 sword:{title:'BLADE / ARENA',tag:'SWORD SURVIVAL',intro:'Hold your ground.',help:'Slash through a knight’s armor, then swing again to finish. Watch their attack wind-up. Recover between swings. Space swings in practice.'},
 shield:{title:'ORBIT / GUARD',tag:'DEFENSE · 60 SECONDS',intro:'Become the shield.',help:'Move your hand to intercept meteors at the shield plane. Consecutive blocks grow your combo. Arrows or drag move the shield in practice.'}
};
// The grip is a rigid 90° rotation: blade +Y becomes hand -Z, perpendicular to forearm -Y.
export const GRIP_ROTATION=new T.Quaternion().fromArray(gripQuaternion([0,0,0,1]));
export function createExtraGames(scene,mesh,geo,feedback,sound){
 const group=new T.Group();scene.add(group);const objects=[],effects=[];
 const sword=new T.Group();group.add(sword);
 const blade=mesh(geo.box,'#c4e9f5',sword,[0,.36,0],[.055,.73,.025]);
 const glow=mesh(geo.box,'#7afbe2',sword,[0,.36,-.019],[.015,.7,.015]);glow.material=new T.MeshBasicMaterial({color:'#7afbe2'});
 mesh(geo.box,'#e8c99b',sword,[0,0,0],[.23,.035,.065]);mesh(geo.sphere,'#d1ac70',sword,[0,-.16,0],[.035,.035,.035]);
 mesh(geo.box,'#293d50',sword,[0,-.085,0],[.043,.14,.045]);for(let i=0;i<5;i++)mesh(geo.box,'#887b63',sword,[0,-.04-i*.022,.025],[.048,.008,.006]);
 const trailArray=new Float32Array(24),trailGeometry=new T.BufferGeometry();trailGeometry.setAttribute('position',new T.BufferAttribute(trailArray,3));
 const trail=new T.Line(trailGeometry,new T.LineBasicMaterial({color:'#84f1df',transparent:true,opacity:.65,depthWrite:false}));trail.frustumCulled=false;group.add(trail);let trailPoints=[];
 const shield=mesh(geo.sphere,'#5482a5',group,[0,1.3,-.5],[.22,.22,.035]);
 const shieldRing=new T.Mesh(new T.TorusGeometry(.235,.014,6,40),new T.MeshBasicMaterial({color:'#9cecff'}));group.add(shieldRing);
 const bird=new T.Group();group.add(bird);const body=new T.Group();bird.add(body);
 mesh(geo.sphere,'#f3d9a0',body,[0,-.04,0],[.13,.13,.32]);mesh(geo.sphere,'#fff5d8',body,[0,.06,-.24],[.10,.11,.13]);
 const wings=[-1,1].map(s=>{const pivot=new T.Group();pivot.position.set(s*.1,-.2,-.28);bird.add(pivot);mesh(geo.sphere,'#ddbb7c',pivot,[s*.38,0,0],[.49,.04,.22]);for(let i=0;i<6;i++){const feather=mesh(geo.sphere,i%2?'#f2d69b':'#b89155',pivot,[s*(.18+i*.11),-.012,.12+i*.025],[.09,.025,.25]);feather.rotation.y=s*(.05+i*.07);}return pivot;});
 const torus=new T.TorusGeometry(.78,.042,8,40),meteorGeometry=new T.IcosahedronGeometry(.13,1),flaps=new FlapTracker(),flight=new FlightDynamics();
 let mode,time,next,score,hp,combo,lastTip,lastBase,actionAt,clock,spawnIndex,prevTime,wingStroke=0,viewBehind=false;
 const position=new T.Vector3(),keys=new Set();let pointer=null,dragging=false;
 window.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)&&group.visible&&!/INPUT|SELECT/.test(e.target.tagName)){keys.add(e.key);pointer=null;e.preventDefault();}});
 window.addEventListener('keyup',e=>keys.delete(e.key));window.addEventListener('blur',()=>keys.clear());
 const viewport=document.getElementById('viewport');viewport.addEventListener('pointerdown',e=>{if(e.target.tagName==='CANVAS'){dragging=true;viewport.setPointerCapture(e.pointerId);}});
 viewport.addEventListener('pointermove',e=>{if(e.buttons&&dragging){const r=viewport.getBoundingClientRect();pointer={x:(e.clientX-r.left)/r.width*2-1,y:1-(e.clientY-r.top)/r.height*2};}});
 viewport.addEventListener('pointerup',()=>dragging=false);viewport.addEventListener('pointercancel',()=>{dragging=false;pointer=null;});
 function remove(o){o.root.userData.disposable?.forEach(x=>x.dispose());group.remove(o.root);const i=objects.indexOf(o);if(i>=0)objects.splice(i,1);}
 function burst(center,color,split=false){for(let i=0;i<(split?2:8);i++){const root=mesh(geo.box,color,group,center.toArray(),split?[.12,.25,.25]:[.025,.025,.025]);effects.push({root,v:new T.Vector3((i%2?1:-1)*(split?1.2:Math.random()),Math.random()+.4,(Math.random()-.5)),life:.55});}}
 function reset(m){[...objects].forEach(remove);effects.forEach(e=>group.remove(e.root));effects.length=0;mode=m;time=0;next=1;score=0;hp=5;combo=0;lastTip=lastBase=null;actionAt=-10;clock=0;spawnIndex=0;prevTime=null;position.set(0,1.3,-.5);keys.clear();pointer=null;dragging=false;flaps.reset();flight.reset();trailPoints=[];wingStroke=0;
  group.visible=!['zombies','targets','lab'].includes(m);sword.visible=m==='sword'||m==='saber';trail.visible=sword.visible;trail.material.opacity=0;glow.visible=m==='saber';shield.visible=shieldRing.visible=m==='shield';bird.visible=m==='bird';
 }
 function spawn(){const root=new T.Group();group.add(root);const i=spawnIndex++,color=i%2?'#bf99ff':'#86f5e1';let arms=[];
  if(mode==='bird'){root.position.set(Math.sin(i*.9)*2.2,2+Math.sin(i*1.1)*1.1,-12);mesh(torus,'#ffd677',root,[0,0,0],[1,1,1]);for(let j=0;j<4;j++)mesh(geo.sphere,'#fff1b3',root,[Math.cos(j*Math.PI/2)*.78,Math.sin(j*Math.PI/2)*.78,0],[.055,.055,.055]);}
  else if(mode==='shield'){root.position.set([-.35,.2,.4,-.1][i%4],[1.1,1.5,1.2,1.65][i%4],-6);mesh(meteorGeometry,'#d48963',root,[0,0,0],[1,1,1]);mesh(geo.sphere,'#ffcf7d',root,[0,0,-.12],[.07,.07,.18]);}
  else if(mode==='saber'){root.position.set(.2+(i%3-1)*.07,1.4+(i%2)*.07,-5);mesh(geo.box,color,root,[0,0,0],[.25,.25,.25]);const edge=new T.LineSegments(new T.EdgesGeometry(geo.box),new T.LineBasicMaterial({color:'#e8ffff'}));edge.scale.setScalar(.257);root.add(edge);root.userData.disposable=[edge.geometry,edge.material];mesh(geo.box,'#ffffff',root,[0,0,.13],[.13,.026,.008]);}
  else{root.position.set(.15,0,-5);mesh(geo.sphere,'#91abc6',root,[0,1.48,0],[.15,.18,.15]);mesh(geo.sphere,'#526d87',root,[0,1.07,0],[.25,.29,.16]);mesh(geo.box,'#b4c9d7',root,[0,1.18,.16],[.16,.19,.025]);
   for(const s of [-1,1]){mesh(geo.sphere,'#344b66',root,[s*.12,.44,0],[.095,.4,.1]);mesh(geo.sphere,'#b6cedb',root,[s*.23,1.29,0],[.095,.09,.1]);const arm=new T.Group();root.add(arm);arm.position.set(s*.25,1.24,0);mesh(geo.box,'#718b9d',arm,[0,-.16,.04],[.095,.34,.12]);arms.push(arm);mesh(geo.sphere,'#3d5569',root,[s*.12,.1,.05],[.1,.07,.14]);}
   mesh(geo.box,'#a5f3ec',root,[0,1.49,.14],[.21,.035,.025]);mesh(geo.box,'#bedbe7',arms[1],[0,-.12,.28],[.04,.025,.58]);
  }
  objects.push({root,hp:2,hitAt:-10,attack:0,color,arms});
 }
 function pose(fist,q){sword.position.copy(fist).add(new T.Vector3(0,-.07,-.075).applyQuaternion(q));sword.quaternion.copy(q).multiply(GRIP_ROTATION);}
 function tick(dt,fist,q,practice,action,samples=[]){
  if(!group.visible)return null;time+=dt;clock+=dt;
  if(action&&clock-actionAt>.45){actionAt=clock;if(mode==='bird'){const power=Number(document.getElementById('strikeEffort').value),direction=(keys.has('ArrowRight')-keys.has('ArrowLeft'))||(pointer?.x||0);flight.impulse({lift:.35+power*.3,thrust:.5+power*.4+.3*((keys.has('ArrowUp')-keys.has('ArrowDown'))||(pointer?.y||0)),side:direction*(.55+power*.3),strength:power});wingStroke=1;sound.play('whoosh');}}
  if(mode==='bird'){
   if(!practice)for(const s of samples){const f=flaps.sample(s.p,s.time);if(f){flight.impulse(f);wingStroke=Math.min(1,f.strength/2.5);if(f.started)sound.play('whoosh');}}
   if(flight.step(dt)){hp--;combo=0;feedback('LOW ALTITUDE · FLAP TO CLIMB');}
   position.set(flight.x,flight.y,-.5);bird.position.copy(position);body.visible=viewBehind;bird.rotation.z=-flight.vx*.055;
   const recovery=T.MathUtils.clamp((samples.at(-1)?.p[1]||1)-1,-.5,.5);wingStroke*=Math.exp(-dt*6);wings.forEach((w,i)=>w.rotation.z=(i?1:-1)*(-.18+wingStroke*.85-recovery*.2));
  }else if(mode==='shield'){
   const target=practice?new T.Vector3(position.x+(keys.has('ArrowRight')-keys.has('ArrowLeft'))*dt*2,position.y+(keys.has('ArrowUp')-keys.has('ArrowDown'))*dt*2,-.5):new T.Vector3(fist.x,fist.y,-.5);
   if(practice&&pointer){target.x=pointer.x*.65;target.y=1.3+pointer.y*.55;}position.lerp(target,1-Math.exp(-dt*16));position.x=T.MathUtils.clamp(position.x,-.7,.7);position.y=T.MathUtils.clamp(position.y,.65,1.9);shield.position.copy(position);shieldRing.position.copy(position);shieldRing.rotation.z=time*.4;
  }
  pose(fist,q);
  const base=sword.position.clone(),tip=new T.Vector3(0,.72,0).applyQuaternion(sword.quaternion).add(base);const speed=lastTip?tip.distanceTo(lastTip)/Math.max(dt,.001):0;
  if(sword.visible){trailPoints.unshift(tip.clone());if(trailPoints.length>8)trailPoints.pop();for(let i=0;i<8;i++)(trailPoints[i]||tip).toArray(trailArray,i*3);trailGeometry.attributes.position.needsUpdate=true;trail.material.opacity=Math.min(.65,speed*.2);}
  if(time>=next){spawn();next=time+(mode==='saber'?1:mode==='sword'?Math.max(1.8,3.5-score/2000):mode==='bird'?2.2:Math.max(.8,1.8-score/3000));if(mode==='saber')sound.play('beat');}
  for(let i=objects.length-1;i>=0;i--){const o=objects[i];o.root.position.z+=dt*(mode==='bird'?flight.speed:mode==='saber'?4.5:mode==='shield'?2.2:1);let hit=false,miss=false;
   if(mode==='bird'){o.root.rotation.z+=dt*.3;if(o.root.position.z>=-.5){hit=Math.hypot(position.x-o.root.position.x,position.y-o.root.position.y)<.72;miss=!hit;}}
   else if(mode==='shield'){o.root.rotation.x+=dt*2;o.root.rotation.y+=dt;hit=Math.abs(o.root.position.z+.5)<.2&&Math.hypot(position.x-o.root.position.x,position.y-o.root.position.y)<.33;miss=o.root.position.z>.02;}
   else{
    if(mode==='sword'){o.root.position.z=Math.min(-.6,o.root.position.z);o.root.rotation.z=Math.sin(time*4+i)*.015;const wind=T.MathUtils.smoothstep(o.attack,1.6,2.4);o.arms.forEach((a,j)=>a.rotation.x=-.3-wind*(j?.9:.2));if(o.root.position.z>=-.62){o.attack+=dt;if(o.attack>2.6){hp--;combo=0;o.attack=0;feedback('KNIGHT HIT −1');}}}
    const center=o.root.position.clone();if(mode==='sword')center.y=1.38;
    const inTime=mode==='sword'||Math.abs(o.root.position.z+.5)<.36;
    hit=inTime&&lastTip&&speed>.55&&clock-o.hitAt>.6&&(sweptHit(lastTip.toArray(),tip.toArray(),center.toArray(),mode==='sword'?.32:.23)||sweptHit(base.toArray(),tip.toArray(),center.toArray(),mode==='sword'?.29:.19)||lastBase&&sweptHit(lastBase.toArray(),base.toArray(),center.toArray(),.2));
    if(hit&&mode==='sword'){o.hp--;o.attack=0;o.hitAt=clock;o.root.position.z-=.13;burst(center,'#c5e2ef');if(o.hp){feedback('ARMOR BROKEN');hit=false;}}
    miss=mode==='saber'&&o.root.position.z>.02;
   }
   if(hit){const points=100+combo*10;score+=points;combo++;burst(o.root.position.clone().add(new T.Vector3(0,mode==='sword'?1.3:0,0)),o.color||'#ffdb9e',mode==='saber');remove(o);feedback(`${mode==='bird'?'RING':mode==='shield'?'BLOCK':mode==='sword'?'DEFEATED':'SLICE'} +${points} · ${combo}×`);sound.play(mode==='bird'?'ring':'slash');}
   else if(miss){combo=0;if(mode!=='bird')hp--;remove(o);feedback(mode==='bird'?'RING MISSED':'MISSED −1');}
  }
  for(let i=effects.length-1;i>=0;i--){const e=effects[i];e.life-=dt;e.v.y-=dt*2;e.root.position.addScaledVector(e.v,dt);e.root.rotation.z+=dt*3;if(e.life<=0){group.remove(e.root);effects.splice(i,1);}}
  lastTip=tip;lastBase=base;prevTime=time;
  return {score,hp,combo,seconds:Math.max(0,Math.ceil(60-time)),over:hp<=0||(mode!=='sword'&&time>=60),bird:position.clone(),speed:flight.speed,bank:flight.vx,detail:mode==='bird'?`${flight.speed.toFixed(1)} m/s · ${flight.y.toFixed(1)} m altitude · flap power ${flight.lastStrength.toFixed(1)}`:mode==='saber'?(objects.some(o=>Math.abs(o.root.position.z+.5)<.36)?'CUT NOW':'60 BPM · strike at the ring'):mode==='sword'?(objects.some(o=>o.attack>1.6)?'Incoming strike · slash now':objects.some(o=>o.root.position.z>-.8)?'Knight in reach':'Knights approaching'):`${combo} consecutive blocks`};
 }
 reset('zombies');return {reset,tick,pose,group,setView(behind){viewBehind=behind;body.visible=behind;},suspend(){lastTip=lastBase=null;keys.clear();pointer=null;dragging=false;actionAt=-10;flaps.reset();}};
}
