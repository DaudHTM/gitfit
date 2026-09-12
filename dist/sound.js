// Small, original procedural effects. Audio is unlocked by Start; no downloads.
export function createSound(){
 let ctx,master,noiseBuffer,muted=false,volume=.45;const active=new Set();
 function unlock(){
  const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
  ctx??=new Audio();
  if(!master){master=ctx.createGain();master.connect(ctx.destination);noiseBuffer=ctx.createBuffer(1,ctx.sampleRate*.7,ctx.sampleRate);const data=noiseBuffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;}
  master.gain.value=muted?0:volume;ctx.resume().catch(()=>{});
 }
 function tone(f,end,duration,level,type='sine',delay=0){
  const o=ctx.createOscillator(),g=ctx.createGain(),at=ctx.currentTime+delay;o.type=type;o.frequency.setValueAtTime(f,at);o.frequency.exponentialRampToValueAtTime(end,at+duration);g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(level,at+.006);g.gain.exponentialRampToValueAtTime(.0001,at+duration);o.connect(g);g.connect(master);o.start(at);o.stop(at+duration+.01);active.add(o);o.onended=()=>{o.disconnect();g.disconnect();active.delete(o);};
 }
 function noise(duration,frequency,level,band='lowpass'){
  const n=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain(),at=ctx.currentTime;n.buffer=noiseBuffer;f.type=band;f.frequency.setValueAtTime(frequency,at);f.frequency.exponentialRampToValueAtTime(Math.max(80,frequency*.3),at+duration);g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(level,at+.012);g.gain.exponentialRampToValueAtTime(.0001,at+duration);n.connect(f);f.connect(g);g.connect(master);n.start();n.stop(at+duration);active.add(n);n.onended=()=>{n.disconnect();f.disconnect();g.disconnect();active.delete(n);};
 }
 function play(kind='hit'){
  if(!ctx||ctx.state!=='running'||muted)return;
  if(kind==='whoosh'||kind==='slash'){noise(.16,kind==='slash'?3400:1700,.16,'bandpass');return;}
  if(kind==='hit'){tone(125,42,.16,.38);noise(.12,1400,.22);return;}
  if(kind==='hurt'){tone(90,27,.27,.35);noise(.25,650,.25);return;}
  if(kind==='step'){noise(.07,230,.08);return;}
  if(kind==='win'){tone(72,24,.4,.36);noise(.25,1500,.3);[440,554,660].forEach((f,i)=>tone(f,f*.995,.35,.07,'sine',i*.08));return;}
  if(kind==='bell'){[520,1042,1567].forEach((f,i)=>tone(f,f*.998,.8-i*.12,.11/(i+1),'sine'));return;}
  if(kind==='beat'){tone(120,45,.11,.18);tone(820,810,.05,.07);return;}
  tone(520,1040,.2,.13);
 }
 return {unlock,play,stop(){for(const n of active){try{n.stop()}catch{}}},setVolume(v){volume=Math.min(1,Math.max(0,v));if(master)master.gain.value=muted?0:volume;},toggle(){muted=!muted;if(master)master.gain.value=muted?0:volume;return muted;}};
}
