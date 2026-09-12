import * as T from 'three';
import {sweptHit} from './game-logic.js';
export const GAMES={
 zombies:{title:'DEAD / AHEAD',tag:'SURVIVAL BOXING',intro:'Two punches. One less zombie.',help:'Punch forward within reach. Pull back before punching again. Each zombie takes two hits.'},
 targets:{title:'TARGET / RUSH',tag:'PRECISION · 45 SECONDS',intro:'Make every hit count.',help:'Punch the glowing targets and retract between hits. Score as many as possible in 45 seconds.'},
 bird:{title:'SKY /BOUND',tag:'FLIGHT · 60 SECONDS',intro:'Take the scenic route.',help:'Raise your arm to climb; lower it to descend. Move your hand left and right to steer through golden rings. Keyboard: arrows or drag the sky.'},
 saber:{title:'NEON / SABER',tag:'RHYTHM · 60 SECONDS',intro:'Slice into the rhythm.',help:'Swing your arm through blocks as they reach the glowing strike zone. Build a combo. Keyboard: Space or Action when a block reaches you.'},
 sword:{title:'BLADE / ARENA',tag:'SWORD SURVIVAL',intro:'Hold your ground.',help:'Swing your sword through approaching training knights. Each knight takes two separate swings. Keyboard: Space or Action.'},
 shield:{title:'ORBIT / GUARD',tag:'DEFENSE · 60 SECONDS',intro:'Become the shield.',help:'Move your hand to intercept incoming meteors before they cross the shield plane. Keyboard: arrows or drag to position the shield.'}
};
export function createExtraGames(scene,mesh,geo,feedback,sound){
 const group=new T.Group();scene.add(group);const objects=[];
 const sword=new T.Group();group.add(sword);mesh(geo.box,'#9eeeff',sword,[0,.36,0],[.04,.72,.035]);mesh(geo.box,'#d8ff87',sword,[0,0,0],[.25,.04,.06]);mesh(geo.box,'#293d50',sword,[0,-.09,0],[.045,.15,.045]);
 const shield=mesh(geo.sphere,'#85dcff',group,[0,1.3,-.5],[.23,.23,.055]);
 const bird=new T.Group();group.add(bird);mesh(geo.sphere,'#f3d9a0',bird,[0,0,0],[.13,.13,.32]);mesh(geo.sphere,'#fff5d8',bird,[0,.1,-.24],[.10,.11,.13]);const wings=[-1,1].map(s=>mesh(geo.box,'#e5b761',bird,[s*.34,0,.02],[.62,.035,.24]));
 const torus=new T.TorusGeometry(.65,.045,8,40);let mode,time,next,score,hp,combo,last,actionAt,clock,spawnIndex;const position=new T.Vector3(),previous=new T.Vector3(),keys=new Set();let pointer=null;
 window.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)&&group.visible&&!/INPUT|SELECT/.test(e.target.tagName)){keys.add(e.key);e.preventDefault();}});window.addEventListener('keyup',e=>keys.delete(e.key));window.addEventListener('blur',()=>keys.clear());
 const viewport=document.getElementById('viewport');viewport.addEventListener('pointermove',e=>{if(e.buttons){const r=viewport.getBoundingClientRect();pointer={x:(e.clientX-r.left)/r.width*2-1,y:1-(e.clientY-r.top)/r.height*2};}});viewport.addEventListener('pointerup',()=>pointer=null);
 function clear(){objects.forEach(o=>group.remove(o.root));objects.length=0;}
 function reset(m){clear();mode=m;time=0;next=1;score=0;hp=5;combo=0;last=null;actionAt=-10;clock=0;spawnIndex=0;position.set(0,1.3,-.5);keys.clear();group.visible=!['zombies','targets','lab'].includes(m);sword.visible=m==='sword'||m==='saber';shield.visible=m==='shield';bird.visible=m==='bird';}
 function spawn(){const root=new T.Group();group.add(root);const i=spawnIndex++;let x=0,y=1.3;
 if(mode==='bird'){x=Math.sin(i*.9)*1.5;y=1.7+Math.sin(i*1.4)*.8;mesh(torus,'#ffd677',root,[0,0,0],[1,1,1]);root.position.set(x,y,-12);}
 else if(mode==='shield'){x=[-.35,.2,.4,-.1][i%4];y=[1.1,1.5,1.2,1.7][i%4];mesh(geo.sphere,'#ffae71',root,[0,0,0],[.13,.13,.13]);root.position.set(x,y,-6);}
 else if(mode==='saber'){x=.20;y=1.4;mesh(geo.box,i%2?'#bd95ff':'#86f5e1',root,[0,0,0],[.25,.25,.25]);mesh(geo.box,'#ffffff',root,[0,0,.13],[.12,.025,.008]);root.position.set(x,y,-5);}
 else {mesh(geo.sphere,'#91abc6',root,[0,1.48,0],[.15,.18,.15]);mesh(geo.box,'#526d87',root,[0,1.04,0],[.38,.54,.25]);for(const s of [-1,1]){mesh(geo.box,'#344b66',root,[s*.12,.43,0],[.15,.8,.17]);mesh(geo.box,'#b6cedb',root,[s*.25,1.08,.12],[.11,.45,.12]);}mesh(geo.box,'#a5f3ec',root,[0,1.49,.14],[.21,.035,.025]);root.position.set(.15,0,-5);}
 objects.push({root,hp:2,hitAt:-10,attack:0});}
 function tick(dt,fist,q,practice,action){
 if(!group.visible)return null;time+=dt;clock+=dt;
 if(action&&clock-actionAt>.45)actionAt=clock;
 const target=practice?new T.Vector3(position.x+(keys.has('ArrowRight')-keys.has('ArrowLeft'))*dt*2,position.y+(keys.has('ArrowUp')-keys.has('ArrowDown'))*dt*2,-.5):new T.Vector3((fist.x-.23)*(mode==='bird'?5:1),mode==='bird'?1.2+(fist.y-.7)*2:fist.y,-.5);
 if(practice&&pointer){target.x=pointer.x*(mode==='bird'?2:.6);target.y=1.3+pointer.y*(mode==='bird'?1.2:.5);}
 position.lerp(target,1-Math.exp(-dt*12));position.x=T.MathUtils.clamp(position.x,-2.2,2.2);position.y=T.MathUtils.clamp(position.y,.35,3.2);
 bird.position.copy(position);bird.position.z=-1;bird.rotation.z=T.MathUtils.clamp(-target.x*.18,-.4,.4);wings.forEach((w,i)=>w.rotation.z=Math.sin(time*7)*(i?1:-1)*.35);
 shield.position.copy(position);sword.position.copy(fist);sword.quaternion.copy(q);if(practice){sword.quaternion.identity();sword.rotation.z=Math.sin(Math.max(0,clock-actionAt)/.28*Math.PI)*-.8;}
 const tip=new T.Vector3(0,.65,0).applyQuaternion(sword.quaternion).add(fist);const speed=last?tip.distanceTo(previous)/Math.max(dt,.001):0;
 if(time>=next){spawn();next=time+(mode==='saber'?1:mode==='sword'?3.5:2);if(mode==='saber')sound.play('beat');}
 for(let i=objects.length-1;i>=0;i--){const o=objects[i];o.root.position.z+=dt*(mode==='bird'?3:mode==='saber'?4.5:mode==='shield'?2:1);let hit=false;if(mode==='sword'){o.root.position.z=Math.min(-.58,o.root.position.z);o.root.rotation.z=Math.sin(time*4+i)*.025;if(o.root.position.z>=-.60){o.attack+=dt;if(o.attack>2.5){hp--;combo=0;o.attack=0;feedback('TOO CLOSE −1');sound.play('hurt');}}}
 if(mode==='bird'){o.root.rotation.z+=dt*.4;if(o.root.position.z>=-1){hit=Math.hypot(position.x-o.root.position.x,position.y-o.root.position.y)<.57;if(!hit){combo=0;feedback('RING MISSED');}else{score+=100+combo*10;combo++;}group.remove(o.root);objects.splice(i,1);}}
 else if(mode==='shield'){hit=Math.abs(o.root.position.z+.5)<.18&&position.distanceTo(new T.Vector3(o.root.position.x,o.root.position.y,-.5))<.34;}
 else{const center=o.root.position.clone();if(mode==='sword')center.y=1.4;const inTime=mode==='sword'||Math.abs(o.root.position.z+.5)<.38;
 hit=inTime&&clock-o.hitAt>.5&&((practice&&clock-actionAt<.16&&Math.abs(o.root.position.z+.5)<.55)||(!practice&&last&&speed>.5&&(sweptHit(previous.toArray(),tip.toArray(),center.toArray(),mode==='sword'?.35:.23)||sweptHit(fist.toArray(),tip.toArray(),center.toArray(),mode==='sword'?.3:.18))));
 if(hit&&mode==='sword'){o.hp--;o.attack=0;o.hitAt=clock;o.root.position.z-=.18;if(o.hp){sound.play('hit');feedback('ARMOR HIT');hit=false;}}
 }
 if(hit){if(mode!=='bird'){score+=100+combo*10;combo++;group.remove(o.root);objects.splice(i,1);}sound.play(mode==='bird'?'ring':'slash');feedback(`${mode==='bird'?'RING':mode==='shield'?'BLOCK':'SLICE'} +100 · ${combo}×`);}
 else if(mode!=='bird'&&o.root.position.z>.02){hp--;combo=0;sound.play('hurt');feedback('MISSED −1');group.remove(o.root);objects.splice(i,1);}
 }
 previous.copy(tip);last=true;return {score,hp,combo,seconds:Math.max(0,Math.ceil(60-time)),over:hp<=0||(mode!=='sword'&&time>=60),bird:bird.position};
 }
 reset('zombies');return {reset,tick,group,suspend(){last=null;keys.clear();pointer=null;actionAt=-10;}};
}
