import * as T from 'three';
const COLORS={firebolt:'#ffaf72',arcSpell:'#a9a3ff',riseSpell:'#89f3d3',spellDeflect:'#8b8fae',parry:'#e3faff',riposte:'#afffe0',punch:'#ffd19b',knockout:'#ffe5ae',armor:'#d8e7ff',slash:'#8fffe5',block:'#88dfff',ring:'#ffdc79',target:'#c8ffa0',hurt:'#de785a',miss:'#c2c6c9'};

// Fixed pools keep repeated hits from allocating geometry or growing draw calls.
export function createImpactEffects(scene){
 const root=new T.Group();scene.add(root);const count=144,dummy=new T.Object3D(),color=new T.Color();
 const shards=new T.InstancedMesh(new T.OctahedronGeometry(1,0),new T.MeshBasicMaterial({transparent:true,opacity:.85,depthWrite:false,blending:T.AdditiveBlending}),count);shards.instanceMatrix.setUsage(T.DynamicDrawUsage);shards.frustumCulled=false;root.add(shards);
 const particles=Array.from({length:count},()=>({p:new T.Vector3(),v:new T.Vector3(),life:0,total:1,size:.01,spin:0}));let cursor=0,ringCursor=0,arcCursor=0,enabled=true,particlesActive=false;
 function pool(n,geometry){return Array.from({length:n},()=>{const mesh=new T.Mesh(geometry,new T.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending}));mesh.visible=false;root.add(mesh);return {mesh,life:0,total:1,power:1,rotation:0};});}
 const rings=pool(12,new T.TorusGeometry(1,.018,6,48)),arcs=pool(8,new T.TorusGeometry(1,.045,6,30,Math.PI*1.25));
 const flash=new T.PointLight('#ffd3a4',0,2.4,2);root.add(flash);
 const streakData=new Float32Array(24*6),streakGeometry=new T.BufferGeometry();streakGeometry.setAttribute('position',new T.BufferAttribute(streakData,3));
 const streaks=new T.LineSegments(streakGeometry,new T.LineBasicMaterial({color:'#e9fff8',transparent:true,opacity:0,depthWrite:false}));streaks.frustumCulled=false;scene.add(streaks);
 const streakState=Array.from({length:24},(_,i)=>({x:(i%2?1:-1)*(1+(i%5)*.3),y:Math.sin(i*7.3)*1.4,z:-1-(i%8)*.65}));
 let glow=0,flightSpeed=0,flightVisible=false;const vignette=document.getElementById('impactVignette');
 function ring(point,kind,power,slash=false,angle=0){const slot=slash?arcs[arcCursor++%arcs.length]:rings[ringCursor++%rings.length];slot.life=slot.total=slash?.3:.46;slot.power=power;slot.rotation=angle;slot.mesh.position.copy(point);slot.mesh.material.color.set(COLORS[kind]||COLORS.punch);slot.mesh.visible=true;}
 function burst(point,kind='punch',power=1,direction=null){
  if(!enabled||!point)return;power=T.MathUtils.clamp(power,.3,1.5);const p=point.isVector3?point:new T.Vector3(...point),shade=COLORS[kind]||COLORS.punch;
  const total=kind==='knockout'?36:kind==='ring'?24:18;
  for(let i=0;i<total;i++){const particle=particles[cursor++%count];particle.p.copy(p);particle.life=particle.total=.22+Math.random()*.42;particle.size=(.012+Math.random()*.018)*power;particle.spin=Math.random()*6;particle.v.set((Math.random()-.5)*3,(Math.random()-.3)*2.6,(Math.random()-.5)*2.4).multiplyScalar(power);if(direction)particle.v.addScaledVector(direction,.45);color.set(shade);shards.setColorAt((cursor-1)%count,color);}
  particlesActive=true;shards.instanceColor.needsUpdate=true;ring(p,kind,power);
  if(['slash','armor','parry','riposte','arcSpell','riseSpell'].includes(kind))ring(p,kind,power,true,direction?Math.atan2(direction.y,direction.x):-.5);
  if(kind==='knockout'||kind==='riposte')ring(p,kind,power*1.6);
  flash.position.copy(p);flash.color.set(shade);flash.intensity=kind==='knockout'?6:3*power;
  glow=Math.min(.28,power*(kind==='hurt'?.25:.12));vignette.style.setProperty('--impact-color',kind==='hurt'?'201,72,53':kind==='block'?'99,190,236':'239,190,112');
 }
 function clear(){particlesActive=false;shards.visible=false;for(const p of particles)p.life=0;for(const r of [...rings,...arcs]){r.life=0;r.mesh.visible=false;}flash.intensity=0;glow=0;vignette.style.opacity='0';streaks.visible=false;}
 function tick(dt,camera,{effects=true,flight=false,speed=0,paused=false}={}){
  enabled=effects;root.visible=effects;if(!effects){clear();return;}if(paused){streaks.visible=false;vignette.style.opacity='0';return;}
  if(particlesActive){let alive=0;for(let i=0;i<count;i++){const p=particles[i];p.life=Math.max(0,p.life-dt);if(p.life){alive++;p.v.y-=dt*1.6;p.p.addScaledVector(p.v,dt);p.v.multiplyScalar(Math.exp(-dt*2));dummy.position.copy(p.p);dummy.rotation.set(p.spin+p.life*4,p.spin,p.life*5);dummy.scale.set(p.size,p.size*.5,p.size*(p.life/p.total));}else dummy.scale.setScalar(0);dummy.updateMatrix();shards.setMatrixAt(i,dummy.matrix);}shards.visible=alive>0;shards.instanceMatrix.needsUpdate=true;particlesActive=alive>0;}
  for(const r of [...rings,...arcs])if(r.life>0){r.life=Math.max(0,r.life-dt);const progress=1-r.life/r.total;r.mesh.quaternion.copy(camera.quaternion);r.mesh.rotateZ(r.rotation);r.mesh.scale.setScalar((.035+progress*.3)*r.power);r.mesh.material.opacity=(1-progress)**2*.65;r.mesh.visible=r.life>0;}
  flash.intensity*=Math.exp(-dt*20);glow*=Math.exp(-dt*13);vignette.style.opacity=String(glow);
  flightVisible=flight&&speed>3.8;flightSpeed=Math.max(0,speed-3.8);streaks.visible=flightVisible;
  if(flightVisible){streaks.position.copy(camera.position);streaks.quaternion.copy(camera.quaternion);streaks.material.opacity=Math.min(.22,flightSpeed*.045);for(let i=0;i<24;i++){const s=streakState[i];s.z+=dt*(4+flightSpeed);if(s.z>-.8)s.z=-5.5;const at=i*6;streakData.set([s.x,s.y,s.z,s.x,s.y,s.z-.12-flightSpeed*.04],at);}streakGeometry.attributes.position.needsUpdate=true;}
 }
 clear();return {burst,tick,clear,setEnabled(value){enabled=!!value;root.visible=enabled;if(!enabled)clear();}};
}
