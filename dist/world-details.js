import * as T from 'three';
import {batchStaticMeshes} from './scene-batch.js';

export function createWorldDetails(scene){
 const groups={};for(const name of ['sword','saber','shield','targets']){groups[name]=new T.Group();scene.add(groups[name]);}
 const materials={};const material=(c,glow=false)=>materials[c+glow]??=(glow?new T.MeshBasicMaterial({color:c}):new T.MeshStandardMaterial({color:c,roughness:.85}));
 const box=new T.BoxGeometry(1,1,1),sphere=new T.SphereGeometry(1,24,16);
 function add(parent,geo,c,p,s,glow=false){const m=new T.Mesh(geo,material(c,glow));m.position.set(...p);m.scale.set(...s);parent.add(m);return m;}
 const castle=groups.sword;add(castle,box,'#343c3e',[0,-.05,-8],[13,.1,27]);
 for(const side of [-1,1])for(let i=0;i<7;i++){
  const z=1-i*3;add(castle,box,'#394144',[side*3.3,1.6,z],[.55,3.2,.65]);add(castle,box,'#67706c',[side*3.3,3.2,z],[.8,.18,.9]);
  add(castle,box,'#273537',[side*3.7,1.2,z-1.5],[.2,2.4,2.45]);
  for(let n=0;n<3;n++)add(castle,box,'#67706c',[side*3.7,2.5,z-.5-n*.7],[.36,.35,.32]);
  add(castle,box,'#754c3c',[side*3.25,2.35,z-.52],[.02,1.1,.65]);add(castle,box,'#caac6a',[side*3.235,2.4,z-.52],[.03,.33,.11]);
  add(castle,box,'#b69563',[side*2.5,.02,z],[.06,.03,.65]);
 }
 const neon=groups.saber,archGeometry=new T.TorusGeometry(2.4,.017,6,48,Math.PI);
 for(let i=0;i<9;i++){
  const color=i%2?'#9777dd':'#6de7d6';const arch=new T.Mesh(archGeometry,material(color,true));arch.position.set(0,.08,-i*2.6);neon.add(arch);
  add(neon,box,color,[0,.018,-i*2.6],[2.8,.018,.04],true);
 }
 const space=groups.shield;const planet=add(space,sphere,'#9d9ba9',[1.4,6,-17],[3,3,3]);
 const planetRing=new T.Mesh(new T.TorusGeometry(4.2,.14,8,80),material('#c0a485'));planetRing.position.copy(planet.position);planetRing.rotation.set(.9,.2,.2);space.add(planetRing);
 const points=[];for(let i=0;i<140;i++)points.push(Math.sin(i*76.1)*24,2+(i%17)*.7,-6-(i%29));
 const stars=new T.BufferGeometry();stars.setAttribute('position',new T.Float32BufferAttribute(points,3));space.add(new T.Points(stars,new T.PointsMaterial({color:'#dfedf4',size:.055,sizeAttenuation:true})));
 const targetRoom=groups.targets,targetRingGeometry=new T.TorusGeometry(.26,.035,8,40);add(targetRoom,box,'#20383b',[0,1.65,-4.7],[6.3,3.3,.12]);
 for(let i=0;i<5;i++){const ring=new T.Mesh(targetRingGeometry,material(i%2?'#e9b776':'#a8dcbc',true));ring.position.set((i-2)*1.05,1.7+Math.sin(i)*.4,-4.55);targetRoom.add(ring);add(targetRoom,sphere,'#d6e7bd',ring.position.toArray(),[.045,.045,.025],true);}
 for(const group of [castle,neon,targetRoom])batchStaticMeshes(T,group);
 return {select(mode){for(const [name,g] of Object.entries(groups))g.visible=name===mode;},tick(dt){planet.rotation.y+=dt*.015;}};
}
