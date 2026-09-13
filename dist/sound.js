import {MUSIC_THEMES,musicEvents,noteFrequency} from './music.js';
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,Number.isFinite(v)?v:0));

export function createSound(environment={}){
 const host=environment.window||window,timer=environment.setInterval||setInterval,cancelTimer=environment.clearInterval||clearInterval;
 let ctx,master,musicBus,sfxBus,noiseBuffer,reverb,wet,ambient,muted=false,musicVolume=.48,effectsVolume=.8,scene=null,playing=false,intensity=.3,interval=null,step=0,nextAt=0,origin=0;
 const voices=new Set();
 function gainTo(node,value,time=.04){if(!node||!ctx)return;node.gain.cancelScheduledValues(ctx.currentTime);node.gain.setTargetAtTime(value,ctx.currentTime,time);}
 function register(source,nodes,bus){const voice={source,nodes,bus};voices.add(voice);source.onended=()=>{for(const n of [source,...nodes])n.disconnect();voices.delete(voice);};return source;}
 function clearVoices(bus){for(const v of voices)if(!bus||v.bus===bus){try{v.source.stop();}catch{}for(const n of [v.source,...v.nodes])n.disconnect();voices.delete(v);}}
 function route(node,bus,pan=0,echo=false){const p=ctx.createStereoPanner();p.pan.value=clamp(pan,-1,1);node.connect(p);p.connect(bus);if(echo)p.connect(wet);return p;}
 function tone(f,end,duration,level,type='sine',at=ctx.currentTime,bus=sfxBus,pan=0,attack=.006){
  const o=ctx.createOscillator(),g=ctx.createGain(),filter=ctx.createBiquadFilter();o.type=type;o.frequency.setValueAtTime(Math.max(15,f),at);o.frequency.exponentialRampToValueAtTime(Math.max(15,end),at+duration);filter.type='lowpass';filter.frequency.value=bus===musicBus?type==='sawtooth'?1250:3200:8000;
  g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(Math.max(.0002,level),at+Math.min(attack,duration*.3));g.gain.exponentialRampToValueAtTime(.0001,at+duration);o.connect(filter);filter.connect(g);const p=route(g,bus,pan,bus===musicBus);register(o,[filter,g,p],bus);o.start(at);o.stop(at+duration+.02);
 }
 function noise(duration,frequency,level,band='lowpass',at=ctx.currentTime,bus=sfxBus,pan=0){
  const n=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();n.buffer=noiseBuffer;f.type=band;f.Q.value=.7;f.frequency.setValueAtTime(frequency,at);f.frequency.exponentialRampToValueAtTime(Math.max(80,frequency*.35),at+duration);g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(Math.max(.0002,level),at+.008);g.gain.exponentialRampToValueAtTime(.0001,at+duration);n.connect(f);f.connect(g);const p=route(g,bus,pan);register(n,[f,g,p],bus);n.start(at);n.stop(at+duration+.01);
 }
 function schedule(){
  if(!scene||!ctx||ctx.state!=='running'||muted||musicVolume===0)return;
  const eighth=30/MUSIC_THEMES[scene].bpm;
  if(nextAt<ctx.currentTime-.15){step=Math.max(step,Math.ceil((ctx.currentTime-origin)/eighth));nextAt=origin+step*eighth;}
  // At most a small lookahead; never schedule a backlog after a hidden tab.
  let budget=8;while(nextAt<ctx.currentTime+.12&&budget-->0){
   for(const e of musicEvents(scene,step,playing,intensity)){
    if(e.kind==='note')tone(e.frequency,e.frequency*.999,e.duration,e.gain,e.type,nextAt,musicBus,e.pan,e.duration>.7?.08:.009);
    else if(e.kind==='kick')tone(125,43,.19,e.gain,'sine',nextAt,musicBus);
    else if(e.kind==='snare'){noise(.12,2400,e.gain,'bandpass',nextAt,musicBus);tone(175,115,.08,e.gain*.6,'triangle',nextAt,musicBus);}
    else noise(.045,6500,e.gain,'highpass',nextAt,musicBus,step%2?.2:-.2);
   }
   step++;nextAt=origin+step*eighth;
  }
 }
 function startAmbient(){
  if(!ctx||!scene||ambient)return;const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();source.buffer=noiseBuffer;source.loop=true;filter.type='lowpass';filter.frequency.value=MUSIC_THEMES[scene].air;gain.gain.value=.0001;source.connect(filter);filter.connect(gain);gain.connect(musicBus);source.start();ambient={source,filter,gain};
 }
 function startScheduler(time=0){
  if(interval!==null)cancelTimer(interval);interval=null;if(!ctx||!scene||muted)return;
  origin=ctx.currentTime+.025-time;const eighth=30/MUSIC_THEMES[scene].bpm;step=Math.ceil(time/eighth);nextAt=origin+step*eighth;startAmbient();schedule();interval=timer(schedule,25);
 }
 function unlock(){
  const Audio=host.AudioContext||host.webkitAudioContext;if(!Audio)return;
  if(!ctx){ctx=new Audio({latencyHint:'interactive'});master=ctx.createGain();musicBus=ctx.createGain();sfxBus=ctx.createGain();const limiter=ctx.createDynamicsCompressor();limiter.threshold.value=-12;limiter.knee.value=18;limiter.ratio.value=5;limiter.attack.value=.003;limiter.release.value=.18;musicBus.connect(master);sfxBus.connect(master);master.connect(limiter);limiter.connect(ctx.destination);
   noiseBuffer=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);const noiseData=noiseBuffer.getChannelData(0);for(let i=0;i<noiseData.length;i++)noiseData[i]=Math.random()*2-1;
   reverb=ctx.createConvolver();const impulse=ctx.createBuffer(2,Math.floor(ctx.sampleRate*.7),ctx.sampleRate);for(let c=0;c<2;c++){const data=impulse.getChannelData(c);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(1-i/data.length)**3;}
   reverb.buffer=impulse;wet=ctx.createGain();wet.gain.value=.09;wet.connect(reverb);reverb.connect(musicBus);
  }
  gainTo(master,muted?0:.58);gainTo(musicBus,musicVolume);gainTo(sfxBus,effectsVolume);
  ctx.resume().then(()=>{if(scene&&interval===null)startScheduler();}).catch(()=>{});
 }
 function stop(){
  if(interval!==null)cancelTimer(interval);interval=null;scene=null;clearVoices();
  if(ambient){try{ambient.source.stop();}catch{}ambient.source.disconnect();ambient.filter.disconnect();ambient.gain.disconnect();ambient=null;}
  // Cut convolution tails as well, so a paused/hidden round is quiet immediately.
  if(reverb){reverb.disconnect();reverb.connect(musicBus);gainTo(musicBus,0,.015);}
 }
 function setScene(mode,isPlaying=false,time=0){stop();scene=MUSIC_THEMES[mode]?mode:'zombies';playing=isPlaying;intensity=.3;if(ctx){gainTo(musicBus,musicVolume,.15);startScheduler(time);}}
 function play(kind='hit',options={}){
  if(!ctx||ctx.state!=='running'||muted||effectsVolume===0)return;
  const p=clamp(options.power??1,.25,1.6),pan=clamp(options.pan??0,-1,1),at=ctx.currentTime,variation=.94+Math.random()*.12;
  const t=(f,end,d,l,type='sine',delay=0)=>tone(f*variation,end*variation,d,l*p,type,at+delay,sfxBus,pan);
  const n=(d,f,l,band='lowpass',delay=0)=>noise(d,f,l*p,band,at+delay,sfxBus,pan);
  if(kind==='select'){t(420,600,.065,.08);return;}
  if(kind==='whoosh'||kind==='slashSwing'||kind==='flap'){n(kind==='flap'?.26:.18,kind==='slashSwing'?3200:1100,.12,'bandpass');if(kind==='flap')n(.22,350,.09);return;}
  if(kind==='hit'||kind==='punch'||kind==='knockout'){t(150,38,.17,.3);t(62,27,.23,.2);n(.075,2100,.25);n(.2,450,.1);if(kind==='knockout'){t(85,22,.48,.22);n(.38,950,.17);[57,60,64].forEach((m,i)=>t(noteFrequency(m),noteFrequency(m),.42,.065,'triangle',.05+i*.085));}return;}
  if(kind==='armor'||kind==='slash'){n(.17,4300,.2,'bandpass');[620,1027,1633].forEach((f,i)=>t(f,f*.8,.24+i*.065,.06/(i+1),'triangle'));if(kind==='slash')t(90,30,.22,.18);return;}
  if(kind==='warning'){t(540,580,.11,.045,'sine');t(720,760,.12,.045,'sine',.16);return;}
  if(kind==='parry'){n(.08,5300,.22,'bandpass');[740,1110,1665].forEach((f,i)=>t(f,f*.998,.42,.1/(i+1),'sine',i*.008));t(130,50,.19,.17);return;}
  if(kind==='riposte'){n(.14,3800,.2,'bandpass');t(110,28,.3,.25);[67,74,79].forEach((m,i)=>t(noteFrequency(m),noteFrequency(m),.4,.07,'triangle',i*.07));return;}
  if(kind==='block'){t(220,70,.22,.18);[440,660,995].forEach((f,i)=>t(f,f*.99,.34,.055/(i+1),'sine',i*.012));n(.13,3800,.13,'bandpass');return;}
  if(kind==='hurt'){t(88,26,.28,.32);n(.25,650,.22);return;}
  if(kind==='miss'){t(230,160,.13,.045,'triangle');return;}
  if(kind==='step'){n(.055,220,.055);t(62,40,.06,.03);return;}
  if(kind==='growl'){t(58,41,.48,.055,'sawtooth');n(.42,390,.035,'bandpass');return;}
  if(kind==='ring'||kind==='target'){const chord=kind==='ring'?[72,76,79]:[76,83];chord.forEach((m,i)=>t(noteFrequency(m),noteFrequency(m),.3,.06,'sine',i*.035));if(kind==='target')n(.07,2200,.14);return;}
  if(kind==='bell'){[520,1042,1567].forEach((f,i)=>t(f,f*.998,.8-i*.12,.11/(i+1)));return;}
  if(kind==='beat'){t(92,42,.12,.07);return;}
  if(kind==='defeat'){[48,43,38].forEach((m,i)=>t(noteFrequency(m),noteFrequency(m)*.98,.55,.075,'triangle',i*.12));return;}
  if(kind==='finish'||kind==='win'){[60,64,67,72].forEach((m,i)=>t(noteFrequency(m),noteFrequency(m),.45,.07,'triangle',i*.09));return;}
 }
 function update(value=.3,speed=0,time=null){intensity=clamp(value);if(ambient){ambient.filter.frequency.setTargetAtTime(MUSIC_THEMES[scene].air+(scene==='bird'?Math.max(0,speed-2)*180:0),ctx.currentTime,.2);gainTo(ambient.gain,scene==='bird'?.014+clamp(speed/10)*.075:playing?.011:.006,.25);}
  if(scene&&playing&&time!==null&&ctx?.state==='running'&&!muted&&Math.abs((ctx.currentTime-origin)-time)>.2){clearVoices(musicBus);startScheduler(time);}
 }
 return {unlock,play,stop,setScene,update,
  setMusicVolume(value){musicVolume=clamp(value);gainTo(musicBus,musicVolume);if(musicVolume===0)clearVoices(musicBus);},
  setEffectsVolume(value){effectsVolume=clamp(value);gainTo(sfxBus,effectsVolume);},
  toggle(){muted=!muted;if(muted){gainTo(master,0,.015);clearVoices();if(interval!==null)cancelTimer(interval);interval=null;}else{unlock();gainTo(master,.58);startScheduler();}return muted;},
  get muted(){return muted;},
  get status(){return {state:ctx?.state||'locked',scene,playing,muted,musicVolume,effectsVolume,voices:voices.size,scheduling:interval!==null};},
  pulse(){if(!scene||!playing||!ctx)return 0;const phase=Math.max(0,ctx.currentTime-origin)*MUSIC_THEMES[scene].bpm/60;return Math.exp(-(phase%1)*7);}
 };
}
