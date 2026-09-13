import * as THREE from 'three';
import {FrameBudget,writeText} from './frame-budget.js';
import {createArcade} from './game.js?v=demo-pass4';
import {SERVICE,DATA,CONTROL,decode,sequenceGap,calibrationView} from './protocol.js';
const $=id=>document.getElementById(id);
const frameBudget=new FrameBudget(devicePixelRatio);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(frameBudget.ratio);renderer.setClearColor('#162023');$('viewport').prepend(renderer.domElement);
let upperLen=.3,lowerLen=.26;function dimensions(){upperLen=Math.min(50,Math.max(15,Number($('upperLength').value)||30))/100;lowerLen=Math.min(45,Math.max(15,Number($('lowerLength').value)||26))/100;}dimensions();$('upperLength').onchange=dimensions;$('lowerLength').onchange=dimensions;
const qu=new THREE.Quaternion(),qf=new THREE.Quaternion(),basis=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-Math.PI/2),basisInv=basis.clone().invert();
const trackingSamples=[];let motionSequence=null,motionClock=0,motionArrival=0;
let packetUI=null,calibrationKey='';
let device=null,control=null,stream=null,busy=false,demo=false,last=0,seq=null,lost=0,count=0,rateStart=performance.now(),latestFlags=0,calPending=false,calDeadline=0,calCommand=0,calibrationMode=false;
function renderCalibration(flags,progress=0,reason=0){
 const key=`${flags}/${progress}/${reason}/${calPending}/${calibrationMode}`;if(key===calibrationKey)return;calibrationKey=key;
 const v=calibrationView(flags,progress,calPending,reason);
 const showPose=!v.ready&&!(flags&4)&&(calibrationMode||!!(flags&128));
 $('poseInstructions').hidden=!showPose;
 $('calTitle').textContent=showPose?v.title:'';
 $('calInstructions').textContent=!showPose?'':v.step===2?'Right arm sideways at shoulder height, elbow straight, palm down. Hold comfortably for 3 seconds.':'Right arm at your side, palm toward your thigh. Hold comfortably for 3 seconds.';
 $('calibrate').textContent=showPose||v.ready?v.button:'Calibrate';$('calibrate').disabled=v.disabled;
 const needsStatus=flags&&(calPending||v.capturing||reason||!!(flags&76)||!(flags&128));
 $('calStatus').textContent=needsStatus?v.status:'';
 $('calProgress').hidden=!v.capturing;$('calProgress').value=v.capturing?progress:0;
 $('cancelCalibration').hidden=!v.cancel;$('cancelCalibration').disabled=calPending;
 $('calibrationPanel').classList.toggle('t-pose',v.step===2);
}
function message(s){$('message').textContent=s;if(s.startsWith('Connection failed')||s.startsWith('Open this page'))$('setupDialog').showModal();}
$('connectInSetup').onclick=()=>$('connect').click();
function reset(){packetUI=null;calibrationKey='';trackingSamples.length=0;motionSequence=null;motionArrival=0;$('connectInSetup').textContent='Connect ESP32';control=null;stream=null;busy=false;last=0;seq=null;count=0;lost=0;latestFlags=0;calPending=false;$('connect').disabled=false;$('connect').textContent='Connect ESP32 ↗';$('connection').textContent='Arm offline';$('openSetup').textContent='Connect arm ↗';calibrationMode=false;$('mode').textContent='PREVIEW';$('calibrate').disabled=true;renderCalibration(0);$('upperState').textContent=$('lowerState').textContent='Offline';$('rate').textContent=$('age').textContent=$('lost').textContent='—';$('demo').disabled=false;}
function receive(e){try{const p=decode(e.target.value);const now=performance.now();lost+=sequenceGap(seq,p.sequence);seq=p.sequence;last=now;count++;latestFlags=p.flags;
 for(const [i,q] of [qu,qf].entries()){const a=p.qs[i];q.set(a[1],a[2],a[3],a[0]).premultiply(basis).multiply(basisInv).normalize()}
 const delta=motionSequence===null?0:(p.sequence-motionSequence+65536)%65536;
 if(delta===0||delta>15||now-motionArrival>250){motionClock+=1000;trackingSamples.length=0;}else motionClock+=delta*10;
 motionSequence=p.sequence;motionArrival=now;
 if((p.flags&1)&&!(p.flags&6)){trackingSamples.push({qu:qu.clone(),qf:qf.clone(),time:motionClock});if(trackingSamples.length>32)trackingSamples.shift();}else trackingSamples.length=0;
 const calibrating=!!(p.flags&2),ready=!!(p.flags&1),fault=!!(p.flags&4);
 if(calPending&&((calCommand===1&&calibrating&&!(p.flags&32))||(calCommand===2&&!!(p.flags&32))||(calCommand===3&&!(p.flags&19))))calPending=false;
 packetUI=p; // Pose/quaternions are already current; only the labels wait for the 10 Hz UI pass.
 }catch(err){message(err.message)}}
$('connect').onclick=async()=>{if(busy)return;if(device?.gatt.connected){device.gatt.disconnect();return}if(!navigator.bluetooth||!isSecureContext){message('Open this page in Chrome on a supported computer, using HTTPS or localhost. This browser cannot access Web Bluetooth.');return}busy=true;$('connect').disabled=true;demo=false;$('demo').textContent='Preview avatar motion';try{device=await navigator.bluetooth.requestDevice({filters:[{services:[SERVICE]}]});device.addEventListener('gattserverdisconnected',()=>{reset();message('ESP32 disconnected. Reconnect and calibrate before tracking again.')},{once:true});const server=await device.gatt.connect();const service=await server.getPrimaryService(SERVICE);control=await service.getCharacteristic(CONTROL);stream=await service.getCharacteristic(DATA);stream.addEventListener('characteristicvaluechanged',receive);await stream.startNotifications();
last=0;seq=null;lost=0;count=0;rateStart=performance.now();$('connection').textContent='Arm connected';$('openSetup').textContent='Arm connected ✓';$('connect').textContent='Disconnect';$('demo').disabled=true;renderCalibration(latestFlags);message('Calibrate with two poses: arm down, then right arm extended sideways.');}catch(err){device?.gatt?.disconnect();reset();message(`Connection failed: ${err.message}`)}finally{busy=false;$('connect').disabled=false;$('connectInSetup').textContent=device?.gatt.connected?'Disconnect ESP32':'Connect ESP32';if(device?.gatt.connected)$('setupDialog').close();}};
async function calibrationCommand(command){if(!control||calPending)return;calCommand=command;calPending=true;calDeadline=performance.now()+5000;renderCalibration(latestFlags);try{await control.writeValueWithResponse(new Uint8Array([command]));}catch(err){calPending=false;renderCalibration(latestFlags);$('calStatus').textContent=`Calibration failed: ${err.message}`;}}
$('calibrate').onclick=()=>{calibrationMode=true;calibrationCommand(calibrationView(latestFlags,0).command);};
$('cancelCalibration').onclick=()=>{calibrationMode=false;calibrationCommand(3);};
$('demo').onclick=()=>{demo=!demo;qu.identity();qf.identity();$('mode').textContent=demo?'DEMO':'PREVIEW';$('demo').textContent=demo?'Stop avatar preview':'Preview avatar motion';message(demo?'Simulated movement. Connect the ESP32 for live tracking.':'Connect your ESP32 to start live tracking.');};
const observer=new ResizeObserver(()=>{const r=$('viewport').getBoundingClientRect();renderer.setSize(r.width,r.height)});observer.observe($('viewport'));
const arcade=createArcade(renderer,()=>({qu,qf,upperLen,lowerLen,last,flags:latestFlags,calPending,demo,samples:trackingSamples,connected:!!device?.gatt.connected}));
const down=new THREE.Vector3(0,-1,0),u=new THREE.Vector3(),f=new THREE.Vector3();let uiTime=0;
try{const saved=localStorage.getItem('armature-graphics');if(['auto','low','high'].includes(saved)){$('graphicsQuality').value=saved;renderer.setPixelRatio(frameBudget.setMode(saved));}}catch{}
$('graphicsQuality').onchange=()=>{renderer.setPixelRatio(frameBudget.setMode($('graphicsQuality').value));try{localStorage.setItem('armature-graphics',$('graphicsQuality').value);}catch{}};
renderer.setAnimationLoop(now=>{const renderStart=performance.now();if(demo&&!arcade.active){qu.setFromEuler(new THREE.Euler(.15*Math.sin(now/1300),0,.32+.25*Math.sin(now/1900)));qf.copy(qu).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-.85-.8*Math.sin(now/1100)))}
 u.copy(down).applyQuaternion(qu);f.copy(down).applyQuaternion(qf);
 if(now-uiTime>100){uiTime=now;if(packetUI){const p=packetUI;renderCalibration(p.flags,p.progress,p.calibrationReason);writeText($('mode'),p.flags&4?'SENSOR ERROR':p.flags&2?'CALIBRATING':p.flags&1?'LIVE':p.flags&16?'T-POSE NEXT':'NEEDS CALIBRATION');writeText($('upperState'),p.flags&4?'Check wiring':'Streaming');writeText($('lowerState'),p.flags&4?'Check wiring':'Streaming');}$('angle').innerHTML=`${Math.round(THREE.MathUtils.radToDeg(u.angleTo(f)))}<small>°</small>`;if(last){$('age').innerHTML=`${Math.round(now-last)}<small> ms</small>`;$('lost').textContent=lost;if(now-last>500){calibrationKey='';$('mode').textContent='STALE';$('calibrate').disabled=true;$('upperState').textContent=$('lowerState').textContent='No fresh data';}}if(now-rateStart>=1000){$('rate').innerHTML=last?`${Math.round(count*1000/(now-rateStart))}<small> Hz</small>`:'—';count=0;rateStart=now}if(calPending&&now>calDeadline){calPending=false;renderCalibration(latestFlags);$('calStatus').textContent='No calibration acknowledgement. Try again.'}}
 arcade.tick(now);const report=frameBudget.sample(now,performance.now()-renderStart,!document.hidden);if(report){if(report.changed)renderer.setPixelRatio(report.ratio);writeText($('frameStats'),`${report.fps} FPS · ${report.p90.toFixed(0)} ms frame`);}
});
