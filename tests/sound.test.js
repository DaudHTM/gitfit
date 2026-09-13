import test from 'node:test';
import assert from 'node:assert/strict';
import {MUSIC_THEMES,musicEvents} from '../dist/music.js';
import {createSound} from '../dist/sound.js';

class Param{
 constructor(value=0){this.value=value;}
 setValueAtTime(value,time){assert.ok(Number.isFinite(value)&&Number.isFinite(time));this.value=value;}
 exponentialRampToValueAtTime(value,time){assert.ok(value>0&&Number.isFinite(time));this.value=value;}
 setTargetAtTime(value,time,constant){assert.ok(Number.isFinite(value)&&time>=0&&constant>0);this.value=value;}
 cancelScheduledValues(){}
}
function audioFixture(){
 const callbacks=new Map();let sequence=0,context;
 class Node{
  constructor(type){this.type=type;this.gain=new Param();this.frequency=new Param();this.pan=new Param();this.Q=new Param();for(const key of ['threshold','knee','ratio','attack','release'])this[key]=new Param();this.connections=[];this.started=false;this.stopped=false;this.end=Infinity;}
  connect(target){this.connections.push(target);return target;}
  disconnect(){this.connections=[];}
  start(at=0){assert.ok(Number.isFinite(at));this.started=true;}
  stop(at){this.stopped=at===undefined;if(at!==undefined)this.end=at;else this.onended?.();}
 }
 class Audio{
  constructor(){context=this;this.currentTime=0;this.sampleRate=8000;this.state='suspended';this.destination={};this.nodes=[];}
  create(type){const n=new Node(type);this.nodes.push(n);return n;}
  createGain(){return this.create('gain');}createOscillator(){return this.create('oscillator');}createBiquadFilter(){return this.create('filter');}createStereoPanner(){return this.create('panner');}createBufferSource(){return this.create('source');}createDynamicsCompressor(){return this.create('compressor');}createConvolver(){return this.create('convolver');}
  createBuffer(channels,length){const data=Array.from({length:channels},()=>new Float32Array(length));return {getChannelData:i=>data[i]};}
  resume(){this.state='running';return Promise.resolve();}
  advance(seconds){this.currentTime+=seconds;for(const n of this.nodes)if(!n.stopped&&n.end<=this.currentTime){n.stopped=true;n.onended?.();}for(const f of [...callbacks.values()])f();}
 }
 const sound=createSound({window:{AudioContext:Audio},setInterval(fn){callbacks.set(++sequence,fn);return sequence;},clearInterval(id){callbacks.delete(id);}});
 return {sound,get ctx(){return context;},callbacks};
}

test('all seven scores have bounded musical notes and quiet, drum-free lobby arrangements',()=>{
 assert.equal(Object.keys(MUSIC_THEMES).length,7);
 for(const mode of Object.keys(MUSIC_THEMES))for(let step=0;step<256;step++){
  const notes=musicEvents(mode,step,true,.9);assert.ok(notes.length<12);
  for(const note of notes){assert.ok(note.gain>0&&note.gain<=.25);if(note.kind==='note'){assert.ok(note.frequency>30&&note.frequency<5000);assert.ok(note.duration>0&&note.duration<4);}}
  assert.ok(musicEvents(mode,step,false).every(e=>e.kind==='note'));
 }
 assert.equal(MUSIC_THEMES.saber.bpm,120); // The game's one-second cuts sit on every second beat.
});

test('audio stays locked before interaction, schedules music after unlock, and stops on pause',async()=>{
 const f=audioFixture();f.sound.setScene('bird',true);assert.equal(f.ctx,undefined);assert.equal(f.callbacks.size,0);
 f.sound.unlock();await Promise.resolve();assert.equal(f.sound.status.state,'running');assert.equal(f.callbacks.size,1);assert.ok(f.sound.status.voices>0);
 f.sound.play('ring');const count=f.ctx.nodes.length;f.sound.stop();assert.equal(f.sound.status.voices,0);assert.equal(f.callbacks.size,0);assert.equal(f.sound.status.scene,null);
 assert.ok(f.ctx.nodes.filter(n=>n.started).every(n=>n.stopped));f.ctx.advance(5);assert.equal(f.ctx.nodes.length,count);
});

test('mute, independent sliders, scene changes, and long scheduling gaps do not leak voices',async()=>{
 const f=audioFixture();f.sound.setScene('saber',true);f.sound.unlock();await Promise.resolve();
 for(let i=0;i<30;i++){f.ctx.advance(.25);assert.ok(f.sound.status.voices<45);}
 f.sound.setMusicVolume(0);assert.equal(f.sound.status.voices,0);f.ctx.advance(2);assert.equal(f.sound.status.voices,0);
 f.sound.play('punch',{power:1.5,pan:.5});assert.ok(f.sound.status.voices>0);f.ctx.advance(1);
 f.sound.setEffectsVolume(0);f.sound.play('hurt');assert.equal(f.sound.status.voices,0);
 f.sound.setMusicVolume(.5);f.ctx.advance(25);assert.ok(f.sound.status.voices<20);
 assert.equal(f.sound.toggle(),true);assert.equal(f.sound.status.voices,0);assert.equal(f.callbacks.size,0);
 f.sound.setScene('sword',true);assert.equal(f.callbacks.size,0);assert.equal(f.sound.toggle(),false);await Promise.resolve();assert.equal(f.callbacks.size,1);assert.equal(f.sound.status.scene,'sword');
 f.sound.stop();assert.equal(f.callbacks.size,0);
});

test('all action cues construct finite, bounded envelopes',async()=>{
 const f=audioFixture();f.sound.unlock();await Promise.resolve();
 for(const kind of ['punch','knockout','armor','slash','slashSwing','block','hurt','miss','flap','step','growl','target','ring','bell','beat','finish','defeat','select','warning','parry','riposte','firebolt','arcSpell','riseSpell','spellDeflect','challenge']){f.sound.play(kind,{power:1.6,pan:-.7});assert.ok(f.sound.status.voices>0);f.ctx.advance(2);assert.equal(f.sound.status.voices,0);}
});
