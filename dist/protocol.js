export const SERVICE='8c310001-7a94-4b2d-b7bb-5de91f2d9a10';
export const DATA='8c310002-7a94-4b2d-b7bb-5de91f2d9a10';
export const CONTROL='8c310003-7a94-4b2d-b7bb-5de91f2d9a10';
export function decode(v){
 if(v.byteLength!==20)throw Error('Unexpected packet length');
 const qs=[4,12].map(o=>{const q=Array.from({length:4},(_,i)=>v.getInt16(o+2*i,true)/32767);const n=Math.hypot(...q);if(n<.8||n>1.2)throw Error('Invalid orientation');return q.map(x=>x/n)});
 return {sequence:v.getUint16(0,true),flags:v.getUint8(2),progress:v.getUint8(3)<=100?v.getUint8(3):0,calibrationReason:v.getUint8(3)>=129&&v.getUint8(3)<=136?v.getUint8(3)-128:0,qs};
}
export function sequenceGap(previous,next){return previous===null?0:Math.max(0,((next-previous+65536)%65536)-1)}
export function calibrationView(flags,progress,pending=false,reason=0){
 const supported=!!(flags&128),capturing=!!(flags&2),waiting=!!(flags&16),t=!!(flags&32),ready=!!(flags&1),fault=!!(flags&4);
 const step=waiting?2:1;
 const sensor=reason<=4?'Upper-arm':'Forearm';
 const issue=['rotation detected','gyro readings unstable','acceleration unstable','acceleration outside expected range'][(reason-1)%4];
 const diagnostic=reason?`${sensor}: ${issue}. ${capturing?'Capture restarted — hold still.':'Could not capture. Check the sensor mounting and retry.'}`:'';
 const status=!supported?'Flash the two-pose firmware to calibrate.':fault?'Sensor error. Check both IMU connections.':pending?'Waiting for ESP32…':diagnostic?diagnostic:capturing?`Hold still… ${progress}%`:flags&64?'Poses were not perpendicular. Straighten your elbow and extend sideways.':flags&8?'Too much movement. Hold still and try this pose again.':ready?'Both sensor orientations learned. Ready to play.':waiting?'Arm-down saved. Extend your right arm sideways, palm down.':'Hold your right arm down at your side, palm toward your thigh.';
 return {step,status,command:waiting?2:1,disabled:!supported||capturing||pending||fault,cancel:supported&&(capturing||waiting),title:ready?'Calibration complete':step===2?'Right arm in a T-pose':'Arm straight down',button:capturing?'Capturing…':step===2?'Capture T-pose':ready?'Recalibrate':'Capture arm-down',capturing,ready,t};
}
