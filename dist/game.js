import * as T from 'three';
import {sweptHit,strike,nextOpponent,punchExtension} from './game-logic.js';
import {ActivityTracker,createSound} from './activity.js';
import {GAMES,createExtraGames} from './extra-games.js';
import {TrajectoryPunchTracker,practiceStroke} from './motion.js';
import {setupFullscreen} from './fullscreen.js';
import {createWorldDetails} from './world-details.js';
import {createAvatar,createLobbyAvatar} from './avatar.js';
import {createBoxingModels} from './boxing-models.js';
const $=id=>document.getElementById(id);
const GAME_ORDER=['zombies','bird','saber','sword','shield','targets'];
export function createArcade(renderer,getTracking){
 const scene=new T.Scene();scene.background=new T.Color('#0b1018');scene.fog=new T.FogExp2('#0b1018',.075);
 const camera=new T.PerspectiveCamera(66,1,.03,50);camera.position.set(.34,2.06,.80);camera.lookAt(.10,1.22,-2.3);
 scene.add(new T.HemisphereLight(0xafd5ef,0x263040,2.1));const moon=new T.DirectionalLight(0xb7d8ff,2.7);moon.position.set(3,7,2);scene.add(moon);
 const materials={};function material(c){return materials[c]??=new T.MeshStandardMaterial({color:c,roughness:.75})}
 const boxGeo=new T.BoxGeometry(1,1,1),sphereGeo=new T.SphereGeometry(1,14,10),cylinderGeo=new T.CylinderGeometry(1,1,1,12);
 function mesh(geo,color,parent,position,scale){const m=new T.Mesh(geo,material(color));m.position.set(...position);m.scale.set(...scale);parent.add(m);return m}
 const street=new T.Group();scene.add(street);
 mesh(boxGeo,'#1b2631',street,[0,-.075,-10],[18,.1,35]);
 const grid=new T.GridHelper(32,32,0x3a5660,0x263943);grid.position.set(0,-.015,-10);street.add(grid);
 for(let i=0;i<12;i++){for(const side of [-1,1]){const z=-i*2.5;mesh(boxGeo,'#1a242e',street,[side*(3.8+(i%3)*.5),1.7,z],[1.1,3.4+(i%4),1.4]);mesh(boxGeo,'#3b595d',street,[side*3,1.1,z],[.06,2.2,.06]);mesh(boxGeo,'#88e2c0',street,[side*3,2.15,z],[.35,.035,.08]);}mesh(boxGeo,'#789567',street,[0,.005,-i*2.5],[.025,.01,.55]);}
 for(const x of [-1.15,1.15])mesh(boxGeo,'#71926b',street,[x,.002,-7],[.045,.012,15]);
 // Player faces -Z. The camera sits above and slightly behind the head.
 const sky=new T.Group();scene.add(sky);sky.visible=false;
 const coneGeo=new T.ConeGeometry(1,1,7);
 mesh(boxGeo,'#386d72',sky,[0,-1,-12],[70,.1,80]);
 for(let i=0;i<18;i++){const side=i%2?1:-1;mesh(coneGeo,i%2?'#6a9990':'#82ad9e',sky,[side*(5+i%4),.2,-i*3],[2.5,3+i%3,2.5]);for(let j=0;j<3;j++)mesh(sphereGeo,'#e1f2e8',sky,[side*(3+i%5)+j*.7,5+i%3,-i*3],[1.3,.35,.65]);}
 const arena=new T.Group();scene.add(arena);arena.visible=false;
 for(const side of [-1,1]){for(let i=0;i<8;i++){mesh(boxGeo,'#546481',arena,[side*1.5,1.5,-i*2.2],[.08,3,.08]);mesh(boxGeo,'#86e8db',arena,[side*1.5,2.95,-i*2.2],[.1,.035,.1]);}mesh(boxGeo,'#8deedf',arena,[side*.55,.01,-6],[.025,.02,14]);}
 const strikeZone=new T.Mesh(new T.TorusGeometry(.45,.014,6,40),material('#b595ff'));strikeZone.position.set(.2,1.35,-.6);arena.add(strikeZone);
 const boxing=createBoxingModels(scene),world=createWorldDetails(scene);
 const rig=createAvatar(),player=rig.root;scene.add(player);const bodyParts=[rig.body];
 const lobbyAvatar=createLobbyAvatar(renderer,$('avatarStage'));
 const rightShoulder=new T.Vector3(.23,1.35,0),leftShoulder=new T.Vector3(-.23,1.35,0);
 const rightUpper=rig.rightUpper;
 const rightLower=rig.rightLower;
 const glove=boxing.glove('#b9603c',1);player.add(glove);
 const leftUpper=rig.leftUpper;
 const leftLower=rig.leftLower;
 const leftGlove=boxing.glove('#354855',-1);player.add(leftGlove);leftGlove.position.set(-.2,1.35,-.3);leftGlove.rotation.x=2.45;
 const up=new T.Vector3(0,1,0),v=new T.Vector3();
 function bone(m,a,b){m.position.copy(a).add(b).multiplyScalar(.5);v.copy(b).sub(a);m.scale.y=v.length();m.quaternion.setFromUnitVectors(up,v.normalize());}
 rig.rightHand.visible=rig.leftHand.visible=false;
 const leftElbow=new T.Vector3(-.29,1.10,-.15);bone(leftUpper,leftShoulder,leftElbow);bone(leftLower,leftElbow,leftGlove.position);
 const elbow=new T.Vector3(),fist=new T.Vector3(),down=new T.Vector3(0,-1,0),practiceUpper=new T.Quaternion(),practiceLower=new T.Quaternion();
 const enemies=[],effects=[];let targetScore=0;let target=null,elapsed=0,nextSpawn=0,kills=0,hits=0,lives=5,wave=1,active=false,mode='zombies',state='menu',input='live',lastFrame=0,practiceStart=-10000,practiceClock=0,feedbackUntil=0;
 const detector=new TrajectoryPunchTracker(),sound=createSound(),activity=new ActivityTracker();
 const extra=createExtraGames(scene,mesh,{box:boxGeo,sphere:sphereGeo},feedback,sound);let extraResult=null,action=false,shake=0,best={},focus=null,lastWhoosh=-1000,combo=0,lastHit=-1000;const cameraAim=new T.Vector3(.1,1.3,-2.3);
 $('openSetup').onclick=()=>{pause('Device setup is open. Resume when you are ready.');$('setupDialog').showModal();};$('closeSetup').onclick=()=>$('setupDialog').close();
 $('cameraMotion').checked=!matchMedia('(prefers-reduced-motion: reduce)').matches;
 function workoutUI(){const goal=Number($('workoutGoal').value)*60;$('workoutProgress').max=goal;$('workoutProgress').value=activity.seconds;const calories=Number($('calorieGoal').value);$('calorieProgress').max=calories;$('calorieProgress').value=activity.kcal;$('workoutStatus').textContent=activity.seconds>=goal&&activity.kcal>=calories?'Both session targets reached ✓':`${Math.min(100,Math.floor(activity.seconds/goal*100))}% of time · ${Math.min(100,Math.floor(activity.kcal/calories*100))}% of calories`; $('calories').textContent=activity.kcal.toFixed(1);$('activeTime').textContent=(activity.seconds/60).toFixed(1)+' min';}
 $('workoutGoal').onchange=$('calorieGoal').onchange=workoutUI;
 try{best=JSON.parse(localStorage.getItem('armature-bests')||'{}');$('weight').value=localStorage.getItem('armature-weight')||70;}catch{}
 $('weight').onchange=()=>{try{localStorage.setItem('armature-weight',$('weight').value)}catch{}};
 $('resetActivity').onclick=()=>{activity.reset();workoutUI();};$('soundToggle').onclick=$('gameSound').onclick=()=>{const text=sound.toggle()?'Sound off':'Sound on';$('soundToggle').textContent=$('gameSound').textContent=text;};
 const fullscreen=setupFullscreen($('viewport'),$('fullscreen'),pause);$('immersivePause').onclick=()=>state==='playing'?pause():state==='paused'?start():null;$('immersiveAction').onclick=()=>practicePunch();

 function zombie(z,index){const e=boxing.fighter(index);e.root.position.set(.16,0,z);e.hp=e.maxHp=100;enemies.push(e);return e;}
 function removeObject(root){scene.remove(root)}
 function clear(){const buffered=getTracking().samples;if(buffered)buffered.length=0;$('hitFeedback').textContent='';$('hitFeedback').classList.remove('show');$('gameDetail').textContent='';focus=null;combo=0;for(const e of enemies)removeObject(e.root);enemies.length=0;for(const e of effects)removeObject(e.mesh);effects.length=0;if(target){removeObject(target.root);target=null}detector.reset();}
 function practiceTarget(){if(target)removeObject(target.root);const root=new T.Group();scene.add(root);const x=input==='practice'?.20:[.18,.02,.28][hits%3],y=input==='practice'?1.30:[1.30,1.12,1.43][hits%3];root.position.set(x,y,-.53);mesh(sphereGeo,'#d8ff87',root,[0,0,0],[.16,.16,.06]);mesh(sphereGeo,'#33462d',root,[0,0,.05],[.105,.105,.02]);mesh(sphereGeo,'#d8ff87',root,[0,0,.075],[.04,.04,.02]);const ring=new T.Mesh(new T.TorusGeometry(.195,.012,6,32),material('#ffca90'));root.add(ring);target={root,ring,born:elapsed};}
 function feedback(text){shake=.045;sound.play(text.includes('−')?'hurt':text.includes('KNOCKOUT')?'win':'hit');$('hitFeedback').textContent=text;feedbackUntil=performance.now()+650;$('hitFeedback').classList.add('show');}
 function sparks(point,color){for(let i=0;i<10;i++){const m=mesh(boxGeo,color,scene,point.toArray(),[.025,.025,.025]);effects.push({mesh:m,velocity:new T.Vector3((Math.random()-.5)*2,Math.random()*2,(Math.random()-.5)*2),life:.45});}}
 function overlay(title,text,button){$('gameOverlay').hidden=false;$('overlayTitle').textContent=title;$('overlayText').textContent=text;$('startGame').textContent=button;}
 function liveReady(){const t=getTracking();return t.connected&&t.last&&performance.now()-t.last<250&&(t.flags&1)&&!(t.flags&6)&&!t.calPending;}
 function ready(){return input==='practice'||liveReady()}
 function pause(reason='Take a breather. Your round is saved.'){if(state!=='playing')return;state='paused';sound.stop();extra.suspend();action=false;detector.reset();overlay('Paused',reason,'Resume round');$('pauseGame').textContent='Resume';}
 function finish(){const score=extraResult?.score??(mode==='zombies'?kills*100:targetScore);best[mode]=Math.max(best[mode]||0,score);try{localStorage.setItem('armature-bests',JSON.stringify(best))}catch{}state='over';$('opponentHud').hidden=true;detector.reset();overlay(mode==='zombies'?'Run complete.':(extraResult?.hp<=0?'Run complete.':'Time’s up.'),mode==='zombies'?`${kills} zombies defeated · ${hits} hits landed · wave ${wave}`:`${hits} targets hit in 45 seconds.`, 'Play again');$('overlayText').textContent=`Score ${score} · Best ${best[mode]} · ${extraResult?extraResult.combo+' combo':hits+' hits'}. Session: ${activity.kcal.toFixed(1)} estimated kcal.`;$('pauseGame').disabled=true;}
 function start(){sound.unlock();if(!ready()){if(active){$('overlayText').textContent='Tracking is not ready. Return to the lobby to reconnect or calibrate.';return;}$('lobbyNotice').textContent=getTracking().connected?'Capture both poses beside your avatar before playing.':'Connect your arm, or select Practice to play with keyboard / touch.';return;}active=true;document.body.classList.add('in-game','arcade-active');$('viewport').scrollTop=0;$('settings').open=false;$('gameHud').hidden=false;$('gameToolbar').hidden=false;fullscreen.enter();
 if(state!=='paused'){clear();elapsed=0;nextSpawn=2.5;kills=hits=targetScore=0;lives=5;wave=1;extra.reset(mode);extraResult=null;if(mode==='zombies')zombie(-2.1,0);else if(mode==='targets')practiceTarget();}
 detector.reset();practiceStart=-10000;extra.group.visible=!['zombies','targets'].includes(mode);state='playing';$('viewport').focus({preventScroll:true});sound.play('bell');$('gameOverlay').hidden=true;$('pauseGame').disabled=false;$('pauseGame').textContent='Pause';}
 function select(next){sound.stop();mode=next;world.select(next);boxing.environment.visible=next==='zombies';$('opponentHud').hidden=true;arena.visible=['saber','shield'].includes(next);strikeZone.visible=next==='saber';street.visible=!['bird','zombies','sword'].includes(next);sky.visible=next==='bird';scene.background.set(next==='bird'?'#9fcbd0':'#0b1018');scene.fog.color.copy(scene.background);scene.fog.density=next==='bird'?.025:.075;extra.reset(next);extraResult=null;player.visible=next!=='bird';active=false;state='menu';clear();elapsed=0;hits=kills=targetScore=0;lives=5;wave=1;document.body.classList.toggle('arcade-active',active);$('gameHud').hidden=!active;$('gameOverlay').hidden=!active;$('gameToolbar').hidden=!active;document.body.classList.remove('in-game');
 const index=GAME_ORDER.indexOf(next);$('selectedGameName').textContent=GAMES[next].name;$('selectedGameTag').textContent=GAMES[next].tag;$('selectedGameNumber').textContent=`${String(index+1).padStart(2,'0')} / ${String(GAME_ORDER.length).padStart(2,'0')}`;
 const g=GAMES[next];$('sceneTitle').textContent=g.title;$('sceneEyebrow').textContent=g.tag;$('gameDescription').textContent=g.intro;$('sceneNote').textContent=next==='bird'?'FLAP DOWN TO LIFT · ANGLE YOUR STROKES TO STEER':'RIGHT ARM TRACKED';
 $('lobbyNotice').textContent=input==='practice'?'Practice mode · Space to move · no calories counted':liveReady()?'Your arm is ready. Let’s play.':'Connect your arm, or choose practice below.';
 $('practicePunch').textContent=next==='bird'?'Flap · Space':'Strike · Space';$('punchOptions').hidden=input!=='practice';$('punchStyleLabel').hidden=!['zombies','targets'].includes(next);$('strikeReadout').hidden=!['zombies','targets'].includes(next);$('immersiveAction').textContent=next==='bird'?'Flap':'Strike';$('overlayTip').textContent=g.introHelp||g.help;
 camera.position.set(next==='bird'?3:3.3,next==='bird'?3:2.2,next==='bird'?5:5.4);cameraAim.set(0,next==='bird'?2:1.1,-3);camera.fov=57;
 $('pauseGame').disabled=true;
 }
 function changeGame(direction){if(active)return;const index=GAME_ORDER.indexOf(mode);select(GAME_ORDER[(index+direction+GAME_ORDER.length)%GAME_ORDER.length]);}
 $('previousGame').onclick=()=>changeGame(-1);$('nextGame').onclick=()=>changeGame(1);
 $('gamePicker').addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();changeGame(e.key==='ArrowLeft'?-1:1);}});
 $('playGame').onclick=$('startGame').onclick=start;
 function lobby(){if(state==='playing'||state==='paused')finish();fullscreen.exit();select(mode);$('playGame').focus();}
 $('backLobby').onclick=$('overlayLobby').onclick=lobby;
 $('pauseGame').onclick=()=>state==='playing'?pause():state==='paused'?start():null;
 $('gameInput').onchange=()=>{input=$('gameInput').value;select(mode);$('practicePunch').hidden=input!=='practice';$('inputHint').textContent=input==='practice'?(mode==='bird'?'Space to flap · arrows / drag aim the flap':mode==='shield'?'Arrow keys or drag in scene':'Space or Strike · simulated arm'):'Live right arm · calibrated ESP32 required';};
 function practicePunch(){if(input==='practice'&&state==='playing'&&practiceClock-practiceStart>.8){action=true;practiceStart=practiceClock;sound.play('whoosh');}}
 $('practicePunch').onclick=practicePunch;
 window.addEventListener('keydown',e=>{if(e.code==='Escape')pause();if(e.code==='Space'&&!e.repeat&&active&&input==='practice'&&!/INPUT|SELECT|BUTTON|TEXTAREA/.test(e.target.tagName)){e.preventDefault();practicePunch();}});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)pause('The round paused while this tab was hidden.');});
 function tick(now){const dt=lastFrame?Math.min((now-lastFrame)/1000,.05):0;lastFrame=now;world.tick(dt);
 const t=getTracking();const liveSamples=t.samples?.splice(0)||[];const qUpper=input==='practice'?practiceUpper:t.qu,qLower=input==='practice'?practiceLower:t.qf;
 if(state==='playing'){if(!ready())pause('Tracking paused. Reconnect or recalibrate, then resume when the signal is fresh.');else{elapsed+=dt;practiceClock+=dt;}}
 const p=practiceClock-practiceStart;const extension=punchExtension(p);
 const stroke=practiceStroke(p,$('punchStyle').value,Number($('strikeEffort').value));
 practiceUpper.setFromAxisAngle(new T.Vector3(1,0,0),.55);practiceLower.setFromAxisAngle(new T.Vector3(1,0,0),1.4);if(input==='practice'&&['sword','saber'].includes(mode)&&p>=0&&p<.48){practiceLower.premultiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),Math.sin(p/.48*Math.PI)*-1.25));}
 elbow.copy(down).applyQuaternion(qUpper).multiplyScalar(t.upperLen).add(rightShoulder);fist.copy(down).applyQuaternion(qLower).multiplyScalar(t.lowerLen+.055).add(elbow);
 if(input==='practice'&&['zombies','targets'].includes(mode)){
  fist.set(...stroke.p);const direction=fist.clone().sub(rightShoulder);const distance=Math.min(direction.length(),t.upperLen+t.lowerLen+.05);direction.normalize();fist.copy(rightShoulder).addScaledVector(direction,distance);
  const a=(t.upperLen**2-(t.lowerLen+.055)**2+distance**2)/(2*distance),height=Math.sqrt(Math.max(0,t.upperLen**2-a*a));const bend=down.clone().addScaledVector(direction,-down.dot(direction)).normalize();
  elbow.copy(rightShoulder).addScaledVector(direction,a).addScaledVector(bend,height);practiceUpper.setFromUnitVectors(down,elbow.clone().sub(rightShoulder).normalize());practiceLower.setFromUnitVectors(down,fist.clone().sub(elbow).normalize());
 }
 rig.rightHand.position.copy(fist);rig.rightHand.quaternion.copy(qLower);rig.leftHand.position.copy(leftGlove.position);rig.leftHand.quaternion.copy(leftGlove.quaternion);rig.rightHand.visible=rig.leftHand.visible=!['zombies','targets'].includes(mode);glove.visible=leftGlove.visible=['zombies','targets'].includes(mode);
 bone(rightUpper,rightShoulder,elbow);bone(rightLower,elbow,fist);glove.position.copy(fist);glove.quaternion.copy(qLower);glove.scale.set(1+shake*.5,1-shake*.7,1+shake*.4);
 const wristSamples=input==='practice'?[{p:fist.toArray(),time:now}]:liveSamples.map(s=>({p:down.clone().applyQuaternion(s.qu).multiplyScalar(t.upperLen).add(rightShoulder).add(down.clone().applyQuaternion(s.qf).multiplyScalar(t.lowerLen+.055)).toArray(),time:s.time}));
 extra.pose(fist,qLower);
 const breathe=state==='playing'?Math.sin(elapsed*2.1)*.008:0;leftGlove.position.y=1.35+breathe;leftGlove.position.z=-.3-extension*.03;bone(leftUpper,leftShoulder,leftElbow);bone(leftLower,leftElbow,leftGlove.position);
 if(state==='playing'){
  const sweeps=[];
  if(input==='practice'&&stroke.phase!=='strike'){detector.reset();detector.sample(fist.toArray(),now);}else for(const sample of wristSamples){const sweep=detector.sample(sample.p,sample.time);if(sweep)sweeps.push(sweep);}
  if(sweeps.length){const move=sweeps.at(-1);$('strikeReadout').textContent=`${move.type.toUpperCase()} · ${move.peakSpeed.toFixed(1)} m/s est. · ${move.damage} damage`;}
  if(sweeps.length&&input==='live'&&now-lastWhoosh>450){sound.play('whoosh');lastWhoosh=now;}
  if(mode==='zombies'){
   wave=1+Math.floor(kills/5);if(elapsed>=nextSpawn&&enemies.filter(e=>!e.dead).length<4){zombie(-7,enemies.length+kills);nextSpawn=elapsed+Math.max(1.8,4.3-wave*.2);}
   const living=enemies.filter(e=>!e.dead).sort((a,b)=>b.root.position.z-a.root.position.z);
   living.forEach((e,i)=>{const limit=i?living[i-1].root.position.z-.85:-.68;e.root.position.z=Math.min(limit,e.root.position.z+dt*(.55+Math.min(wave,8)*.06));const approach=T.MathUtils.smoothstep(-e.root.position.z,1,5);e.root.position.x=.16+Math.sin(e.index*2.4)*.8*approach+Math.sin(elapsed*2+e.index)*.02;
    e.flash=Math.max(0,e.flash-dt);boxing.animate(e,elapsed,dt);
    if(i===0&&e.root.position.z<-1.1){const foot=Math.floor(elapsed*1.8);if(foot!==e.step){sound.play('step');e.step=foot;}}
    if(e.root.position.z>=-.70){e.attack+=dt;if(e.attack>2.3){lives--;combo=0;e.attack=0;feedback('TOO CLOSE −1');$('viewport').classList.add('hurt');setTimeout(()=>$('viewport').classList.remove('hurt'),220);if(lives<=0)finish();}}else e.attack=0;
   });
   focus=nextOpponent(enemies);$('opponentHud').hidden=!focus||state!=='playing';$('opponentName').textContent=focus?'OPPONENT '+(kills+1):'CLEAR';$('opponentCue').textContent=focus?(focus.attack>1.4?'Incoming swing':focus.root.position.z>-.8?'In reach · punch':'Closing in'):'';document.querySelectorAll('.opponent-bars i').forEach((bar,i)=>{const fraction=focus?T.MathUtils.clamp(focus.hp/focus.maxHp*2-i,0,1):0;bar.style.background=`linear-gradient(to right,#f3ba80 ${fraction*100}%,#ffffff26 ${fraction*100}%)`;});
   let landed=false;
   for(const sweep of sweeps){if(landed||state!=='playing')break;for(const e of living){const center=e.root.position.clone().add(new T.Vector3(0,1.32,.08));if(sweptHit(sweep.a,sweep.b,center.toArray(),.32)){
    detector.consume();landed=true;hits++;combo=elapsed-lastHit<4?combo+1:1;lastHit=elapsed;e.flash=.2+sweep.damage*.002;e.attack=0;const dead=strike(e,sweep.damage);e.health.forEach((h,i)=>{h.scale.x=.13*T.MathUtils.clamp(e.hp/e.maxHp*2-i,0,1);});sparks(fist,'#ffd098');
    $('strikeReadout').textContent=`${sweep.type.toUpperCase()} · ${sweep.peakSpeed.toFixed(1)} m/s est. · ${sweep.damage} damage`;
    if(dead){kills++;e.dead=.001;feedback(`${sweep.type.toUpperCase()} · KNOCKOUT +100`);}else{e.root.position.z-=.10+sweep.damage*.0015;feedback(`${sweep.type.toUpperCase()} · −${sweep.damage} HP`);}break;
   }}}
   for(let i=enemies.length-1;i>=0;i--){const e=enemies[i];if(e.dead){e.dead+=dt;e.root.rotation.x=-Math.min(Math.PI/2,e.dead*2.2);e.root.rotation.z=Math.sin(e.index+1)*e.dead*.3;e.root.position.z-=dt*.9;e.root.position.y=-Math.max(0,e.dead-.35)*.15;if(e.dead>1.1){removeObject(e.root);enemies.splice(i,1)}}}
  }else if(mode==='targets'){
   if(target){target.ring.rotation.z=elapsed;target.ring.scale.setScalar(1+Math.sin(elapsed*5)*.06);}
   for(const sweep of sweeps){if(target&&sweptHit(sweep.a,sweep.b,target.root.position.toArray(),.23)){detector.consume();hits++;const bullseye=sweptHit([sweep.a[0],sweep.a[1],0],[sweep.b[0],sweep.b[1],0],[target.root.position.x,target.root.position.y,0],.09);const points=(bullseye?150:100)+Math.max(0,Math.round(30-(elapsed-target.born)*5));targetScore+=points;sparks(target.root.position,'#d8ff87');feedback(`${bullseye?'BULLSEYE':'TARGET'} +${points}`);practiceTarget();break;}}
   if(elapsed>=45)finish();
  }else {extraResult=extra.tick(dt,fist,qLower,input==='practice',action,wristSamples);if(extraResult?.over)finish();}

 action=false;
 }
 activity.update(dt,{playing:state==='playing',live:input==='live',fresh:!!liveReady(),visible:!document.hidden,weight:Number($('weight').value),met:Number($('effort').value)});
 workoutUI();$('liveEnergy').textContent=activity.kcal.toFixed(1)+' kcal est.';
 if(mode==='bird'&&state==='playing'){for(const decoration of sky.children.slice(1)){decoration.position.z+=dt*(extraResult?.speed||3);if(decoration.position.z>6)decoration.position.z-=54;}}
 for(let i=effects.length-1;i>=0;i--){const e=effects[i];e.life-=dt;e.velocity.y-=dt*4;e.mesh.position.addScaledVector(e.velocity,dt);e.mesh.rotation.x+=dt*5;if(e.life<=0){removeObject(e.mesh);effects.splice(i,1)}}
 if(now>feedbackUntil)$('hitFeedback').classList.remove('show');
 $('gameScore').textContent=mode==='zombies'?String(kills*100):String(targetScore);$('roundLabel').textContent=mode==='zombies'?'WAVE':'SECONDS';$('gameRound').textContent=mode==='zombies'?String(wave):String(Math.max(0,Math.ceil(45-elapsed)));$('healthLabel').textContent=mode==='zombies'?'HEALTH':'HITS';$('gameHealth').textContent=mode==='zombies'?'●'.repeat(Math.max(0,lives))+'○'.repeat(5-Math.max(0,lives)):String(hits);
 $('gameState').textContent=state==='playing'?(input==='live'?'LIVE ARM':'KEYBOARD / TOUCH'):state.toUpperCase();
 if(!extraResult&&!['zombies','targets'].includes(mode)){$('gameRound').textContent=mode==='sword'?'0':'60';$('roundLabel').textContent=mode==='sword'?'COMBO':'SECONDS';$('healthLabel').textContent='HEALTH';$('gameHealth').textContent='●●●●●';}
 if(extraResult){$('gameScore').textContent=extraResult.score;$('roundLabel').textContent=mode==='sword'?'COMBO':'SECONDS';$('gameRound').textContent=mode==='sword'?extraResult.combo:extraResult.seconds;$('healthLabel').textContent=mode==='bird'?'COMBO':'HEALTH';$('gameHealth').textContent=mode==='bird'?extraResult.combo+'×':'●'.repeat(Math.max(0,extraResult.hp));}
 $('immersiveAction').hidden=input!=='practice';$('immersiveAction').disabled=state!=='playing';$('immersivePause').textContent=state==='paused'?'Resume':'Pause';$('immersivePause').disabled=!['playing','paused'].includes(state);
 $('gameDetail').textContent=extraResult?.detail||'';
 $('bestScore').textContent=best[mode]||0;
 if(!active){
  player.visible=false;extra.group.visible=false;extra.preview(now);const travel=$('cameraMotion').checked?Math.sin(now*.00013)*.5:0;
  camera.position.set(mode==='bird'?3+travel:3.3+travel,mode==='bird'?3:2.2,mode==='bird'?5:5.4);camera.lookAt(0,mode==='bird'?2:1.1,-3);camera.fov=57;
  const size=renderer.domElement.getBoundingClientRect();camera.aspect=size.width/size.height;camera.updateProjectionMatrix();renderer.render(scene,camera);lobbyAvatar.render(now,t);return true;
 }
 player.visible=mode!=='bird';extra.group.visible=!['zombies','targets'].includes(mode);
 const motion=$('cameraMotion').checked;shake*=Math.exp(-dt*18);const view=$('cameraView').value;
 focus=mode==='zombies'?nextOpponent(enemies):null;
 const aim=new T.Vector3(mode==='bird'?0:.1,mode==='bird'?1.5:1.3,mode==='bird'?-6:-2.3);
 const birdPos=extraResult?.bird||new T.Vector3(0,2.2,-.5);
 const cp=mode==='bird'?(view==='shoulder'?new T.Vector3(birdPos.x,birdPos.y+.7,1.6):new T.Vector3(birdPos.x,birdPos.y+.04,.02)):view==='shoulder'?new T.Vector3(.28,1.8,.48):new T.Vector3(.03,1.60,.07);
 bodyParts.forEach(part=>part.visible=view==='shoulder');
 if(mode==='bird'){aim.set(birdPos.x+(extraResult?.bank||0)*.3,birdPos.y,-6);extra.setView(view==='shoulder');}
 if(mode==='zombies'&&view==='director'&&motion&&focus){aim.set(focus.root.position.x*.55,1.34,Math.min(-1.7,focus.root.position.z));cp.x+=T.MathUtils.clamp(focus.root.position.x*.16,-.13,.13)+Math.sin(elapsed*.6)*.035;cp.y+=T.MathUtils.clamp((-focus.root.position.z-1)*.014,0,.07);}
 if(motion&&state==='playing'){cp.x+=Math.sin(now*.063)*shake*.35;cp.y+=Math.sin(elapsed*2)*.006;}
 camera.position.lerp(cp,1-Math.exp(-dt*7));cameraAim.lerp(aim,1-Math.exp(-dt*4));camera.lookAt(cameraAim);
 camera.fov=T.MathUtils.lerp(camera.fov,mode==='zombies'&&view==='director'&&motion?74+Math.min(2,shake*30):76,1-Math.exp(-dt*5));
 const size=renderer.domElement.getBoundingClientRect();camera.aspect=size.width/size.height;camera.updateProjectionMatrix();renderer.render(scene,camera);return true;
 }
 select('zombies');return {tick,pause,get active(){return active}};
}
