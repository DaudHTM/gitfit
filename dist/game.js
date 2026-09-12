import * as T from 'three';
import {PunchTracker,sweptHit,strike} from './game-logic.js';
const $=id=>document.getElementById(id);
export function createArcade(renderer,getTracking){
 const scene=new T.Scene();scene.background=new T.Color('#0b1018');scene.fog=new T.FogExp2('#0b1018',.075);
 const camera=new T.PerspectiveCamera(66,1,.03,50);camera.position.set(.34,2.06,.80);camera.lookAt(.10,1.22,-2.3);
 scene.add(new T.HemisphereLight(0xafd5ef,0x263040,2.1));const moon=new T.DirectionalLight(0xb7d8ff,2.7);moon.position.set(3,7,2);scene.add(moon);
 const materials={};function material(c){return materials[c]??=new T.MeshStandardMaterial({color:c,roughness:.75})}
 const boxGeo=new T.BoxGeometry(1,1,1),sphereGeo=new T.SphereGeometry(1,14,10),cylinderGeo=new T.CylinderGeometry(1,1,1,12);
 function mesh(geo,color,parent,position,scale){const m=new T.Mesh(geo,material(color));m.position.set(...position);m.scale.set(...scale);parent.add(m);return m}
 mesh(boxGeo,'#1b2631',scene,[0,-.075,-10],[18,.1,35]);
 const grid=new T.GridHelper(32,32,0x3a5660,0x263943);grid.position.set(0,-.015,-10);scene.add(grid);
 for(let i=0;i<12;i++){for(const side of [-1,1]){const z=-i*2.5;mesh(boxGeo,'#1a242e',scene,[side*(3.8+(i%3)*.5),1.7,z],[1.1,3.4+(i%4),1.4]);mesh(boxGeo,'#3b595d',scene,[side*3,1.1,z],[.06,2.2,.06]);mesh(boxGeo,'#88e2c0',scene,[side*3,2.15,z],[.35,.035,.08]);}mesh(boxGeo,'#789567',scene,[0,.005,-i*2.5],[.025,.01,.55]);}
 for(const x of [-1.15,1.15])mesh(boxGeo,'#71926b',scene,[x,.002,-7],[.045,.012,15]);
 // Player faces -Z. The camera sits above and slightly behind the head.
 const player=new T.Group();scene.add(player);
 mesh(boxGeo,'#273d4b',player,[0,.97,.02],[.39,.57,.23]);
 mesh(sphereGeo,'#465b65',player,[0,1.54,.01],[.12,.14,.12]);
 const rightShoulder=new T.Vector3(.23,1.35,0),leftShoulder=new T.Vector3(-.23,1.35,0);
 const rightUpper=mesh(cylinderGeo,'#bbc9bd',player,[0,0,0],[.062,1,.062]);
 const rightLower=mesh(cylinderGeo,'#acc0b7',player,[0,0,0],[.05,1,.05]);
 const glove=mesh(sphereGeo,'#d8ff87',player,[0,0,0],[.105,.10,.14]);
 const leftUpper=mesh(cylinderGeo,'#bbc9bd',player,[0,0,0],[.062,1,.062]);
 const leftLower=mesh(cylinderGeo,'#acc0b7',player,[0,0,0],[.05,1,.05]);
 const leftGlove=mesh(sphereGeo,'#8faee0',player,[-.20,1.35,-.30],[.10,.10,.13]);
 const up=new T.Vector3(0,1,0),v=new T.Vector3();
 function bone(m,a,b){m.position.copy(a).add(b).multiplyScalar(.5);v.copy(b).sub(a);m.scale.y=v.length();m.quaternion.setFromUnitVectors(up,v.normalize());}
 const leftElbow=new T.Vector3(-.29,1.10,-.15);bone(leftUpper,leftShoulder,leftElbow);bone(leftLower,leftElbow,leftGlove.position);
 const elbow=new T.Vector3(),fist=new T.Vector3(),down=new T.Vector3(0,-1,0),practiceUpper=new T.Quaternion(),practiceLower=new T.Quaternion();
 const enemies=[],effects=[];let target=null,elapsed=0,nextSpawn=0,kills=0,hits=0,lives=5,wave=1,active=false,mode='zombies',state='menu',input='live',lastFrame=0,lastSample=0,practiceStart=-10000,practiceClock=0,feedbackUntil=0;
 const detector=new PunchTracker();
 function zombie(z,index){const root=new T.Group();scene.add(root);root.position.set(.12+(index%3-1)*.06,0,z);const skin=index%2?'#73956d':'#89a482';
 const body=mesh(boxGeo,index%2?'#68505e':'#425763',root,[0,1.03,0],[.36,.51,.23]);
 const head=mesh(boxGeo,skin,root,[0,1.46,0],[.27,.29,.25]);head.rotation.z=.12;
 for(const x of [-.07,.07])mesh(boxGeo,'#efb871',root,[x,1.50,.13],[.045,.027,.013]);
 mesh(boxGeo,'#26352d',root,[0,1.37,.13],[.14,.035,.02]);
 const legs=[-.10,.10].map(x=>mesh(boxGeo,'#35434c',root,[x,.42,0],[.13,.79,.16]));
 for(const x of [-.24,.24]){const arm=mesh(boxGeo,skin,root,[x,1.14,.22],[.115,.13,.47]);arm.rotation.x=-.12;mesh(boxGeo,skin,root,[x,1.11,.47],[.13,.12,.12]);}
 const health=[-.095,.095].map(x=>mesh(boxGeo,'#d8ff87',root,[x,1.76,0],[.15,.025,.035]));
 const e={root,body,head,legs,health,hp:2,attack:0,flash:0,dead:0,index};enemies.push(e);return e;}
 function removeObject(root){scene.remove(root)}
 function clear(){for(const e of enemies)removeObject(e.root);enemies.length=0;for(const e of effects)removeObject(e.mesh);effects.length=0;if(target){removeObject(target.root);target=null}detector.reset();lastSample=0;}
 function practiceTarget(){if(target)removeObject(target.root);const root=new T.Group();scene.add(root);const x=input==='practice'?.20:[.18,.02,.28][hits%3],y=input==='practice'?1.30:[1.30,1.12,1.43][hits%3];root.position.set(x,y,-.53);mesh(sphereGeo,'#d8ff87',root,[0,0,0],[.16,.16,.06]);mesh(sphereGeo,'#33462d',root,[0,0,.05],[.105,.105,.02]);mesh(sphereGeo,'#d8ff87',root,[0,0,.075],[.04,.04,.02]);target={root};}
 function feedback(text){$('hitFeedback').textContent=text;feedbackUntil=performance.now()+650;$('hitFeedback').classList.add('show');}
 function sparks(point,color){for(let i=0;i<10;i++){const m=mesh(boxGeo,color,scene,point.toArray(),[.025,.025,.025]);effects.push({mesh:m,velocity:new T.Vector3((Math.random()-.5)*2,Math.random()*2,(Math.random()-.5)*2),life:.45});}}
 function overlay(title,text,button){$('gameOverlay').hidden=false;$('overlayTitle').textContent=title;$('overlayText').textContent=text;$('startGame').textContent=button;}
 function liveReady(){const t=getTracking();return t.connected&&t.last&&performance.now()-t.last<250&&(t.flags&1)&&!(t.flags&6)&&!t.calPending;}
 function ready(){return input==='practice'||liveReady()}
 function pause(reason='Take a breather. Your round is saved.'){if(state!=='playing')return;state='paused';detector.reset();overlay('Paused',reason,'Resume round');$('pauseGame').textContent='Resume';}
 function finish(){state='over';detector.reset();overlay(mode==='zombies'?'Run complete.':'Time’s up.',mode==='zombies'?`${kills} zombies defeated · ${hits} hits landed · wave ${wave}`:`${hits} targets hit in 45 seconds.`, 'Play again');$('pauseGame').disabled=true;}
 function start(){if(!ready()){overlay('Connect. Calibrate. Fight.','Connect the ESP32 and calibrate in the setup panel, or choose Keyboard / touch to try the game.','Start round');return;}
 if(state!=='paused'){clear();elapsed=0;nextSpawn=2.5;kills=hits=0;lives=5;wave=1;if(mode==='zombies')zombie(-2.1,0);else practiceTarget();}
 detector.reset();lastSample=0;practiceStart=-10000;state='playing';$('gameOverlay').hidden=true;$('pauseGame').disabled=false;$('pauseGame').textContent='Pause';}
 function select(next){mode=next;active=next!=='lab';state='menu';clear();elapsed=0;hits=kills=0;lives=5;wave=1;document.body.classList.toggle('arcade-active',active);$('gameHud').hidden=!active;$('gameOverlay').hidden=!active;$('gameToolbar').hidden=!active;
 document.querySelectorAll('[data-game]').forEach(b=>{b.classList.toggle('selected',b.dataset.game===next);b.setAttribute('aria-pressed',String(b.dataset.game===next));});
 if(active){$('sceneTitle').textContent=next==='zombies'?'DEAD / AHEAD':'TARGET / RUSH';$('sceneEyebrow').textContent=next==='zombies'?'SURVIVAL BOXING':'45-SECOND PRECISION CHALLENGE';$('sceneNote').textContent='RIGHT ARM TRACKED · LEFT ARM IN GUARD';overlay(next==='zombies'?'Two punches. One less zombie.':'Find your rhythm.',next==='zombies'?'Punch forward when a zombie enters reach. Pull your hand back, then punch again. Survive the approaching horde.':'Punch the illuminated targets. Retract between hits and score as many as you can in 45 seconds.','Start round');}
 else{$('sceneTitle').textContent='Motion, made visible.';$('sceneEyebrow').textContent='DUAL-SENSOR ARM TRACKING';$('sceneNote').textContent='RIGHT ARM · FIXED SHOULDER';}
 $('pauseGame').disabled=true;
 }
 document.querySelectorAll('[data-game]').forEach(b=>b.onclick=()=>select(b.dataset.game));
 $('startGame').onclick=start;$('pauseGame').onclick=()=>state==='playing'?pause():state==='paused'?start():null;
 $('gameInput').onchange=()=>{input=$('gameInput').value;select(mode);$('practicePunch').hidden=input!=='practice';$('inputHint').textContent=input==='practice'?'Space or Punch · simulated arm':'Live right arm · calibrated ESP32 required';};
 function practicePunch(){if(input==='practice'&&state==='playing'&&practiceClock-practiceStart>.5)practiceStart=practiceClock;}
 $('practicePunch').onclick=practicePunch;
 window.addEventListener('keydown',e=>{if(e.code==='Escape')pause();if(e.code==='Space'&&!e.repeat&&active&&input==='practice'&&!/INPUT|SELECT|BUTTON|TEXTAREA/.test(e.target.tagName)){e.preventDefault();practicePunch();}});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)pause('The round paused while this tab was hidden.');});
 function tick(now){const dt=lastFrame?Math.min((now-lastFrame)/1000,.05):0;lastFrame=now;if(!active)return false;
 const t=getTracking();const qUpper=input==='practice'?practiceUpper:t.qu,qLower=input==='practice'?practiceLower:t.qf;
 if(state==='playing'){if(!ready())pause('Tracking paused. Reconnect or recalibrate, then resume when the signal is fresh.');else{elapsed+=dt;practiceClock+=dt;}}
 const p=practiceClock-practiceStart;const extension=p<0||p>.45?0:p<.16?p/.16:Math.max(0,1-(p-.16)/.29);
 practiceUpper.setFromAxisAngle(new T.Vector3(1,0,0),.72+extension*.84);practiceLower.setFromAxisAngle(new T.Vector3(1,0,0),2.45-extension*.89);
 elbow.copy(down).applyQuaternion(qUpper).multiplyScalar(t.upperLen).add(rightShoulder);fist.copy(down).applyQuaternion(qLower).multiplyScalar(t.lowerLen+.055).add(elbow);bone(rightUpper,rightShoulder,elbow);bone(rightLower,elbow,fist);glove.position.copy(fist);glove.quaternion.copy(qLower);
 if(state==='playing'){
  let sweep=null;const stamp=input==='practice'?now:t.last;if(stamp!==lastSample){lastSample=stamp;sweep=detector.sample(fist.toArray(),stamp);}
  if(mode==='zombies'){
   wave=1+Math.floor(kills/5);if(elapsed>=nextSpawn&&enemies.filter(e=>!e.dead).length<5){zombie(-7,enemies.length+kills);nextSpawn=elapsed+Math.max(1.8,4.3-wave*.2);}
   const living=enemies.filter(e=>!e.dead).sort((a,b)=>b.root.position.z-a.root.position.z);
   living.forEach((e,i)=>{const limit=i?living[i-1].root.position.z-.85:-.68;e.root.position.z=Math.min(limit,e.root.position.z+dt*(.55+Math.min(wave,8)*.06));e.root.position.y=Math.sin(elapsed*5+e.index)*.015;e.legs.forEach((l,j)=>l.rotation.x=Math.sin(elapsed*5+j*Math.PI)*.18);e.head.rotation.z=.12+Math.sin(elapsed*2)*.05;
    e.flash=Math.max(0,e.flash-dt);e.body.material=material(e.flash?'#dcbf83':e.index%2?'#68505e':'#425763');
    if(e.root.position.z>=-.70){e.attack+=dt;if(e.attack>2.3){lives--;e.attack=0;feedback('TOO CLOSE −1');$('viewport').classList.add('hurt');setTimeout(()=>$('viewport').classList.remove('hurt'),220);if(lives<=0)finish();}}else e.attack=0;
   });
   if(sweep&&state==='playing')for(const e of living){const c=e.root.position.clone().add(new T.Vector3(0,1.32,.08));if(sweptHit(sweep.a,sweep.b,c.toArray(),.32)){detector.consume();hits++;e.flash=.2;e.attack=0;e.health[e.hp-1].visible=false;const dead=strike(e);sparks(fist,'#d8ff87');if(dead){kills++;e.dead=.001;feedback('KNOCKOUT +100');}else{e.root.position.z-=.16;feedback('HIT · ONE TO GO');}break;}}
   for(let i=enemies.length-1;i>=0;i--){const e=enemies[i];if(e.dead){e.dead+=dt;e.root.rotation.x=-Math.min(Math.PI/2,e.dead*3);e.root.position.y=-e.dead*.45;if(e.dead>.7){removeObject(e.root);enemies.splice(i,1)}}}
  }else{if(sweep&&target&&sweptHit(sweep.a,sweep.b,target.root.position.toArray(),.23)){detector.consume();hits++;sparks(target.root.position,'#d8ff87');feedback('+1 TARGET');practiceTarget();}if(elapsed>=45)finish();}
 }
 for(let i=effects.length-1;i>=0;i--){const e=effects[i];e.life-=dt;e.velocity.y-=dt*4;e.mesh.position.addScaledVector(e.velocity,dt);e.mesh.rotation.x+=dt*5;if(e.life<=0){removeObject(e.mesh);effects.splice(i,1)}}
 if(now>feedbackUntil)$('hitFeedback').classList.remove('show');
 $('gameScore').textContent=mode==='zombies'?String(kills*100):String(hits);$('roundLabel').textContent=mode==='zombies'?'WAVE':'SECONDS';$('gameRound').textContent=mode==='zombies'?String(wave):String(Math.max(0,Math.ceil(45-elapsed)));$('healthLabel').textContent=mode==='zombies'?'HEALTH':'HITS';$('gameHealth').textContent=mode==='zombies'?'●'.repeat(Math.max(0,lives))+'○'.repeat(5-Math.max(0,lives)):String(hits);
 $('gameState').textContent=state==='playing'?(input==='live'?'LIVE ARM':'KEYBOARD / TOUCH'):state.toUpperCase();
 const size=renderer.domElement.getBoundingClientRect();camera.aspect=size.width/size.height;camera.updateProjectionMatrix();renderer.render(scene,camera);return true;
 }
 select('zombies');return {tick,pause,get active(){return active}};
}
