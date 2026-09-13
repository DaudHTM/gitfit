import * as T from 'three';
import {GuardCourse,GUARD,GUARD_WAVES,guardPosition,guardShotPosition,guardCue} from './guard-logic.js';

export function createGuardGame(parent,camera,feedback,sound){
 const root=new T.Group();parent.add(root);const course=new GuardCourse(),keys=new Set();
 let position=[.18,1.3],pointer=null,dragging=false,playing=false,practiceEnabled=false,pulse=0;
 const viewport=document.getElementById('viewport'),raycaster=new T.Raycaster(),plane=new T.Plane(new T.Vector3(0,0,1),-GUARD.plane),intersection=new T.Vector3();
 const resetInput=()=>{keys.clear();pointer=null;dragging=false;playing=false;};
 window.addEventListener('keydown',e=>{if(playing&&practiceEnabled&&root.visible&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)&&!/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)){keys.add(e.key);pointer=null;e.preventDefault();}});
 window.addEventListener('keyup',e=>keys.delete(e.key));window.addEventListener('blur',resetInput);
 function aim(e){const r=viewport.getBoundingClientRect();camera.updateMatrixWorld();raycaster.setFromCamera({x:(e.clientX-r.left)/r.width*2-1,y:1-(e.clientY-r.top)/r.height*2},camera);if(raycaster.ray.intersectPlane(plane,intersection))pointer=[intersection.x,intersection.y];}
 viewport.addEventListener('pointerdown',e=>{if(playing&&practiceEnabled&&root.visible&&e.target.tagName==='CANVAS'){dragging=true;viewport.setPointerCapture(e.pointerId);aim(e);}});
 viewport.addEventListener('pointermove',e=>{if(dragging&&playing)aim(e);});
 viewport.addEventListener('pointerup',()=>dragging=false);viewport.addEventListener('pointercancel',resetInput);
 const shield=new T.Group();root.add(shield);
 const shieldMaterial=new T.MeshBasicMaterial({color:'#80d7ee',transparent:true,opacity:.15,side:T.DoubleSide,depthWrite:false});
 shield.add(new T.Mesh(new T.CircleGeometry(GUARD.radius,36),shieldMaterial));
 const rim=new T.Mesh(new T.TorusGeometry(GUARD.radius,.012,6,6),new T.MeshBasicMaterial({color:'#a9e9ff'}));shield.add(rim);
 const hub=new T.Mesh(new T.TorusGeometry(.055,.008,5,24),rim.material);hub.position.z=.01;shield.add(hub);
 const spokes=new T.BufferGeometry().setFromPoints(Array.from({length:12},(_,i)=>new T.Vector3(Math.cos(Math.floor(i/2)*Math.PI/3)*(i%2?.20:.09),Math.sin(Math.floor(i/2)*Math.PI/3)*(i%2?.20:.09),.005)));shield.add(new T.LineSegments(spokes,new T.LineBasicMaterial({color:'#b5e6ed',transparent:true,opacity:.45})));
 const rockGeo=new T.IcosahedronGeometry(1,1),trailGeo=new T.ConeGeometry(1,1,7),markerGeo=new T.TorusGeometry(1,.035,5,36);
 const rockMaterial=new T.MeshStandardMaterial({color:'#b08a71',roughness:.8}),ionMaterial=new T.MeshBasicMaterial({color:'#f3cc89'}),tailMaterial=new T.MeshBasicMaterial({color:'#84cce1',transparent:true,opacity:.28,depthWrite:false});
 // All six hazards and landing markers are allocated once, then reused.
 const pool=Array.from({length:6},()=>{
  const node=new T.Group(),marker=new T.Group();root.add(node,marker);
  const rock=new T.Mesh(rockGeo,rockMaterial),core=new T.Mesh(rockGeo,ionMaterial),tail=new T.Mesh(trailGeo,tailMaterial);node.add(rock,core,tail);tail.rotation.x=Math.PI/2;tail.position.z=-.3;tail.scale.set(.08,.65,.08);core.scale.setScalar(.055);
  const markerMaterial=new T.MeshBasicMaterial({color:'#a3e8f1',transparent:true,opacity:.7,depthWrite:false}),ring=new T.Mesh(markerGeo,markerMaterial),center=new T.Mesh(markerGeo,markerMaterial);center.scale.setScalar(.065);marker.add(ring,center);node.visible=marker.visible=false;
  return {id:null,node,marker,rock,core,ring};
 });
 function reset(on=false){course.reset();position=[.18,1.3];resetInput();root.visible=on;pulse=0;for(const slot of pool){slot.id=null;slot.node.visible=slot.marker.visible=false;}}
 function tick(dt,fist,practice,samples=[]){
  playing=true;practiceEnabled=practice;
  const latest=samples.at(-1)?.time;
  const recent=practice?[]:samples.slice(-12).filter(s=>latest-s.time<=100);
  const frames=recent.length?recent:[null],events=[];
  for(const sample of frames){const before=position;position=guardPosition(position,dt/frames.length,[...keys],practice?pointer:sample?[sample.p[0],sample.p[1]]:[fist.x,fist.y]);events.push(...course.step(dt/frames.length,before,position));}
  for(const event of events){const point=new T.Vector3(...event.shot.target,GUARD.plane);
   if(event.type==='miss')feedback('BREACH −1',{kind:'hurt',point,power:.65});
   else {pulse=1;feedback(`${event.surge?'SURGE':event.perfect?'PERFECT':'BLOCK'} +${event.points}`,{kind:event.surge?'shieldSurge':event.perfect?'perfectBlock':'block',point,power:event.perfect?1.2:.8});}
  }
  pulse=Math.max(0,pulse-dt*4);shield.position.set(...position,GUARD.plane+.02);shield.scale.setScalar(course.radius/GUARD.radius);rim.rotation.z=course.time*.12;shieldMaterial.opacity=.12+pulse*.22;rim.material.color.set(course.surge>0?'#ffe4a3':'#a9e9ff');
  const ids=new Set(course.shots.map(s=>s.id));for(const slot of pool)if(!ids.has(slot.id)){slot.id=null;slot.node.visible=slot.marker.visible=false;}
  const nearest=course.front;
  for(const shot of course.shots){let slot=pool.find(s=>s.id===shot.id);if(!slot){slot=pool.find(s=>s.id===null);if(!slot)continue;slot.id=shot.id;}
   const remaining=Math.max(0,shot.duration-shot.age),t=remaining/shot.duration;slot.node.visible=true;slot.node.position.set(...guardShotPosition(shot));slot.rock.scale.setScalar(shot.radius);slot.rock.rotation.set(course.time*1.4,course.time+shot.id,shot.id);slot.rock.material=shot.type==='ION'?ionMaterial:rockMaterial;
   slot.marker.visible=shot===nearest||remaining<1.1;slot.marker.position.set(...shot.target,GUARD.plane-.01);slot.ring.scale.setScalar(.11+t*.3);slot.ring.material.color.set(shot.color);slot.ring.material.opacity=shot===nearest?.7:.3;
  }
  return {score:course.score,hp:course.hp,combo:course.combo,bestCombo:course.bestCombo,totalHits:course.totalHits,perfects:course.perfects,seconds:Math.max(0,Math.ceil(60-course.time)),over:course.over,shield:[...position],
   opponent:nearest?{name:guardCue(nearest.target),cue:`${nearest.type} · ${Math.max(0,nearest.duration-nearest.age).toFixed(1)}s`,fraction:Math.max(0,1-nearest.age/nearest.duration),color:nearest.color}:null,
   detail:course.surge>0?`SURGE · WIDER SHIELD · ${Math.ceil(course.surge)}s`:`Wave ${course.wave} · ${GUARD_WAVES[(course.wave-1)%3]}`};
 }
 reset();return {reset,tick,suspend:resetInput,nudge(x,y){if(playing&&practiceEnabled){pointer=null;position=guardPosition(position,.1,[],[position[0]+x*.16,position[1]+y*.16]);}}};
}
