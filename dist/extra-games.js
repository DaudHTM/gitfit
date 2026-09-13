import * as T from 'three';
import {createSword,createBird} from './equipment.js';
import {sweptHit} from './game-logic.js?v=demo-pass4';
import {FlapTracker,FLIGHT,gripQuaternion} from './motion.js?v=demo-pass4';
import {SwordDuel,bladesMeet,BladeStroke} from './duel-logic.js';
import {FlightCourse} from './flight-logic.js?v=demo-pass4';
export const GAMES={
 zombies:{name:'Zombie Boxing',title:'DEAD / AHEAD',tag:'POWER BOXING',intro:'Make every punch count.',help:'Jab forward, hook in a sideways arc, or uppercut in an upward arc. Faster wrist motion deals more damage. Recover between strikes.'},
 targets:{name:'Target Rush',title:'TARGET / RUSH',tag:'PRECISION · 45 SECONDS',intro:'Aim for the center.',help:'Strike glowing targets with jabs, hooks, or uppercuts. Center hits and quick reactions earn bonus points.'},
 bird:{name:'Bird Flight',title:'SKY / BOUND',tag:'FLAP SURVIVAL',intro:'Find the gap.',help:'Flap down to rise; coast to descend. Forward movement is automatic. Stay between the upper and lower obstacles. A collision ends the flight. Space, tap the scene, or use Flap in practice.'},
 saber:{name:'Neon Saber',title:'NEON / SABER',tag:'RHYTHM · 60 SECONDS',intro:'Slice into the rhythm.',help:'Swing through the blocks when they reach the glowing strike plane. Time your cuts to the pulse to build a combo. Space swings in practice.'},
 sword:{name:'Sword Arena',title:'BLADE / ARENA',tag:'PARRY DUELS',intro:'Read the blade.',help:'Cross your sword with the incoming blade to parry, then make a new slash during the opening for a one-hit finish. Striking guarded armor will not deal damage. Practice: hold G or toggle Guard to block; Space counterattacks.'},
 shield:{name:'Orbit Guard',title:'ORBIT / GUARD',tag:'DEFENSE · 60 SECONDS',intro:'Become the shield.',help:'Move your hand to intercept meteors at the shield plane. Consecutive blocks grow your combo. Arrows or drag move the shield in practice.'}
};
// The grip is a rigid 90° rotation: blade +Y becomes hand -Z, perpendicular to forearm -Y.
export const GRIP_ROTATION=new T.Quaternion().fromArray(gripQuaternion([0,0,0,1]));
export function createExtraGames(scene,mesh,geo,feedback,sound){
 const group=new T.Group();scene.add(group);const objects=[],effects=[];
 const weapon=createSword(),sword=weapon.root;group.add(sword);
 const trailArray=new Float32Array(24),trailGeometry=new T.BufferGeometry();trailGeometry.setAttribute('position',new T.BufferAttribute(trailArray,3));
 const trail=new T.Line(trailGeometry,new T.LineBasicMaterial({color:'#84f1df',transparent:true,opacity:.65,depthWrite:false}));trail.frustumCulled=false;group.add(trail);let trailPoints=[];const enemySwordTemplate=createSword().root,bladeMotion=new BladeStroke();let practiceSwing=0,parries=0,finishes=0;
 const shield=mesh(geo.sphere,'#5482a5',group,[0,1.3,-.5],[.22,.22,.035]);
 const shieldRing=new T.Mesh(new T.TorusGeometry(.235,.014,6,40),new T.MeshBasicMaterial({color:'#9cecff'}));group.add(shieldRing);
 const raptor=createBird(),bird=raptor.root,body=raptor.body,wings=raptor.wings;group.add(bird);
 const meteorGeometry=new T.IcosahedronGeometry(.13,1),flaps=new FlapTracker(),course=new FlightCourse(),flight=course.flight,gateMeshes=new Map();
 let mode,time,next,score,hp,combo,lastTip,lastBase,actionAt,clock,spawnIndex,prevTime,wingStroke=0,viewBehind=false,lastSwing=-10;
 const position=new T.Vector3(),keys=new Set();let pointer=null,dragging=false;
 window.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)&&group.visible&&mode==='shield'&&!/INPUT|SELECT/.test(e.target.tagName)){keys.add(e.key);pointer=null;e.preventDefault();}});
 window.addEventListener('keyup',e=>keys.delete(e.key));window.addEventListener('blur',()=>keys.clear());
 const viewport=document.getElementById('viewport');viewport.addEventListener('pointerdown',e=>{if(mode==='shield'&&e.target.tagName==='CANVAS'){dragging=true;viewport.setPointerCapture(e.pointerId);}});
 viewport.addEventListener('pointermove',e=>{if(e.buttons&&dragging){const r=viewport.getBoundingClientRect();pointer={x:(e.clientX-r.left)/r.width*2-1,y:1-(e.clientY-r.top)/r.height*2};}});
 viewport.addEventListener('pointerup',()=>dragging=false);viewport.addEventListener('pointercancel',()=>{dragging=false;pointer=null;});
 function remove(o){o.root.userData.disposable?.forEach(x=>x.dispose());group.remove(o.root);const i=objects.indexOf(o);if(i>=0)objects.splice(i,1);}
 function burst(center,color,split=false){for(let i=0;i<(split?2:8);i++){const root=mesh(geo.box,color,group,center.toArray(),split?[.12,.25,.25]:[.025,.025,.025]);effects.push({root,v:new T.Vector3((i%2?1:-1)*(split?1.2:Math.random()),Math.random()+.4,(Math.random()-.5)),life:.55});}}
 function reset(m){[...objects].forEach(remove);effects.forEach(e=>group.remove(e.root));effects.length=0;mode=m;time=0;next=1;score=0;hp=5;combo=0;lastTip=lastBase=null;actionAt=-10;clock=0;spawnIndex=0;prevTime=null;position.set(0,1.3,-.5);keys.clear();pointer=null;dragging=false;flaps.reset();course.reset();for(const root of gateMeshes.values())group.remove(root);gateMeshes.clear();if(m==='bird')syncGates();trailPoints=[];wingStroke=0;lastSwing=-10;practiceSwing=0;parries=0;finishes=0;bladeMotion.reset();if(m==='sword'){spawn(-2.4);next=5.5;}
  group.visible=!['zombies','targets','lab'].includes(m);sword.visible=m==='sword'||m==='saber';trail.visible=sword.visible;trail.material.opacity=0;weapon.setMode(m);shield.visible=shieldRing.visible=m==='shield';bird.visible=m==='bird';
 }
 function spawn(z=-5){const root=new T.Group();group.add(root);const i=spawnIndex++,color=i%2?'#bf99ff':'#86f5e1';let arms=[];
  if(mode==='shield'){root.position.set([-.35,.2,.4,-.1][i%4],[1.1,1.5,1.2,1.65][i%4],-6);mesh(meteorGeometry,'#d48963',root,[0,0,0],[1,1,1]);mesh(geo.sphere,'#ffcf7d',root,[0,0,-.12],[.07,.07,.18]);}
  else if(mode==='saber'){root.position.set(.2+(i%3-1)*.07,1.4+(i%2)*.07,-5);mesh(geo.box,color,root,[0,0,0],[.25,.25,.25]);const edge=new T.LineSegments(new T.EdgesGeometry(geo.box),new T.LineBasicMaterial({color:'#e8ffff'}));edge.scale.setScalar(.257);root.add(edge);root.userData.disposable=[edge.geometry,edge.material];mesh(geo.box,'#ffffff',root,[0,0,.13],[.13,.026,.008]);}
  else{root.position.set(.15,0,z);mesh(geo.sphere,'#91abc6',root,[0,1.48,0],[.15,.18,.15]);mesh(geo.sphere,'#526d87',root,[0,1.07,0],[.25,.29,.16]);mesh(geo.box,'#b4c9d7',root,[0,1.18,.16],[.16,.19,.025]);
   for(const s of [-1,1]){mesh(geo.sphere,'#344b66',root,[s*.12,.44,0],[.095,.4,.1]);mesh(geo.sphere,'#b6cedb',root,[s*.23,1.29,0],[.095,.09,.1]);const arm=new T.Group();root.add(arm);arm.position.set(s*.25,1.24,0);mesh(geo.box,'#718b9d',arm,[0,-.16,.04],[.095,.34,.12]);arms.push(arm);mesh(geo.sphere,'#3d5569',root,[s*.12,.1,.05],[.1,.07,.14]);}
   mesh(geo.box,'#a5f3ec',root,[0,1.49,.14],[.21,.035,.025]);
  }
  const duel=mode==='sword'?new SwordDuel(i):null,enemyWeapon=duel?enemySwordTemplate.clone(true):null;
  if(enemyWeapon){root.add(enemyWeapon);mesh(geo.sphere,'#35485c',enemyWeapon,[0,-.07,0],[.044,.066,.044]);mesh(geo.box,duel.style.color,root,[0,1.05,.17],[.055,.25,.015]);}
  objects.push({root,hp:2,hitAt:-10,attack:0,color,arms,duel,weapon:enemyWeapon,blade:null});
 }
 function syncGates(){
  const visible=new Set(course.gates.map(g=>g.id));
  for(const [id,root] of gateMeshes)if(!visible.has(id)){group.remove(root);gateMeshes.delete(id);}
  for(const gate of course.gates){
   let root=gateMeshes.get(gate.id);
   if(!root){root=new T.Group();group.add(root);gateMeshes.set(gate.id,root);
    const stone=gate.id%2?'#427d81':'#507f73',rim='#d6b87b';
    mesh(geo.box,stone,root,[0,(gate.bottom-1)/2,0],[7,gate.bottom+1,FLIGHT.gateDepth]);
    mesh(geo.box,stone,root,[0,(gate.top+8)/2,0],[7,8-gate.top,FLIGHT.gateDepth]);
    // Both visible inner lips stay outside the tested gap, so the edges agree.
    for(const [edge,side] of [[gate.bottom,-1],[gate.top,1]]){
     mesh(geo.box,rim,root,[0,edge+side*.10,0],[7.25,.20,FLIGHT.gateDepth+.04]);
     mesh(geo.box,'#edffe7',root,[0,edge+side*.025,.53],[7.25,.035,.025]);
     for(const x of [-3.2,-1.6,0,1.6,3.2])mesh(geo.box,'#315e60',root,[x,edge+side*.52,.515],[.035,.6,.025]);
    }
   }
   root.position.z=gate.z;
  }
 }
 function tickFlight(dt,practice,action,samples){
  if(practice&&action&&clock-actionAt>.2){actionAt=clock;const power=Number(document.getElementById('strikeEffort').value);flight.impulse({lift:1.7+power*.45,started:true,strength:power});wingStroke=1;sound.play('flap',{power:.6+power*.25});}
  if(!practice)for(const sample of samples){const f=flaps.sample(sample.p,sample.time);if(f){flight.impulse(f);wingStroke=Math.min(1,f.strength/2.5);if(f.started)sound.play('flap',{power:Math.min(1.4,.5+f.strength/3)});}}
  const events=course.step(dt);position.set(0,flight.y,FLIGHT.birdZ);bird.position.copy(position);body.visible=viewBehind;bird.rotation.z=0;bird.rotation.x=-T.MathUtils.clamp(flight.vy*.035,-.1,.1);
  const recovery=T.MathUtils.clamp((samples.at(-1)?.p[1]||1)-1,-.5,.5);wingStroke*=Math.exp(-dt*6);wings.forEach((w,i)=>w.rotation.z=(i?1:-1)*(.1-wingStroke*.85+recovery*.2));
  for(const e of events)if(e.type==='crash')feedback(e.reason==='ground'?'GROUND HIT':e.reason==='ceiling'?'TOO HIGH':'OBSTACLE HIT',{kind:'hurt',point:position,power:.85});else feedback('GAP +100',{kind:'ring',point:new T.Vector3(0,(e.gate.bottom+e.gate.top)/2,FLIGHT.birdZ),power:.8});
  syncGates();return {score:course.score,hp:course.over?0:1,combo:course.passed,seconds:Math.floor(course.time),distance:Math.floor(course.distance),over:course.over,bird:position.clone(),speed:flight.speed,detail:'Flap to climb · Coast to descend'};
 }
 function knightBlade(o){
  const d=o.duel,phase=d.phase;let u=0;
  if(phase==='swing')u=T.MathUtils.clamp(d.time/d.style.swing,0,1);
  if(phase==='recover'||phase==='open'||phase==='dead')u=1;
  const hilt=new T.Vector3(.3,1.42-u*.27,.20+u*.28),direction=new T.Vector3(.15-u*1.1,.94-u*1.22,.15).normalize();
  if(phase==='approach'||phase==='guard'){hilt.set(.32,1.08,.22);direction.set(-.3,.8,.2).normalize();}
  if(phase==='open'){hilt.x+=.15;direction.set(.7,.3,-.2).normalize();}
  o.weapon.position.copy(hilt);o.weapon.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),direction);
  const arm=o.arms[1],reach=hilt.clone().sub(arm.position);arm.quaternion.setFromUnitVectors(new T.Vector3(0,-1,0),reach.normalize());arm.scale.y=hilt.distanceTo(arm.position)/.32;
  o.root.updateMatrixWorld(true);
  return {base:o.weapon.localToWorld(new T.Vector3(0,.025,0)).toArray(),tip:o.weapon.localToWorld(new T.Vector3(0,.72,0)).toArray()};
 }
 function pose(fist,q){sword.position.copy(fist).add(new T.Vector3(0,-.07,-.075).applyQuaternion(q));sword.quaternion.copy(q).multiply(GRIP_ROTATION);}
 function tick(dt,fist,q,practice,action,samples=[]){
  if(!group.visible)return null;time+=dt;clock+=dt;
  if(mode==='bird')return tickFlight(dt,practice,action,samples);
  if(mode==='shield'){
   const target=practice?new T.Vector3(position.x+(keys.has('ArrowRight')-keys.has('ArrowLeft'))*dt*2,position.y+(keys.has('ArrowUp')-keys.has('ArrowDown'))*dt*2,-.5):new T.Vector3(fist.x,fist.y,-.5);
   if(practice&&pointer){target.x=pointer.x*.65;target.y=1.3+pointer.y*.55;}position.lerp(target,1-Math.exp(-dt*16));position.x=T.MathUtils.clamp(position.x,-.7,.7);position.y=T.MathUtils.clamp(position.y,.65,1.9);shield.position.copy(position);shieldRing.position.copy(position);shieldRing.rotation.z=time*.4;
  }
  pose(fist,q);
  const base=sword.position.clone(),tip=new T.Vector3(0,.72,0).applyQuaternion(sword.quaternion).add(base);const speed=lastTip?tip.distanceTo(lastTip)/Math.max(dt,.001):0;
  if(sword.visible&&!practice&&speed>.8&&clock-lastSwing>.3){sound.play('slashSwing',{power:Math.min(1.5,speed/3),pan:fist.x*.7});lastSwing=clock;}
  if(sword.visible){trailPoints.unshift(tip.clone());if(trailPoints.length>8)trailPoints.pop();for(let i=0;i<8;i++)(trailPoints[i]||tip).toArray(trailArray,i*3);trailGeometry.attributes.position.needsUpdate=true;trail.material.opacity=Math.min(.65,speed*.2);}
  if(time>=next&&(mode!=='sword'||objects.filter(o=>!o.dead).length<3)){spawn();next=time+(mode==='saber'?1:mode==='sword'?Math.max(2.4,4-score/3000):Math.max(.8,1.8-score/3000));if(mode==='saber')sound.play('beat');}
  const duelOrder=mode==='sword'?objects.filter(o=>!o.dead).sort((a,b)=>b.root.position.z-a.root.position.z):[];const bladeSample=bladeMotion.sample(tip.toArray(),clock*1000);if(practice&&action)practiceSwing++;const strokeId=practice?practiceSwing:bladeSample.id;
  for(let i=objects.length-1;i>=0;i--){const o=objects[i];if(o.dead){o.dead+=dt;o.root.rotation.x=-Math.min(1.5,o.dead*2.6);o.root.position.z-=dt*.7;o.root.scale.setScalar(Math.max(.05,1-o.dead*.7));if(o.dead>.65)remove(o);continue;}o.recoil=Math.max(0,(o.recoil||0)-dt*3);o.root.position.z+=dt*(mode==='saber'?4.5:mode==='shield'?2.2:1);let hit=false,miss=false;
   if(mode==='shield'){o.root.rotation.x+=dt*2;o.root.rotation.y+=dt;hit=Math.abs(o.root.position.z+.5)<.2&&Math.hypot(position.x-o.root.position.x,position.y-o.root.position.y)<.33;miss=o.root.position.z>.02;}
   else{
    if(mode==='sword'){
     const rank=duelOrder.indexOf(o),limit=rank?duelOrder[rank-1].root.position.z-1.15:-.95;o.root.position.z=Math.min(limit,o.root.position.z);const engaged=rank===0&&o.root.position.z>=-.97;
     const event=o.duel.step(dt,engaged);o.root.rotation.z=Math.sin(time*3+i)*.012+o.recoil*.08;o.root.rotation.x=o.duel.phase==='open'?-.10:-o.recoil*.12;
     if(event==='warn')sound.play('warning');if(event==='swing')sound.play('slashSwing',{power:.8});if(event==='hurt'){hp--;combo=0;feedback('MISSED PARRY −1',{kind:'hurt',point:new T.Vector3(0,1.4,-.3)});}
     const enemyBlade=knightBlade(o),playerBlade={base:base.toArray(),tip:tip.toArray()},previousPlayer=lastTip?{base:lastBase.toArray(),tip:lastTip.toArray()}:playerBlade;
     const parried=engaged&&o.duel.canParry&&bladesMeet(playerBlade,enemyBlade,previousPlayer,o.blade||enemyBlade)&&o.duel.parry(strokeId);o.blade=enemyBlade;
     if(parried){parries++;if(o.duel.parries===1)score+=25;o.recoil=1;feedback(o.duel.parries===1?'PARRY +25 · COUNTER NOW':'PARRY · COUNTER NOW',{kind:'parry',point:base.clone().lerp(tip,.5),power:1.2});}
     const center=o.root.position.clone().add(new T.Vector3(0,1.35,.05));
     const contact=!!lastTip&&(sweptHit(lastTip.toArray(),tip.toArray(),center.toArray(),.34)||sweptHit(base.toArray(),tip.toArray(),center.toArray(),.32));
     if(engaged&&o.duel.counter(strokeId,speed,contact)){const points=o.duel.style.points+combo*25;score+=points;combo++;finishes++;o.dead=.001;feedback(`RIPOSTE +${points}`,{kind:'riposte',point:center,power:1.35,direction:tip.clone().sub(lastTip).normalize()});}
     else if(!parried&&engaged&&contact&&speed>.8&&o.duel.phase!=='open'&&clock-o.hitAt>.6){o.hitAt=clock;feedback('PARRY FIRST',{kind:'armor',point:center,power:.45});}
     continue;
    }
    const center=o.root.position.clone();if(mode==='sword')center.y=1.38;
    const inTime=mode==='sword'||Math.abs(o.root.position.z+.5)<.36;
    hit=inTime&&lastTip&&speed>.55&&clock-o.hitAt>.6&&(sweptHit(lastTip.toArray(),tip.toArray(),center.toArray(),mode==='sword'?.32:.23)||sweptHit(base.toArray(),tip.toArray(),center.toArray(),mode==='sword'?.29:.19)||lastBase&&sweptHit(lastBase.toArray(),base.toArray(),center.toArray(),.2));
    miss=mode==='saber'&&o.root.position.z>.02;
   }
   if(hit){const points=100+combo*10;score+=points;combo++;burst(o.root.position.clone().add(new T.Vector3(0,mode==='sword'?1.3:0,0)),o.color||'#ffdb9e',mode==='saber');const point=o.root.position.clone().add(new T.Vector3(0,mode==='sword'?1.3:0,0));if(mode==='sword')o.dead=.001;else remove(o);feedback(`${mode==='shield'?'BLOCK':mode==='sword'?'DEFEATED':'SLICE'} +${points} · ${combo}×`,{kind:mode==='shield'?'block':'slash',point,power:mode==='shield'?1:Math.min(1.5,speed/3),direction:lastTip?tip.clone().sub(lastTip).normalize():null});}
   else if(miss){combo=0;hp--;remove(o);feedback('MISSED −1',{kind:'hurt',point:new T.Vector3(0,1.4,-.3),power:.55});}
  }
  for(let i=effects.length-1;i>=0;i--){const e=effects[i];e.life-=dt;e.v.y-=dt*2;e.root.position.addScaledVector(e.v,dt);e.root.rotation.z+=dt*3;if(e.life<=0){group.remove(e.root);effects.splice(i,1);}}
  lastTip=tip;lastBase=base;prevTime=time;
  const opponent=duelOrder.find(o=>!o.dead),duel=opponent?.duel;
  const cue=duel?(duel.phase==='open'?'COUNTER NOW':duel.canParry?'PARRY NOW':duel.phase==='windup'?'Incoming blade':duel.phase==='approach'?'Approaching':'Cross swords to parry'):'';
  return {score,hp,combo,parries,finishes,opponent:duel?{name:duel.style.name,cue,opening:duel.phase==='open',fraction:duel.phase==='open'?1-duel.time/duel.style.opening:duel.phase==='windup'?duel.time/duel.style.windup:1}:null,seconds:Math.max(0,Math.ceil(60-time)),over:hp<=0||(mode!=='sword'&&time>=60),detail:mode==='saber'?(objects.some(o=>Math.abs(o.root.position.z+.5)<.36)?'CUT NOW':'120 BPM · cut every 2 beats'):mode==='sword'?'Parry → new slash · one-hit finish':`${combo} consecutive blocks`};
 }
 function preview(now){if(mode!=='bird')return;group.visible=true;bird.position.set(.3,2.3,-3);body.visible=true;bird.rotation.z=Math.sin(now*.0005)*.08;wings.forEach((w,i)=>w.rotation.z=(i?1:-1)*(.12+Math.sin(now*.002)*.22));}
 reset('zombies');return {reset,tick,pose,group,preview,setView(behind){viewBehind=behind;body.visible=behind;},suspend(){lastTip=lastBase=null;keys.clear();pointer=null;dragging=false;actionAt=-10;flaps.reset();bladeMotion.reset(true);}};
}
