import * as THREE from 'three';
import {createArcade} from './game.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {SERVICE,DATA,CONTROL,decode,sequenceGap,calibrationView} from './protocol.js';
const $=id=>document.getElementById(id);
const scene=new THREE.Scene();scene.background=new THREE.Color('#162023');scene.fog=new THREE.Fog('#162023',4,11);
const camera=new THREE.PerspectiveCamera(36,1,.01,30);
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor('#162023');$('viewport').prepend(renderer.domElement);
const orbit=new OrbitControls(camera,renderer.domElement);orbit.enableDamping=true;orbit.minDistance=1;orbit.maxDistance=6;orbit.maxPolarAngle=Math.PI*.9;
function home(){camera.position.set(1.35,1.12,2.35);orbit.target.set(.12,.83,0);orbit.update()}home();$('home').onclick=home;
scene.add(new THREE.HemisphereLight(0xe9ffef,0x26383c,2.5));const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(2,4,3);scene.add(light);
const grid=new THREE.GridHelper(8,64,0x456055,0x2a3a39);scene.add(grid);
const mat=(color,metalness=.25)=>new THREE.MeshStandardMaterial({color,roughness:.38,metalness});
const lime=mat('#c3ed92'),teal=mat('#83d0d2'),jointMat=mat('#344548',.7),bodyMat=mat('#293a3d');
function sphere(r,m){return new THREE.Mesh(new THREE.SphereGeometry(r,28,20),m)}
const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.18,.37,8,24),bodyMat);torso.position.set(-.22,1.04,0);torso.scale.set(1,.95,.67);scene.add(torso);const head=sphere(.105,bodyMat);head.position.set(-.22,1.49,0);scene.add(head);
const shoulder=new THREE.Vector3(.035,1.24,0);const shoulderMesh=sphere(.073,jointMat);shoulderMesh.position.copy(shoulder);scene.add(shoulderMesh);
const upper=new THREE.Group(),lower=new THREE.Group();scene.add(upper,lower);const elbow=sphere(.055,jointMat),wrist=sphere(.038,jointMat);scene.add(elbow,wrist);
function segment(group,length,radius,material){group.clear();const shell=new THREE.Mesh(new THREE.CylinderGeometry(radius*.84,radius,length-.07,24),material);shell.position.y=-length/2;group.add(shell);const band=new THREE.Mesh(new THREE.BoxGeometry(radius*1.45,.057,radius*.7),jointMat);band.position.set(0,-length*.42,radius*.83);group.add(band);const led=sphere(.007,mat('#e2ffad'));led.position.set(.015,-length*.42,radius*1.22);group.add(led)}
let upperLen=.3,lowerLen=.26;function dimensions(){upperLen=Math.min(50,Math.max(15,Number($('upperLength').value)||30))/100;lowerLen=Math.min(45,Math.max(15,Number($('lowerLength').value)||26))/100;segment(upper,upperLen,.051,lime);segment(lower,lowerLen,.042,teal)}dimensions();$('upperLength').onchange=dimensions;$('lowerLength').onchange=dimensions;
const hand=new THREE.Mesh(new THREE.CapsuleGeometry(.033,.075,6,16),teal);scene.add(hand);
const qu=new THREE.Quaternion(),qf=new THREE.Quaternion(),basis=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-Math.PI/2),basisInv=basis.clone().invert();
let device=null,control=null,stream=null,busy=false,demo=false,last=0,seq=null,lost=0,count=0,rateStart=performance.now(),latestFlags=0,calPending=false,calDeadline=0,calCommand=0;
function renderCalibration(flags,progress=0,reason=0){
 const v=calibrationView(flags,progress,calPending,reason);
 $('calStep').textContent=v.ready?'READY':`POSE ${v.step} OF 2`;
 $('calTitle').textContent=v.title;
 $('calInstructions').textContent=v.ready?'You can move your arm now. Recalibrate if either sensor slips.':v.step===2?'Extend your right arm sideways at shoulder height, elbow straight and palm toward the floor. Hold still for 3 seconds.':'Stand upright, right arm straight at your side, palm toward your thigh. Hold still for 3 seconds.';
 $('calibrate').textContent=v.button;$('calibrate').disabled=v.disabled;
 $('calStatus').textContent=v.status;$('calProgress').value=v.capturing?progress:v.ready?100:0;
 $('cancelCalibration').hidden=!v.cancel;$('cancelCalibration').disabled=calPending;
 $('calibrationPanel').classList.toggle('t-pose',v.step===2);
}
function message(s){$('message').textContent=s;if(s.startsWith('Connection failed')||s.startsWith('Open this page'))$('setupDialog').showModal();}
$('connectInSetup').onclick=()=>$('connect').click();
function reset(){$('connectInSetup').textContent='Connect ESP32';control=null;stream=null;busy=false;last=0;seq=null;count=0;lost=0;latestFlags=0;calPending=false;$('connect').disabled=false;$('connect').textContent='Connect ESP32 ↗';$('connection').textContent='Disconnected';$('mode').textContent='PREVIEW';$('calibrate').disabled=true;renderCalibration(0);$('calStatus').textContent='Connect to begin two-pose calibration.';$('upperState').textContent=$('lowerState').textContent='Offline';$('rate').textContent=$('age').textContent=$('lost').textContent='—';$('demo').disabled=false;}
function receive(e){try{const p=decode(e.target.value);const now=performance.now();lost+=sequenceGap(seq,p.sequence);seq=p.sequence;last=now;count++;latestFlags=p.flags;
 for(const [i,q] of [qu,qf].entries()){const a=p.qs[i];q.set(a[1],a[2],a[3],a[0]).premultiply(basis).multiply(basisInv).normalize()}
 const calibrating=!!(p.flags&2),ready=!!(p.flags&1),fault=!!(p.flags&4);
 if(calPending&&((calCommand===1&&calibrating&&!(p.flags&32))||(calCommand===2&&!!(p.flags&32))||(calCommand===3&&!(p.flags&19))))calPending=false;
 renderCalibration(p.flags,p.progress,p.calibrationReason);
 $('mode').textContent=fault?'SENSOR ERROR':calibrating?'CALIBRATING':ready?'LIVE':(p.flags&16)?'T-POSE NEXT':'NEEDS CALIBRATION';$('upperState').textContent=$('lowerState').textContent=fault?'Check wiring':'Streaming';
 }catch(err){message(err.message)}}
$('connect').onclick=async()=>{if(busy)return;if(device?.gatt.connected){device.gatt.disconnect();return}if(!navigator.bluetooth||!isSecureContext){message('Open this page in Chrome on a supported computer, using HTTPS or localhost. This browser cannot access Web Bluetooth.');return}busy=true;$('connect').disabled=true;demo=false;$('demo').textContent='Play demo';try{device=await navigator.bluetooth.requestDevice({filters:[{services:[SERVICE]}]});device.addEventListener('gattserverdisconnected',()=>{reset();message('ESP32 disconnected. Reconnect and calibrate before tracking again.')},{once:true});const server=await device.gatt.connect();const service=await server.getPrimaryService(SERVICE);control=await service.getCharacteristic(CONTROL);stream=await service.getCharacteristic(DATA);stream.addEventListener('characteristicvaluechanged',receive);await stream.startNotifications();
last=0;seq=null;lost=0;count=0;rateStart=performance.now();$('connection').textContent='ESP32 connected';$('connect').textContent='Disconnect';$('demo').disabled=true;renderCalibration(latestFlags);message('Calibrate with two poses: arm down, then right arm extended sideways.');}catch(err){device?.gatt?.disconnect();reset();message(`Connection failed: ${err.message}`)}finally{busy=false;$('connect').disabled=false;$('connectInSetup').textContent=device?.gatt.connected?'Disconnect ESP32':'Connect ESP32';if(device?.gatt.connected&&!$('setupDialog').open)$('setupDialog').showModal();}};
async function calibrationCommand(command){if(!control||calPending)return;calCommand=command;calPending=true;calDeadline=performance.now()+5000;renderCalibration(latestFlags);try{await control.writeValueWithResponse(new Uint8Array([command]));}catch(err){calPending=false;renderCalibration(latestFlags);message(`Calibration failed: ${err.message}`);}}
$('calibrate').onclick=()=>calibrationCommand(calibrationView(latestFlags,0).command);
$('cancelCalibration').onclick=()=>calibrationCommand(3);
$('demo').onclick=()=>{demo=!demo;qu.identity();qf.identity();$('mode').textContent=demo?'DEMO':'PREVIEW';$('demo').textContent=demo?'Stop demo':'Play demo';message(demo?'Simulated movement. Connect the ESP32 for live tracking.':'Connect your ESP32 to start live tracking.');};
const observer=new ResizeObserver(()=>{const r=$('viewport').getBoundingClientRect();camera.aspect=r.width/r.height;camera.updateProjectionMatrix();renderer.setSize(r.width,r.height)});observer.observe($('viewport'));
const arcade=createArcade(renderer,()=>({qu,qf,upperLen,lowerLen,last,flags:latestFlags,calPending,connected:!!device?.gatt.connected}));
const down=new THREE.Vector3(0,-1,0),u=new THREE.Vector3(),f=new THREE.Vector3();let uiTime=0;
renderer.setAnimationLoop(now=>{if(demo&&!arcade.active){qu.setFromEuler(new THREE.Euler(.15*Math.sin(now/1300),0,.32+.25*Math.sin(now/1900)));qf.copy(qu).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-.85-.8*Math.sin(now/1100)))}
 upper.position.copy(shoulder);upper.quaternion.copy(qu);u.copy(down).applyQuaternion(qu);elbow.position.copy(shoulder).addScaledVector(u,upperLen);lower.position.copy(elbow.position);lower.quaternion.copy(qf);f.copy(down).applyQuaternion(qf);wrist.position.copy(elbow.position).addScaledVector(f,lowerLen);hand.position.copy(wrist.position).addScaledVector(f,.07);hand.quaternion.copy(qf);
 if(now-uiTime>100){uiTime=now;$('angle').innerHTML=`${Math.round(THREE.MathUtils.radToDeg(u.angleTo(f)))}<small>°</small>`;if(last){$('age').innerHTML=`${Math.round(now-last)}<small> ms</small>`;$('lost').textContent=lost;if(now-last>500){$('mode').textContent='STALE';$('calibrate').disabled=true;$('upperState').textContent=$('lowerState').textContent='No fresh data';}}if(now-rateStart>=1000){$('rate').innerHTML=last?`${Math.round(count*1000/(now-rateStart))}<small> Hz</small>`:'—';count=0;rateStart=now}if(calPending&&now>calDeadline){calPending=false;renderCalibration(latestFlags);$('calStatus').textContent='No calibration acknowledgement. Try again.'}}
 if(!arcade.tick(now)){orbit.update();renderer.render(scene,camera)}orbit.enabled=!arcade.active;});
