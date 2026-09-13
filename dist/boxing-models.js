import * as T from 'three';
import {BOXING_STOP_Z} from './game-logic.js?v=spell-pass3';

// Shared geometry keeps the articulated fighters inexpensive to draw and recycle.
export function createBoxingModels(scene) {
 const sphere=new T.SphereGeometry(1,20,14),cylinder=new T.CylinderGeometry(1,1,1,14),box=new T.BoxGeometry(1,1,1);
 const palette=new Map();
 function mat(color,metal=0){const key=color+metal;if(!palette.has(key))palette.set(key,new T.MeshStandardMaterial({color,roughness:metal?.36:.72,metalness:metal}));return palette.get(key);}
 function part(parent,geometry,color,p,s,metal=0){const m=new T.Mesh(geometry,mat(color,metal));m.position.set(...p);m.scale.set(...s);parent.add(m);return m;}
 function joint(parent,p){const g=new T.Group();g.position.set(...p);parent.add(g);return g;}
 function glove(color,side=1){
  const g=new T.Group();
  part(g,sphere,color,[0,-.06,-.016],[.092,.12,.073]);
  part(g,sphere,color,[0,-.13,-.025],[.098,.067,.07]);
  part(g,sphere,color,[-side*.067,-.065,.026],[.038,.073,.043]).rotation.z=-side*.38;
  part(g,cylinder,'#e2d9c8',[0,.05,0],[.057,.075,.057]);
  part(g,cylinder,color,[0,.029,0],[.067,.045,.066]);
  for(const y of [.048,.065,.081])part(g,cylinder,'#b8b3a7',[0,y,0],[.058,.003,.058]);
  part(g,box,'#f4ddba',[0,-.018,.065],[.042,.035,.006]);
  for(const x of [-.045,-.015,.015,.045])part(g,sphere,color,[x,-.164,-.026],[.021,.025,.051]);
  return g;
 }
 const eyeMaterial=new T.MeshStandardMaterial({color:'#ffd08c',emissive:'#ff7840',emissiveIntensity:1.3});const shadowGeometry=new T.CircleGeometry(.31,24),shadowMaterial=new T.MeshBasicMaterial({color:'#07090a',transparent:true,opacity:.3,depthWrite:false});
 function fighter(index,profile={build:1}){
  const root=new T.Group();scene.add(root);
  const skin=['#8c9983','#909387','#80968b'][index%3],shirt=['#634843','#3f565d','#535042'][index%3];
  const pelvis=joint(root,[0,.82,0]);
  part(pelvis,sphere,'#343b3f',[0,0,0],[.19,.13,.13]);
  const chest=joint(root,[0,1.02,0]);
  chest.scale.set(profile.build,1,profile.build);
  const body=part(chest,sphere,shirt,[0,.10,0],[.245,.28,.155]);
  if(profile.name==='Brute')for(const side of [-1,1]){part(chest,box,'#978665',[side*.16,.25,.13],[.12,.14,.07],.5);part(chest,box,'#7e735f',[side*.09,.06,.16],[.12,.16,.035],.4);}
  if(profile.name==='Runner')part(chest,box,'#80c6ca',[0,.17,.16],[.18,.036,.015]);
  part(chest,sphere,shirt,[-.12,.21,.065],[.13,.11,.1]);part(chest,sphere,shirt,[.12,.21,.065],[.13,.11,.1]);
  part(chest,cylinder,skin,[0,.36,0],[.067,.12,.067]);
  part(chest,box,'#2c3130',[0,.13,.146],[.027,.31,.012]);
  for(const y of [.06,.15,.24])part(chest,sphere,'#ad9e81',[.013,y,.157],[.008,.008,.006]);
  const head=joint(chest,[0,.47,.018]);
  part(head,sphere,skin,[0,.02,0],[.143,.169,.129]);
  const jaw=part(head,sphere,skin,[0,-.09,.034],[.111,.063,.096]);
  part(head,sphere,'#414a43',[0,.145,-.025],[.139,.042,.105]);
  for(const side of [-1,1]){
   part(head,sphere,skin,[side*.145,0,0],[.027,.049,.027]);
   part(head,sphere,'#303b33',[side*.059,.028,.109],[.044,.031,.025]);
   const eye=part(head,sphere,'#ffd08c',[side*.06,.025,.132],[.022,.012,.01]);eye.material=eyeMaterial;
   part(head,box,'#475044',[side*.061,.063,.117],[.072,.013,.02]).rotation.z=side*.18;
   part(head,sphere,skin,[side*.09,-.031,.085],[.046,.054,.049]);
  }
  part(head,sphere,skin,[0,-.01,.13],[.024,.041,.028]);
  part(head,box,'#343833',[0,-.073,.121],[.10,.022,.01]);
  for(const x of [-.033,0,.034])part(head,box,'#c9c4a9',[x,-.069,.131],[.02,.012,.008]);
  const legs=[],arms=[];
  for(const side of [-1,1]){
   const hip=joint(root,[side*.108,.82,0]);legs.push(hip);
   part(hip,sphere,'#394347',[0,-.19,0],[.095,.235,.097]);
   const knee=joint(hip,[0,-.39,.005]);part(knee,sphere,'#394347',[0,0,0],[.088,.085,.087]);
   part(knee,cylinder,'#394347',[0,-.17,0],[.069,.33,.073]);
   part(knee,sphere,'#262e32',[0,-.345,.055],[.091,.063,.153]);hip.userData.knee=knee;
   const shoulder=joint(chest,[side*.24,.23,0]);arms.push(shoulder);
   part(shoulder,sphere,shirt,[0,-.058,0],[.095,.13,.105]);
   part(shoulder,sphere,skin,[0,-.19,0],[.069,.17,.071]);
   const elbow=joint(shoulder,[0,-.32,0]);part(elbow,sphere,skin,[0,-.11,0],[.055,.16,.06]);
   const hand=joint(elbow,[0,-.28,0]);part(hand,sphere,skin,[0,-.02,0],[.062,.073,.035]);
   for(let f=0;f<4;f++)part(hand,sphere,skin,[(f-1.5)*.028,-.081,.014],[.014,.047,.019]).rotation.x=.18;
   part(hand,sphere,skin,[side*.06,-.013,.025],[.025,.049,.024]).rotation.z=-side*.4;
   elbow.rotation.x=-.55;shoulder.rotation.x=-.65;shoulder.userData.elbow=elbow;
  }
  const health=[-.085,.085].map(x=>part(root,box,'#f6c18d',[x,1.83,0],[.13,.02,.02]));
  const shadow=new T.Mesh(shadowGeometry,shadowMaterial);shadow.rotation.x=-Math.PI/2;shadow.position.y=.008;root.add(shadow);
  return {root,body,head,chest,jaw,legs,arms,health,shirt,hp:2,attack:0,flash:0,dead:0,index,step:0};
 }
 function animate(e,time,dt){
  const near=e.root.position.z>BOXING_STOP_Z-.07,gait=time*(near?2:5.5)+e.index*1.7;
  const attack=e.attack/(e.attackPeriod||2.3),windup=T.MathUtils.smoothstep(attack,.60,.89),jab=T.MathUtils.smoothstep(attack,.89,.995);
  e.root.position.y=Math.abs(Math.sin(gait))*(near?.007:.024);
  e.chest.rotation.z=Math.sin(gait)*.035+e.flash*(e.hitSide||.3)*.6;
  e.chest.rotation.x=-windup*.09+jab*.3-e.flash*.7;
  e.head.rotation.z=.07+Math.sin(time*1.7+e.index)*.06;
  e.head.rotation.x=-e.flash*(e.hitLift?1.2:.55);e.head.rotation.y=e.flash*(e.hitSide||0)*1.1;
  e.legs.forEach((l,j)=>{l.rotation.x=Math.sin(gait+j*Math.PI)*(near?.03:.27);l.userData.knee.rotation.x=Math.max(0,-Math.sin(gait+j*Math.PI))*.25;});
  e.arms.forEach((a,j)=>{a.rotation.x=-.55+Math.sin(gait+j*Math.PI)*.09-windup*.15-jab*(j?.5:.9);a.rotation.z=(j?1:-1)*(.12+windup*.12);a.userData.elbow.rotation.x=-.55-windup*.65+jab*.9;});
  e.jaw.position.y=-windup*.01;
 }
 const environment=new T.Group();scene.add(environment);environment.visible=false;
 part(environment,box,'#212a30',[0,-.07,-5],[18,.12,26]);
 part(environment,box,'#303d43',[0,.005,-2.2],[5,.015,8.8]);
 for(const x of [-2.4,2.4]){
  part(environment,box,'#bba17c',[x,.018,-2.2],[.035,.01,8.3]);
  for(const z of [1.8,-2.5,-6.3]){part(environment,cylinder,'#323d45',[x,1,z],[.07,2,.07],.5);part(environment,box,'#816651',[x,1.4,z],[.16,.46,.16]);}
  for(const y of [.55,1,1.45]){const rope=part(environment,cylinder,y===1?'#9f735a':'#63747c',[x,y,-2.25],[.018,8.5,.018]);rope.rotation.x=Math.PI/2;}
 }
 for(let i=0;i<8;i++){for(const side of [-1,1]){part(environment,box,'#1b242b',[side*5,2,-i*2.5],[.32,4,.4]);part(environment,box,'#202c32',[side*6,2,-i*2.5],[2,4,.1]);part(environment,box,'#d4ddcc',[side*3.6,3.8,-i*2.5],[1.4,.04,.17]);}part(environment,box,'#2e3a40',[0,4.3,-i*2.5],[11,.12,.15]);}
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;const ctx=canvas.getContext('2d');ctx.fillStyle='#172029';ctx.fillRect(0,0,1024,512);ctx.textAlign='center';ctx.fillStyle='#d5c0a1';ctx.font='700 100px sans-serif';ctx.fillText('DEAD AHEAD',512,235);ctx.font='28px sans-serif';ctx.fillStyle='#88999e';ctx.fillText('ARMATURE   /   SURVIVE THE ROUND',512,305);
 const sign=new T.Mesh(new T.PlaneGeometry(4.2,2.1),new T.MeshBasicMaterial({map:new T.CanvasTexture(canvas)}));sign.position.set(0,2.5,-9);environment.add(sign);
 const key=new T.PointLight('#ffce9e',11,11,2);key.position.set(-1.5,3.3,1);environment.add(key);const rim=new T.PointLight('#74bcdf',18,15,2);rim.position.set(1.8,3,-4);environment.add(rim);
 function hitVolumes(e){
  e.root.updateMatrixWorld(true);
  const capsule=(node,a,b,radius)=>{const scale=node.getWorldScale(new T.Vector3());return {a:node.localToWorld(new T.Vector3(...a)).toArray(),b:node.localToWorld(new T.Vector3(...b)).toArray(),radius:radius*Math.max(scale.x,scale.z)};};
  return [capsule(e.chest,[0,.04,.02],[0,.19,.02],.235),capsule(e.head,[0,-.06,.025],[0,.095,.015],.15)];
 }
 return {glove,fighter,animate,hitVolumes,environment};
}
