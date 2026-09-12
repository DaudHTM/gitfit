export const SERVICE='8c310001-7a94-4b2d-b7bb-5de91f2d9a10';
export const DATA='8c310002-7a94-4b2d-b7bb-5de91f2d9a10';
export const CONTROL='8c310003-7a94-4b2d-b7bb-5de91f2d9a10';
export function decode(v){
 if(v.byteLength!==20)throw Error('Unexpected packet length');
 const qs=[4,12].map(o=>{const q=Array.from({length:4},(_,i)=>v.getInt16(o+2*i,true)/32767);const n=Math.hypot(...q);if(n<.8||n>1.2)throw Error('Invalid orientation');return q.map(x=>x/n)});
 return {sequence:v.getUint16(0,true),flags:v.getUint8(2),progress:v.getUint8(3),qs};
}
export function sequenceGap(previous,next){return previous===null?0:Math.max(0,((next-previous+65536)%65536)-1)}
