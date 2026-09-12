export const SERVICE='8c310001-7a94-4b2d-b7bb-5de91f2d9a10';
export const DATA='8c310002-7a94-4b2d-b7bb-5de91f2d9a10';
export const CONTROL='8c310003-7a94-4b2d-b7bb-5de91f2d9a10';
export function decode(v){
 if(v.byteLength!==20)throw Error('Unexpected packet length');
 const qs=[4,12].map(o=>{const q=Array.from({length:4},(_,i)=>v.getInt16(o+2*i,true)/32767);const n=Math.hypot(...q);if(n<.8||n>1.2)throw Error('Invalid orientation');return q.map(x=>x/n)});
 return {sequence:v.getUint16(0,true),flags:v.getUint8(2),progress:v.getUint8(3),qs};
}
export function sequenceGap(previous,next){return previous===null?0:Math.max(0,((next-previous+65536)%65536)-1)}
export const HEART='8c310004-7a94-4b2d-b7bb-5de91f2d9a10';
export function decodeHeart(v){
 if(v.byteLength!==8||v.getUint8(0)!==1)throw Error('Unsupported heart-rate packet');
 const flags=v.getUint8(1),bpm=v.getUint16(2,true)/10,beatAge=v.getUint16(4,true);
 if((flags&4)&&(!(flags&1)||!(flags&2)||(flags&8)||bpm<35||bpm>220||beatAge>2500))throw Error('Invalid heart-rate estimate');
 return {flags,bpm,beatAge,sequence:v.getUint16(6,true)};
}
export function heartDisplay(packet,last,now,availability){
 if(availability==='disconnected')return {value:'—',status:'Connect ESP32',valid:false};
 if(availability==='unsupported')return {value:'—',status:'Heart-rate firmware not available',valid:false};
 if(availability==='error')return {value:'—',status:'Heart-rate connection unavailable',valid:false};
 if(!packet)return {value:'—',status:'Waiting for heart sensor…',valid:false};
 if(now-last>1500)return {value:'—',status:'Heart-rate signal stale',valid:false};
 if(packet.flags&8||!(packet.flags&1))return {value:'—',status:'Sensor offline · check wiring',valid:false};
 if(!(packet.flags&2))return {value:'—',status:'Place finger on sensor',valid:false};
 if(!(packet.flags&4)||packet.beatAge+(now-last)>2500)return {value:'—',status:'Acquiring · hold finger still',valid:false};
 return {value:String(Math.round(packet.bpm)),status:'Estimated heart rate · 4 Hz updates',valid:true};
}
