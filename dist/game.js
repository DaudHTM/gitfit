import * as T from 'three';
import {strike,punchExtension,punchHitsBody,BOXING_STOP_Z,zombieProfile} from './game-logic.js?v=focus-pass2';
import {ActivityTracker} from './activity.js';
import {createSound} from './sound.js?v=focus-pass2';
import {createImpactEffects} from './impact-effects.js?v=focus-pass2';
import {createExtraGames} from './extra-games.js?v=focus-pass2';
import {GAMES,GAME_ORDER} from './game-catalog.js';
import {approachAngle,turnHeading,boxingPoint,boxingSweep,engagedOpponent} from './boxing-space.js';
import {TrajectoryPunchTracker,WristMotion,practiceStroke} from './motion.js?v=focus-pass2';
import {setupFullscreen} from './fullscreen.js';
import {createWorldDetails} from './world-details.js?v=focus-pass2';
import {createAvatar,createLobbyAvatar} from './avatar.js?v=focus-pass2';
import {createBoxingModels} from './boxing-models.js?v=focus-pass2';
import {batchStaticMeshes} from './scene-batch.js';
import {RoundRecords,roundChallenge,resultMetrics} from './round-results.js';
const nodes=new Map();const $=id=>nodes.get(id)||(nodes.set(id,document.getElementById(id)),nodes.get(id));
export function createArcade(renderer,getTracking){
 const scene=new T.Scene();scene.background=new T.Color('#0b1018');scene.fog=new T.FogExp2('#0b1018',.075);
 const viewportSize=new T.Vector2();
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
 const boxing=createBoxingModels(scene),world=createWorldDetails(scene);
 batchStaticMeshes(T,street);batchStaticMeshes(T,arena);
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
 function practiceArm(target,t){
  fist.copy(target);const direction=fist.clone().sub(rightShoulder);const distance=Math.min(direction.length(),t.upperLen+t.lowerLen+.05);direction.normalize();fist.copy(rightShoulder).addScaledVector(direction,distance);
  const a=(t.upperLen**2-(t.lowerLen+.055)**2+distance**2)/(2*distance),height=Math.sqrt(Math.max(0,t.upperLen**2-a*a));const bend=down.clone().addScaledVector(direction,-down.dot(direction)).normalize();
  elbow.copy(rightShoulder).addScaledVector(direction,a).addScaledVector(bend,height);practiceUpper.setFromUnitVectors(down,elbow.clone().sub(rightShoulder).normalize());practiceLower.setFromUnitVectors(down,fist.clone().sub(elbow).normalize());
 }
 const enemies=[];let elapsed=0,nextSpawn=0,kills=0,hits=0,boxingScore=0,spawned=0,lives=5,wave=1,active=false,mode='zombies',state='menu',input='live',lastFrame=0,practiceStart=-10000,practiceClock=0,feedbackUntil=0,hudAt=0,roundLimit=45,practiceStyle='jab',practiceEffort=2,bestCombo=0,bullseyes=0,challengeDone=false,roundStartKcal=0;
 let boxingYaw=0,readoutSpeed=0,speedAt=0;const wristMeter=new WristMotion();
 const detector=new TrajectoryPunchTracker(),sound=createSound(),activity=new ActivityTracker(),impactFx=createImpactEffects(scene);
 const extra=createExtraGames(scene,mesh,{box:boxGeo,sphere:sphereGeo},feedback,sound,camera);let extraResult=null,action=false,shake=0,focus=null,lastWhoosh=-1000,combo=0,lastHit=-1000;const cameraAim=new T.Vector3(.1,1.3,-2.3);
 let storage;try{storage=localStorage;}catch{}const records=new RoundRecords(storage);
 $('openSetup').onclick=()=>{pause('Device setup is open. Resume when you are ready.');$('setupDialog').showModal();};$('closeSetup').onclick=()=>$('setupDialog').close();
 try{const saved=localStorage.getItem('armature-round');if(['0','45'].includes(saved))$('roundDuration').value=saved;}catch{}
 $('roundDuration').onchange=()=>{try{localStorage.setItem('armature-round',$('roundDuration').value);}catch{}};
 const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');$('cameraMotion').checked=$('impactEffects').checked=!reducedMotion.matches;impactFx.setEnabled($('impactEffects').checked);
 try{const saved=JSON.parse(localStorage.getItem('armature-audio')||'null');if(saved){$('musicVolume').value=Number.isFinite(saved.music)?Math.min(100,Math.max(0,saved.music)):48;$('effectsVolume').value=Number.isFinite(saved.effects)?Math.min(100,Math.max(0,saved.effects)):80;}}catch{}
 function audioSettings(){sound.setMusicVolume(Number($('musicVolume').value)/100);sound.setEffectsVolume(Number($('effectsVolume').value)/100);try{localStorage.setItem('armature-audio',JSON.stringify({music:Number($('musicVolume').value),effects:Number($('effectsVolume').value)}));}catch{}}
 audioSettings();$('musicVolume').oninput=$('effectsVolume').oninput=()=>{sound.unlock();audioSettings();};$('impactEffects').onchange=()=>impactFx.setEnabled($('impactEffects').checked);
 function workoutUI(){const goal=Number($('workoutGoal').value)*60;$('workoutProgress').max=goal;$('workoutProgress').value=activity.seconds;const calories=Number($('calorieGoal').value);$('calorieProgress').max=calories;$('calorieProgress').value=activity.kcal;$('workoutStatus').textContent=activity.seconds>=goal&&activity.kcal>=calories?'Targets reached':''; $('workoutProgress').closest('.goal-lines').hidden=activity.seconds===0;$('calories').textContent=activity.kcal.toFixed(1);$('activeTime').textContent=(activity.seconds/60).toFixed(1)+' min';}
 $('workoutGoal').onchange=$('calorieGoal').onchange=workoutUI;
 try{$('weight').value=localStorage.getItem('armature-weight')||70;}catch{}
 $('weight').onchange=()=>{try{localStorage.setItem('armature-weight',$('weight').value)}catch{}};
 $('resetActivity').onclick=()=>{activity.reset();workoutUI();};$('soundToggle').onclick=$('gameSound').onclick=()=>{const text=sound.toggle()?'Sound off':'Sound on';$('soundToggle').textContent=$('gameSound').textContent=text;};
 const fullscreen=setupFullscreen($('viewport'),$('fullscreen'),pause);$('immersivePause').onclick=()=>state==='playing'?pause():state==='paused'?start():null;$('immersiveAction').onclick=()=>practicePunch();

 function placeZombie(e){e.root.position.set(...boxingPoint([.16,e.root.position.y,-e.distance],e.angle));e.root.rotation.y=e.angle;}
 function zombie(z){const index=spawned++,profile=zombieProfile(index,wave),e=boxing.fighter(index,profile);Object.assign(e,{kind:profile.name,speedMultiplier:profile.speed,attackPeriod:profile.attackPeriod,points:profile.points,angle:approachAngle(index),distance:-z});placeZombie(e);e.hp=e.maxHp=profile.hp;enemies.push(e);return e;}
 function removeObject(root){scene.remove(root)}
 function clear(){impactFx.clear();const buffered=getTracking().samples;if(buffered)buffered.length=0;$('hitFeedback').textContent='';$('strikeReadout').textContent='Wrist speed · estimated';$('hitFeedback').classList.remove('show');$('gameDetail').textContent='';focus=null;combo=0;boxingYaw=0;player.rotation.y=0;readoutSpeed=0;speedAt=0;wristMeter.reset();for(const e of enemies)removeObject(e.root);enemies.length=0;detector.reset();}
 function feedback(text,{kind='punch',point=fist,power=1,direction=null}={}){power=T.MathUtils.clamp(power,.3,1.5);shake=Math.max(shake,kind==='miss'?0:mode==='bird'?.009:.022+power*.024);sound.play(kind,{power,pan:T.MathUtils.clamp(point.x*.65,-.7,.7)});if(kind!=='miss')impactFx.burst(point,kind,power,direction);$('hitFeedback').textContent=text;$('hitFeedback').dataset.kind=kind;feedbackUntil=performance.now()+(kind==='knockout'?950:650);$('hitFeedback').classList.add('show');if($('impactEffects').checked&&!reducedMotion.matches)$('hitFeedback').animate([{transform:`translateY(5px) scale(${1.03+power*.04})`},{transform:'translateY(0) scale(1)'}],{duration:220,easing:'ease-out'});}
 function overlay(title,text,button){$('roundResults').hidden=true;$('nextRound').hidden=true;$('overlayTip').hidden=false;$('gameOverlay').hidden=false;$('overlayTitle').textContent=title;$('overlayText').textContent=text;$('startGame').textContent=button;}
 function liveReady(){const t=getTracking();return t.connected&&t.last&&performance.now()-t.last<250&&(t.flags&1)&&!(t.flags&6)&&!t.calPending;}
 function ready(){return input==='practice'||liveReady()}
 function pause(reason=''){if(state!=='playing')return;readoutSpeed=0;speedAt=0;wristMeter.reset();state='paused';hudAt=0;sound.stop();extra.suspend();action=false;detector.reset();overlay('Paused',reason,'Resume round');$('pauseGame').textContent='Resume';}
 function roundStats(){return {...(extraResult||{}),kills,hits,bullseyes,elapsed,bestCombo:extraResult?.bestCombo??bestCombo};}
 function finish(quiet=false,timed=false){
  sound.stop();state='over';hudAt=0;$('opponentHud').hidden=true;detector.reset();$('pauseGame').disabled=true;if(quiet)return;
  const defeated=mode==='zombies'?lives<=0:extraResult?.hp<=0;sound.play(defeated?'defeat':'finish');
  const score=extraResult?.score??boxingScore,record=records.save(mode,input,roundLimit,score),stats=roundStats(),challenge=roundChallenge(mode,stats);
  overlay(timed?'Round complete':mode==='bird'?'Flight over':defeated?'Run complete':'Time’s up','', 'Play again');
  $('roundResults').hidden=false;$('overlayTip').hidden=true;$('nextRound').hidden=false;
  $('resultMode').textContent=`${GAMES[mode].name} · ${input==='practice'?'Practice':'Live arm'} · ${roundLimit?'Quick':'Standard'}`;
  $('resultScore').textContent=score.toLocaleString();$('resultRecord').textContent=record.isNew?'NEW PERSONAL BEST':`BEST ${record.best.toLocaleString()}`;
  resultMetrics(mode,stats).forEach(([label,value],i)=>{$(`resultLabel${i}`).textContent=label;$(`resultValue${i}`).textContent=value;});
  $('resultChallenge').textContent=`${challenge.complete?'✓':'○'} ${challenge.label} · ${challenge.current}/${challenge.goal}`;$('resultChallenge').dataset.complete=String(challenge.complete);
  $('resultFitness').textContent=input==='practice'?'Practice · calories paused':`${Math.max(0,activity.kcal-roundStartKcal).toFixed(1)} kcal est. this round · ${activity.kcal.toFixed(1)} this session`;
  $('nextRound').textContent=`Next · ${GAMES[GAME_ORDER[(GAME_ORDER.indexOf(mode)+1)%GAME_ORDER.length]].name}`;
 }
 function start(){sound.unlock();if(!ready()){if(active){$('overlayText').textContent='Tracking is not ready. Return to the lobby to reconnect or calibrate.';return;}$('lobbyNotice').textContent=getTracking().connected?'Calibrate your arm before playing.':'Connect your arm, or choose Practice in Settings.';return;}active=true;document.body.classList.add('in-game','arcade-active');$('viewport').scrollTop=0;$('settings').open=false;$('gameHud').hidden=false;$('gameToolbar').hidden=false;fullscreen.enter();
 if(state!=='paused'){roundLimit=Number($('roundDuration').value);bestCombo=bullseyes=0;challengeDone=false;roundStartKcal=activity.kcal;clear();elapsed=0;nextSpawn=2.5;kills=hits=boxingScore=spawned=0;lives=5;wave=1;extra.reset(mode);extraResult=null;if(mode==='zombies')zombie(-2.1);}
 detector.reset();practiceStart=-10000;extra.group.visible=mode!=='zombies';state='playing';hudAt=0;sound.setScene(mode,!extra.waitingForFlap,elapsed);$('viewport').focus({preventScroll:true});sound.play('bell');$('gameOverlay').hidden=true;$('pauseGame').disabled=false;$('pauseGame').textContent='Pause';}
 function select(next){
 if(!GAME_ORDER.includes(next))next='zombies';document.body.dataset.game=next;mode=next;sound.setScene(next,false);world.select(next);
 boxing.environment.visible=next==='zombies';arena.visible=street.visible=next==='shield';sky.visible=next==='bird';scene.background.set(next==='bird'?'#9fcbd0':'#0b1018');scene.fog.color.copy(scene.background);scene.fog.density=next==='bird'?.025:.075;
 extra.reset(next);extraResult=null;active=false;state='menu';clear();elapsed=0;hits=kills=boxingScore=spawned=0;lives=5;wave=1;
 document.body.classList.remove('arcade-active','in-game');for(const id of ['opponentHud','gameHud','gameOverlay','gameToolbar','roundChallenge','roundResults','nextRound'])$(id).hidden=true;
 const index=GAME_ORDER.indexOf(next);$('selectedGameName').textContent=GAMES[next].name;$('selectedGameNumber').textContent=`${String(index+1).padStart(2,'0')} / ${String(GAME_ORDER.length).padStart(2,'0')}`;
 $('lobbyNotice').textContent=input==='practice'?'Practice · calories paused':'';
 $('practicePunch').textContent=next==='bird'?'Flap · Space':'Strike · Space';$('punchOptions').hidden=input!=='practice'||next==='shield';$('guardControls').hidden=input!=='practice'||next!=='shield';$('practicePunch').hidden=input!=='practice'||next==='shield';$('punchStyleLabel').hidden=next!=='zombies';$('strikeReadout').hidden=next!=='zombies';$('immersiveAction').textContent=next==='bird'?'Flap':'Strike';$('overlayTip').textContent=GAMES[next].help;
 $('speedLabel').textContent=next==='bird'?'FLIGHT SPEED':'WRIST SPEED';$('speedUnit').textContent=next==='bird'?'m/s':'m/s est.';$('liveSpeed').textContent='0.0';
 camera.position.set(next==='bird'?3:3.3,next==='bird'?3:2.2,next==='bird'?5:5.4);cameraAim.set(0,next==='bird'?2:1.1,-3);camera.fov=57;$('pauseGame').disabled=true;
 }
 function changeGame(direction){if(active)return;sound.unlock();const index=GAME_ORDER.indexOf(mode);select(GAME_ORDER[(index+direction+GAME_ORDER.length)%GAME_ORDER.length]);sound.play('select');}
 $('previousGame').onclick=()=>changeGame(-1);$('nextGame').onclick=()=>changeGame(1);
 $('gamePicker').addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();changeGame(e.key==='ArrowLeft'?-1:1);}});
 $('playGame').onclick=$('startGame').onclick=start;
 $('nextRound').onclick=()=>{if(state!=='over')return;select(GAME_ORDER[(GAME_ORDER.indexOf(mode)+1)%GAME_ORDER.length]);start();};
 function lobby(){if(state==='playing'||state==='paused')finish(true);fullscreen.exit();select(mode);$('playGame').focus();}
 $('backLobby').onclick=$('overlayLobby').onclick=lobby;
 $('pauseGame').onclick=()=>state==='playing'?pause():state==='paused'?start():null;
 $('gameInput').onchange=()=>{input=$('gameInput').value;select(mode);$('practicePunch').hidden=input!=='practice'||mode==='shield';$('inputHint').textContent=input==='practice'?(mode==='bird'?'Space or tap to flap · automatic forward movement':mode==='shield'?'Arrow keys or drag in scene':'Space or Strike · simulated arm'):'Live right arm · calibrated ESP32 required';};
 function practicePunch(){if(mode!=='shield'&&input==='practice'&&state==='playing'&&practiceClock-practiceStart>(mode==='bird'?.23:.8)){action=true;practiceStart=practiceClock;practiceStyle=$('punchStyle').value;practiceEffort=Number($('strikeEffort').value);if(mode!=='bird')sound.play('whoosh',{power:.5+Number($('strikeEffort').value)*.25,pan:.3});}}
 $('practicePunch').onclick=practicePunch;
 for(const [id,x,y] of [['guardLeft',-1,0],['guardUp',0,1],['guardDown',0,-1],['guardRight',1,0]])$(id).onclick=()=>{if(state==='playing')extra.nudgeShield(x,y);};
 $('viewport').addEventListener('click',e=>{if(mode==='bird'&&e.target.tagName==='CANVAS')practicePunch();});
 window.addEventListener('keydown',e=>{if(e.code==='Escape')pause();if(e.code==='Space'&&!e.repeat&&active&&input==='practice'&&!/INPUT|SELECT|BUTTON|TEXTAREA/.test(e.target.tagName)){e.preventDefault();practicePunch();}});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){pause('The round paused while this tab was hidden.');sound.stop();}else if(!active)sound.setScene(mode,false);});
 function tick(now){const dt=lastFrame?Math.min((now-lastFrame)/1000,.05):0;lastFrame=now;world.tick(dt);
 const t=getTracking();const liveSamples=t.samples?.splice(0)||[];const qUpper=input==='practice'?practiceUpper:t.qu,qLower=input==='practice'?practiceLower:t.qf;
 if(state==='playing'){if(!ready())pause('Tracking paused. Reconnect or recalibrate, then resume when the signal is fresh.');else{if(!extra.waitingForFlap)elapsed+=dt;practiceClock+=dt;}}
 const p=practiceClock-practiceStart;const extension=punchExtension(p);
 const stroke=practiceStroke(p,practiceStyle,practiceEffort);
 practiceUpper.setFromAxisAngle(new T.Vector3(1,0,0),.55);practiceLower.setFromAxisAngle(new T.Vector3(1,0,0),1.4);
 elbow.copy(down).applyQuaternion(qUpper).multiplyScalar(t.upperLen).add(rightShoulder);fist.copy(down).applyQuaternion(qLower).multiplyScalar(t.lowerLen+.055).add(elbow);
 if(input==='practice'&&mode==='zombies'){
  practiceArm(new T.Vector3(...stroke.p),t);
 }
 rig.rightHand.position.copy(fist);rig.rightHand.quaternion.copy(qLower);rig.leftHand.position.copy(leftGlove.position);rig.leftHand.quaternion.copy(leftGlove.quaternion);rig.rightHand.visible=rig.leftHand.visible=mode!=='zombies';glove.visible=leftGlove.visible=mode==='zombies';
 bone(rightUpper,rightShoulder,elbow);bone(rightLower,elbow,fist);glove.position.copy(fist);glove.quaternion.copy(qLower);glove.scale.set(1+shake*.5,1-shake*.7,1+shake*.4);
 const wristSamples=input==='practice'?[{p:fist.toArray(),time:now}]:liveSamples.map(s=>({p:down.clone().applyQuaternion(s.qu).multiplyScalar(t.upperLen).add(rightShoulder).add(down.clone().applyQuaternion(s.qf).multiplyScalar(t.lowerLen+.055)).toArray(),q:s.qf.toArray(),time:s.time}));
 if(mode==='zombies'){focus=engagedOpponent(enemies,focus);if(state==='playing')boxingYaw=turnHeading(boxingYaw,focus?.angle??boxingYaw,dt);player.rotation.y=boxingYaw;}else player.rotation.y=0;
 const breathe=state==='playing'?Math.sin(elapsed*2.1)*.008:0;leftGlove.position.y=1.35+breathe;leftGlove.position.z=-.3-extension*.03;bone(leftUpper,leftShoulder,leftElbow);bone(leftLower,leftElbow,leftGlove.position);
 if(state==='playing'){
  const sweeps=[];
  if(input==='practice'&&stroke.phase!=='strike'){detector.reset();detector.sample(fist.toArray(),now);}else for(const sample of wristSamples){const sweep=detector.sample(sample.p,sample.time);if(sweep)sweeps.push(sweep);}
  if(sweeps.length){const move=sweeps.at(-1);$('strikeReadout').textContent=`${move.type.toUpperCase()} · ${move.damage} damage`;}
  if(sweeps.length&&input==='live'&&now-lastWhoosh>450){if(mode==='zombies')sound.play('whoosh',{power:Math.min(1.5,sweeps.at(-1).peakSpeed/2),pan:.3});lastWhoosh=now;}
  if(mode==='zombies'){
   wave=1+Math.floor(kills/5);if(elapsed>=nextSpawn&&enemies.filter(e=>!e.dead).length<4){zombie(-3.5-(spawned%2)*.4);nextSpawn=elapsed+Math.max(1.8,3.1-wave*.15);}
   const living=enemies.filter(e=>!e.dead).sort((a,b)=>a.distance-b.distance);
   living.forEach((e,i)=>{const limit=e===focus?-BOXING_STOP_Z:1.75+i*.55;e.distance=Math.max(limit,e.distance-dt*(.55+Math.min(wave,8)*.06)*e.speedMultiplier);placeZombie(e);
    e.flash=Math.max(0,e.flash-dt);boxing.animate(e,elapsed,dt);if(e===focus&&e.attack>e.attackPeriod*.67&&!e.warned){sound.play('growl',{pan:e.root.position.x*.5});e.warned=true;}if(e.attack<.3)e.warned=false;
    if(e===focus&&e.distance>1.1){const foot=Math.floor(elapsed*1.8);if(foot!==e.step){sound.play('step',{power:Math.max(.3,1+e.root.position.z/8),pan:e.root.position.x*.5});e.step=foot;}}
    if(e===focus&&e.distance<=-BOXING_STOP_Z+.02){e.attack+=dt;if(e.attack>e.attackPeriod){lives--;combo=0;e.attack=0;feedback('TOO CLOSE −1',{kind:'hurt',point:new T.Vector3(...boxingPoint([0,1.45,-.3],boxingYaw))});$('viewport').classList.add('hurt');setTimeout(()=>$('viewport').classList.remove('hurt'),220);if(lives<=0)finish();}}else e.attack=0;
   });
   if(now-hudAt>=100){focus=engagedOpponent(enemies,focus);$('opponentHud').hidden=!focus||state!=='playing';$('opponentName').textContent=focus?`${focus.kind.toUpperCase()} · ${Math.ceil(focus.hp)} HP`:'CLEAR';$('opponentCue').textContent=focus?(focus.attack>focus.attackPeriod*.6?'Incoming swing':focus.distance<.95?'In reach · punch':'Closing in'):'';document.querySelectorAll('.opponent-bars i').forEach((bar,i)=>{const fraction=focus?T.MathUtils.clamp(focus.hp/focus.maxHp*2-i,0,1):0;bar.style.background=`linear-gradient(to right,#f3ba80 ${fraction*100}%,#ffffff26 ${fraction*100}%)`;});}

   let landed=false;const hitBodies=sweeps.length?living.map(e=>({e,capsules:boxing.hitVolumes(e)})):[];
   for(const sweep of sweeps){if(landed||state!=='playing')break;for(const {e,capsules} of hitBodies){const worldSweep=boxingSweep(sweep,boxingYaw),center=new T.Vector3(...worldSweep.b);if(punchHitsBody(worldSweep,capsules)){
    detector.consume();landed=true;hits++;combo=elapsed-lastHit<4?combo+1:1;lastHit=elapsed;bestCombo=Math.max(bestCombo,combo);e.flash=.2+sweep.damage*.002;e.attack=0;const dead=strike(e,sweep.damage);e.health.forEach((h,i)=>{h.scale.x=.13*T.MathUtils.clamp(e.hp/e.maxHp*2-i,0,1);});const impactDirection=new T.Vector3().fromArray(worldSweep.b).sub(new T.Vector3().fromArray(worldSweep.a)).normalize();e.hitSide=impactDirection.x;e.hitLift=sweep.type==='uppercut'?1:0;
    $('strikeReadout').textContent=`${sweep.type.toUpperCase()} · ${sweep.damage} damage`;readoutSpeed=Math.max(readoutSpeed,sweep.peakSpeed);speedAt=now;
    if(dead){kills++;boxingScore+=e.points;e.dead=.001;feedback(`${sweep.type.toUpperCase()} · KNOCKOUT +${e.points}`,{kind:'knockout',point:center,power:sweep.damage/65,direction:impactDirection});}else{e.distance+=.10+sweep.damage*.0015;placeZombie(e);feedback(`${sweep.type.toUpperCase()} · −${sweep.damage} HP`,{kind:'punch',point:center,power:sweep.damage/65,direction:impactDirection});}break;
   }}}
   for(let i=enemies.length-1;i>=0;i--){const e=enemies[i];if(e.dead){e.dead+=dt;e.root.rotation.x=-Math.min(Math.PI/2,e.dead*2.2);e.root.rotation.z=(e.hitSide||Math.sin(e.index+1)*.4)*e.dead*.7;e.distance+=dt*.9;placeZombie(e);e.root.position.y=-Math.max(0,e.dead-.35)*.15;if(e.dead>1.1){removeObject(e.root);enemies.splice(i,1)}}}
  }else {const waiting=extra.waitingForFlap;extraResult=extra.tick(dt,fist,qLower,input==='practice',action,wristSamples);if(waiting&&!extra.waitingForFlap){elapsed+=dt;sound.setScene(mode,true,elapsed);sound.play('flap');}if(extraResult?.over)finish();}

 if(state==='playing'&&roundLimit>0&&elapsed>=roundLimit)finish(false,true);
 action=false;
 }
 if(mode==='shield'&&input==='practice'&&extraResult?.shield){practiceArm(new T.Vector3(extraResult.shield[0],extraResult.shield[1]-.10,-.32),t);bone(rightUpper,rightShoulder,elbow);bone(rightLower,elbow,fist);rig.rightHand.position.copy(fist);rig.rightHand.quaternion.copy(practiceLower);}
 if(state==='playing')for(const sample of (input==='practice'?[{p:fist.toArray(),time:now}]:wristSamples)){const m=wristMeter.sample(sample.p,sample.time);if(m&&(m.speed>=readoutSpeed||now-speedAt>700)){readoutSpeed=m.speed;speedAt=now;}}
 if(state!=='playing'||now-speedAt>900)readoutSpeed=0;
 activity.update(dt,{playing:state==='playing'&&!extra.waitingForFlap,live:input==='live',fresh:!!liveReady(),visible:!document.hidden,weight:Number($('weight').value),met:Number($('effort').value)});
 sound.update(Math.min(1,.2+(mode==='zombies'?wave*.07+combo*.06:(extraResult?.combo||0)*.07)),extraResult?.speed||0,state==='playing'&&!extra.waitingForFlap?elapsed:null);
 if(mode==='bird'&&state==='playing'&&!extra.waitingForFlap){for(const decoration of sky.children.slice(1)){decoration.position.z+=dt*(extraResult?.speed||3);if(decoration.position.z>6)decoration.position.z-=54;}}
 if(feedbackUntil&&now>feedbackUntil){$('hitFeedback').classList.remove('show');feedbackUntil=0;}
 if(now-hudAt>=100){hudAt=now;workoutUI();$('liveEnergy').textContent=activity.kcal.toFixed(1);$('liveSpeed').textContent=(mode==='bird'?(state==='playing'?extraResult?.speed||0:0):readoutSpeed).toFixed(1);
 $('gameScore').textContent=String(boxingScore);$('roundLabel').textContent=mode==='zombies'?'WAVE':'SECONDS';$('gameRound').textContent=mode==='zombies'?String(wave):String(Math.max(0,Math.ceil(45-elapsed)));$('healthLabel').textContent=mode==='zombies'?'HEALTH':'HITS';$('gameHealth').textContent=mode==='zombies'?'●'.repeat(Math.max(0,lives))+'○'.repeat(5-Math.max(0,lives)):String(hits);
 $('gameState').textContent=(state==='playing'?(input==='live'?'LIVE ARM':'KEYBOARD / TOUCH'):state.toUpperCase())+(state==='playing'&&extra.waitingForFlap?' · READY':roundLimit>0&&state!=='over'?` · ${Math.max(0,Math.ceil(roundLimit-elapsed))}s`:'');
 if(!extraResult&&mode!=='zombies'){$('gameRound').textContent=String(roundLimit||60);$('roundLabel').textContent='SECONDS';$('healthLabel').textContent='HEALTH';$('gameHealth').textContent='●●●●●';}
 if(extraResult){$('gameScore').textContent=extraResult.score;$('roundLabel').textContent=mode==='bird'?'DISTANCE':'SECONDS';$('gameRound').textContent=mode==='bird'?extraResult.distance+' m':(roundLimit>0?Math.min(extraResult.seconds,Math.max(0,Math.ceil(roundLimit-elapsed))):extraResult.seconds);$('healthLabel').textContent=mode==='bird'?'GAPS':'HEALTH';$('gameHealth').textContent=mode==='bird'?String(extraResult.combo):'●'.repeat(Math.max(0,extraResult.hp))+'○'.repeat(Math.max(0,5-extraResult.hp));}
 if(['shield','bird'].includes(mode)){const o=extraResult?.opponent;$('opponentHud').hidden=!o||state!=='playing';if(o){$('opponentName').textContent=o.name;$('opponentCue').textContent=o.cue;document.querySelectorAll('.opponent-bars i').forEach(bar=>bar.style.background=`linear-gradient(to right,${o.color} ${o.fraction*100}%,#ffffff26 ${o.fraction*100}%)`);}}
 $('practicePunch').disabled=state!=='playing'||practiceClock-practiceStart<=(mode==='bird'?.23:.8);for(const id of ['guardLeft','guardUp','guardDown','guardRight'])$(id).disabled=state!=='playing';
 $('immersiveAction').hidden=input!=='practice';$('immersiveAction').disabled=state!=='playing';$('immersivePause').textContent=state==='paused'?'Resume':'Pause';$('immersivePause').disabled=!['playing','paused'].includes(state);
 $('gameDetail').textContent=extraResult?.detail||'';
 $('bestScore').textContent=records.best(mode,input,Number($('roundDuration').value));$('bestScoreLabel').textContent=input==='practice'?'Practice best':'Live best';
 const challenge=roundChallenge(mode,roundStats());$('roundChallenge').hidden=state!=='playing';$('roundChallenge').textContent=challenge.complete?`✓ ${challenge.label}`:`${challenge.short} ${challenge.current}/${challenge.goal}`;$('roundChallenge').dataset.complete=String(challenge.complete);if(state==='playing'&&challenge.complete&&!challengeDone){challengeDone=true;sound.play('challenge');}
 }
 if(!active){
  player.visible=false;extra.group.visible=false;extra.preview(now);const travel=$('cameraMotion').checked?Math.sin(now*.00013)*.5:0;
  camera.position.set(mode==='bird'?3+travel:3.3+travel,mode==='bird'?3:2.2,mode==='bird'?5:5.4);camera.lookAt(0,mode==='bird'?2:1.1,-3);camera.fov=57;
  const size=renderer.getSize(viewportSize);camera.aspect=size.x/size.y;camera.updateProjectionMatrix();impactFx.tick(dt,camera,{effects:$('impactEffects').checked,paused:!!$('setupDialog').open});renderer.render(scene,camera);lobbyAvatar.render(now,t);return true;
 }
 player.visible=mode!=='bird';extra.group.visible=mode!=='zombies';
 const motion=$('cameraMotion').checked;shake*=Math.exp(-dt*18);const view=$('cameraView').value;
 focus=mode==='zombies'?engagedOpponent(enemies,focus):null;
 const aim=new T.Vector3(mode==='bird'?0:.1,mode==='bird'?1.5:1.3,mode==='bird'?-6:-2.3);
 const birdPos=extraResult?.bird||new T.Vector3(0,2.2,-.5);
 const cp=mode==='bird'?(view==='shoulder'?new T.Vector3(birdPos.x,birdPos.y+.7,1.6):new T.Vector3(birdPos.x,birdPos.y+.04,.02)):view==='shoulder'?new T.Vector3(.28,1.8,.48):new T.Vector3(.03,1.60,.07);
 bodyParts.forEach(part=>part.visible=view==='shoulder');
 if(mode==='bird'){aim.set(0,birdPos.y,-6);extra.setView(view==='shoulder');}
 if(mode==='zombies'&&view==='director'&&focus){aim.z=-Math.max(1.7,focus.distance);cp.y+=T.MathUtils.clamp((focus.distance-1)*.014,0,.07);}
 if(motion&&state==='playing'){if(mode!=='bird')cp.x+=Math.sin(now*.063)*shake*.45;cp.y+=Math.sin(elapsed*2)*.006+Math.cos(now*.047)*shake*.2;cp.z+=shake*.2;}
 if(mode==='zombies'){camera.position.copy(cp).applyAxisAngle(up,boxingYaw);cameraAim.copy(aim).applyAxisAngle(up,boxingYaw);}else{camera.position.lerp(cp,1-Math.exp(-dt*7));cameraAim.lerp(aim,1-Math.exp(-dt*4));}camera.lookAt(cameraAim);if(motion&&state==='playing'&&mode!=='bird')camera.rotateZ(Math.sin(now*.032)*shake*.23);
 camera.fov=T.MathUtils.lerp(camera.fov,mode==='zombies'&&view==='director'&&motion?74+Math.min(3,shake*45):76+(motion?mode==='bird'?Math.min(7,Math.max(0,(extraResult?.speed||3)-3)*1.2):shake*30:0),1-Math.exp(-dt*5));
 const size=renderer.getSize(viewportSize);camera.aspect=size.x/size.y;camera.updateProjectionMatrix();impactFx.tick(dt,camera,{effects:$('impactEffects').checked,flight:mode==='bird',speed:extraResult?.speed||0,paused:state!=='playing'});renderer.render(scene,camera);return true;
 }
 select('zombies');return {tick,pause,get active(){return active}};
}
