import * as T from 'three';
import {SpellRun,SPELLS} from './spell-logic.js';

export function createSpellGame(scene,feedback,sound){
 const root=new T.Group();scene.add(root);const run=new SpellRun(),models=new Map(),materialCache=new Map();
 const box=new T.BoxGeometry(1,1,1),crystal=new T.OctahedronGeometry(1,0),ring=new T.TorusGeometry(1,.018,5,40),orb=new T.IcosahedronGeometry(1,1);
 const material=(c,glow=false)=>{const key=c+glow;if(!materialCache.has(key))materialCache.set(key,glow?new T.MeshBasicMaterial({color:c}):new T.MeshStandardMaterial({color:c,metalness:.25,roughness:.6}));return materialCache.get(key);};
 function mesh(geo,c,parent,p,s,glow=false){const m=new T.Mesh(geo,material(c,glow));m.position.set(...p);m.scale.set(...s);parent.add(m);return m;}
 const world=new T.Group();root.add(world);mesh(box,'#24283f',world,[0,-.06,-9],[7,.12,23]);
 const portal=new T.Group();world.add(portal);portal.position.set(0,2.3,-11);
 for(let i=0;i<3;i++){const r=mesh(ring,i%2?'#afa1eb':'#7ed8d4',portal,[0,0,0],[2.3-i*.26,2.3-i*.26,1],true);r.rotation.z=i*.3;}
 const pillars=new T.InstancedMesh(crystal,material('#52617a'),24),runes=new T.InstancedMesh(crystal,material('#a4dcdb',true),24),dummy=new T.Object3D();world.add(pillars,runes);
 for(let i=0;i<24;i++){
  const side=i%2?1:-1,z=-Math.floor(i/2)*1.8;dummy.position.set(side*2.8,.5+(i%3)*.12,z);dummy.scale.set(.33,1.05,.36);dummy.rotation.set(.15,0,side*.15);dummy.updateMatrix();pillars.setMatrixAt(i,dummy.matrix);
  dummy.position.set(side*2.8,1.75+(i%3)*.12,z);dummy.scale.setScalar(.065);dummy.updateMatrix();runes.setMatrixAt(i,dummy.matrix);
 }
 for(const x of [-.9,.9])mesh(box,'#7aabae',world,[x,.009,-8],[.025,.018,20],true);
 const glyphPaths={jab:[...Array.from({length:25},(_,i)=>[Math.cos(i/24*Math.PI*2)*.085,Math.sin(i/24*Math.PI*2)*.085,0]),[0,0,0]],hook:[[.1,.08,0],[.1,-.01,0],[.06,-.08,0],[-.04,-.08,0],[-.11,-.02,0],[-.11,.07,0],[-.16,.02,0],[-.11,.07,0],[-.05,.025,0]],uppercut:[[-.1,-.11,0],[-.03,-.1,0],[.03,-.05,0],[.04,.12,0],[-.02,.06,0],[.04,.12,0],[.10,.06,0]]};
 const glyphs={};for(const [type,path] of Object.entries(glyphPaths))glyphs[type]=new T.BufferGeometry().setFromPoints(path.map(p=>new T.Vector3(...p)));
 const lineMaterial=new T.LineBasicMaterial({color:'#ffffff'});
 function model(e){
  const node=new T.Group();root.add(node);
  const core=mesh(orb,'#343a59',node,[0,0,0],[.25,.25,.20]);
  const halo=mesh(ring,SPELLS[e.types[e.layer]].color,node,[0,0,.16],[.36,.36,1],true);
  const shell=mesh(crystal,'#737d9d',node,[0,0,-.02],[.32,.36,.18]);shell.rotation.z=Math.PI/4;
  const glyph=new T.Line(glyphs[e.types[e.layer]],lineMaterial);glyph.position.z=.24;node.add(glyph);
  const pips=[-.07,.07].map(x=>mesh(orb,'#ebf8ff',node,[x,-.43,0],[.027,.027,.027],true));
  const m={node,core,halo,shell,glyph,pips,type:null,dead:0,flash:0};models.set(e.id,m);return m;
 }
 // Reuse twelve curved spell trails. No new geometry or materials during casting.
 const bolts=Array.from({length:12},()=>{
  const data=new Float32Array(36),geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(data,3));const line=new T.Line(geometry,new T.LineBasicMaterial({color:'#ffffff',transparent:true,opacity:1,depthWrite:false,blending:T.AdditiveBlending}));line.frustumCulled=false;line.visible=false;root.add(line);
  const head=mesh(orb,'#f5f2ff',root,[0,0,0],[.055,.055,.055],true);head.visible=false;
  return {line,head,data,life:0,from:new T.Vector3(),to:new T.Vector3(),type:'jab'};
 });let cursor=0;
 const handRune=mesh(ring,'#bdb0ff',root,[0,0,0],[.12,.12,.12],true);handRune.visible=false;
 const lobbyOrb={id:-1,x:0,y:1.7,z:-3,types:['jab'],layer:0};
 function clear(){for(const m of models.values())root.remove(m.node);models.clear();for(const b of bolts){b.life=0;b.line.visible=b.head.visible=false;}handRune.visible=false;}
 function reset(){clear();run.reset();}
 function select(on){root.visible=on;reset();if(on)model(lobbyOrb);}
 function projectile(from,e,type){const b=bolts[cursor++%bolts.length];b.from.copy(from);b.to.set(e.x,e.y,e.z);b.type=type;b.life=.32;b.line.visible=b.head.visible=true;b.line.material.color.set(SPELLS[type].color);}
 const point=new T.Vector3(),tmp=new T.Vector3();
 function animate(dt,now,fist,playing=true,effects=true){
  if(!root.visible)return;portal.rotation.z=now*.000045;
  handRune.visible=playing;if(playing){handRune.position.copy(fist).add(tmp.set(0,0,-.07));handRune.rotation.set(.25,0,now*.001);handRune.material=material(SPELLS[run.front?.types[run.front.layer]||'jab'].color,true);}
  const visible=playing?run.enemies: [lobbyOrb],present=new Set(visible.map(e=>e.id));
  for(const [id,m] of models)if(!present.has(id)&&!m.dead){root.remove(m.node);models.delete(id);}
  for(const e of visible){const m=models.get(e.id)||model(e);if(m.dead)continue;
   m.node.position.set(e.x,e.y+Math.sin(now*.002+e.id)*.045,e.z);m.shell.rotation.y=now*.0008;m.halo.rotation.z=-now*.0005;
   const type=e.types[Math.min(e.layer,e.types.length-1)];if(type!==m.type){m.type=type;m.halo.material=material(SPELLS[type].color,true);m.glyph.geometry=glyphs[type];}
   m.flash=Math.max(0,m.flash-dt*5);m.node.scale.setScalar(1+m.flash*.15);m.pips.forEach((p,i)=>p.visible=i<e.types.length-e.layer);
  }
  for(const [id,m] of models)if(m.dead){m.dead+=dt;m.node.rotation.z+=dt*3;m.node.scale.setScalar(Math.max(.02,1-m.dead*3));m.node.position.y+=dt*.6;if(m.dead>.34){root.remove(m.node);models.delete(id);}}
  for(const b of bolts)if(b.life>0){b.life=Math.max(0,b.life-dt);const t=1-b.life/.32;b.line.visible=effects&&b.life>0;b.head.visible=b.line.visible;
   for(let i=0;i<12;i++){const u=Math.max(0,t-i*.018);point.copy(b.from).lerp(b.to,u);if(b.type==='hook')point.x+=Math.sin(u*Math.PI)*.55;if(b.type==='uppercut')point.y-=Math.sin(u*Math.PI)*.55;point.toArray(b.data,i*3);if(i===0)b.head.position.copy(point);}
   b.line.geometry.attributes.position.needsUpdate=true;b.line.material.opacity=(1-t)*.9;
  }
 }
 function tick(dt,fist,sweeps,effects=true){
  for(const event of run.step(dt)){if(event.type==='warn')sound.play('warning');if(event.type==='hurt')feedback('WARD BREACH −1',{kind:'hurt',point:point.set(event.enemy.x,event.enemy.y,-.5)});}
  let consumed=false;
  for(const sweep of sweeps){const event=run.cast(sweep.type);if(!event)continue;consumed=true;const e=event.enemy,m=models.get(e.id);if(m)m.flash=1;
   if(event.type==='deflect'){feedback(`USE ${event.required.toUpperCase()}`,{kind:'spellDeflect',point:point.set(e.x,e.y,e.z),power:.5});}
   else{projectile(fist,e,event.spell);if(m&&event.type==='shatter')m.dead=.001;feedback(`${event.overdrive?'OVERDRIVE · 2×':event.type==='shatter'?'SHATTER':'WARD BROKEN'} +${event.points}`,{kind:SPELLS[event.spell].sound,point:point.set(e.x,e.y,e.z),power:event.type==='shatter'?1.3:.8});}
   break;
  }
  animate(dt,run.time*1000,fist,true,effects);
  const e=run.front,s=e&&SPELLS[e.types[e.layer]];
  return {score:run.score,hp:run.hp,combo:run.combo,bestCombo:run.bestCombo,defeated:run.defeated,accuracy:run.casts?Math.round(run.correct/run.casts*100):0,seconds:Math.max(0,Math.ceil(60-run.time)),over:run.over,consumed,
   opponent:e?{name:s.cue,cue:`${s.name} · ${e.types.length-e.layer} ward${e.types.length-e.layer>1?'s':''}${e.z>-1.55?' · Incoming!':''}`,fraction:(e.types.length-e.layer)/e.types.length,color:s.color}:null,
   detail:run.overdrive>0?`OVERDRIVE · 2× POINTS · ${Math.ceil(run.overdrive)}s`:'Jab → Fire · Hook → Arc · Uppercut → Rise'};
 }
 select(false);return {select,reset,tick,preview(now,dt){animate(dt,now,null,false);}};
}
