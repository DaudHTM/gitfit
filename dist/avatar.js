import * as T from 'three';

// One rig is shared by the lobby and gameplay. Segment rotations are absolute
// body-frame rotations so independent upper-arm and forearm IMUs stay independent.
export function createAvatar(){
 const root=new T.Group(),body=new T.Group(),head=new T.Group();root.add(body);body.add(head);
 const palette={skin:'#c98d69',face:'#e3ad87',cloth:'#d8894c',trim:'#f8ce87',pants:'#233039',shoe:'#ece2ce',hair:'#2e2726',dark:'#151d23'};
 const mats={};const material=c=>mats[c]??=new T.MeshStandardMaterial({color:c,roughness:.82});
 const sphere=new T.SphereGeometry(1,18,12),box=new T.BoxGeometry(1,1,1),cylinder=new T.CylinderGeometry(1,1,1,16);
 function part(parent,geo,c,p,s){const m=new T.Mesh(geo,material(c));m.position.set(...p);m.scale.set(...s);parent.add(m);return m;}
 const ell=(parent,c,p,s)=>part(parent,sphere,c,p,s);
 ell(body,palette.cloth,[0,1.115,0],[.224,.295,.128]);
 ell(body,palette.trim,[0,1.345,.025],[.165,.065,.12]);
 part(body,box,palette.cloth,[0,1.135,-.104],[.32,.33,.075]);
 part(body,box,palette.dark,[0,1.13,-.146],[.011,.4,.012]);
 part(body,box,palette.trim,[.115,1.24,-.148],[.055,.012,.009]);
 part(body,box,palette.trim,[.093,1.222,-.148],[.012,.043,.009]);
 for(const side of [-1,1]){
  part(body,box,'#ba7441',[side*.11,.995,-.143],[.085,.008,.012]).rotation.z=side*.16;
  ell(body,palette.pants,[side*.1,.69,0],[.104,.23,.102]);
  const calf=part(body,new T.CapsuleGeometry(.068,.30,6,12),palette.pants,[side*.11,.29,.008],[1,1,1]);calf.rotation.z=side*.035;
  ell(body,palette.shoe,[side*.115,.085,-.052],[.09,.07,.158]);
  part(body,box,'#98a7a5',[side*.115,.05,-.035],[.175,.033,.26]);
  for(let i=0;i<3;i++)part(body,box,palette.trim,[side*.115,.139,-.08+i*.026],[.07,.009,.009]);
 }
 ell(body,palette.pants,[0,.865,0],[.19,.085,.13]);
 part(body,cylinder,palette.skin,[0,1.415,0],[.058,.13,.058]);
 head.position.y=1.575;
 ell(head,palette.skin,[0,0,0],[.113,.141,.105]);
 ell(head,palette.face,[0,-.012,-.035],[.096,.116,.082]);
 ell(head,palette.skin,[0,-.085,-.027],[.077,.043,.066]);
 for(const s of [-1,1]){
  ell(head,palette.skin,[s*.11,-.007,0],[.024,.037,.026]);
  ell(head,'#fff6e8',[s*.041,.016,-.104],[.024,.014,.009]);
  ell(head,palette.dark,[s*.039,.015,-.113],[.010,.011,.004]);
  part(head,box,palette.hair,[s*.042,.044,-.1],[.047,.011,.012]).rotation.z=s*-.1;
 }
 ell(head,palette.skin,[0,-.018,-.117],[.018,.026,.024]);
 ell(head,'#965e4b',[0,-.064,-.103],[.025,.006,.008]);
 ell(head,palette.hair,[0,.101,.002],[.115,.067,.108]);
 for(let i=0;i<5;i++){const tuft=ell(head,palette.hair,[-.083+i*.039,.1,-.07],[.035,.053,.052]);tuft.rotation.z=-.35;}
 ell(head,palette.hair,[.102,.035,.015],[.018,.08,.075]);
 function limb(upper){const g=new T.Group();const r=upper?.065:.046;
  part(g,cylinder,upper?palette.cloth:palette.skin,[0,0,0],[r,1,r]);
  ell(g,upper?palette.cloth:palette.skin,[0,.46,0],[r,.08,r]);
  part(g,cylinder,upper?'#bb7140':palette.dark,[0,-.43,0],[r*1.035,.13,r*1.035]);return g;
 }
 function hand(side){const g=new T.Group();ell(g,palette.skin,[0,-.045,0],[.041,.061,.032]);
  for(let i=0;i<4;i++){ell(g,palette.face,[(i-1.5)*.018,-.078,-.019],[.011,.025,.018]);}
  const thumb=ell(g,palette.face,[side*-.037,-.035,-.015],[.019,.033,.019]);thumb.rotation.z=side*-.5;return g;
 }
 const rightUpper=limb(true),rightLower=limb(false),leftUpper=limb(true),leftLower=limb(false),rightHand=hand(1),leftHand=hand(-1);
 root.add(rightUpper,rightLower,leftUpper,leftLower,rightHand,leftHand);
 const rightShoulder=new T.Vector3(.23,1.35,0),leftShoulder=new T.Vector3(-.23,1.35,0),down=new T.Vector3(0,-1,0),up=new T.Vector3(0,1,0);
 function bone(m,a,b){m.position.copy(a).add(b).multiplyScalar(.5);const v=b.clone().sub(a);m.scale.y=v.length();m.quaternion.setFromUnitVectors(up,v.normalize());}
 function arm(a,b,hand,shoulder,qu,qf,upperLen,lowerLen){const e=down.clone().applyQuaternion(qu).multiplyScalar(upperLen).add(shoulder),w=down.clone().applyQuaternion(qf).multiplyScalar(lowerLen).add(e);bone(a,shoulder,e);bone(b,e,w);hand.position.copy(w);hand.quaternion.copy(qf);}
 function pose(qu,qf,upperLen=.3,lowerLen=.26){arm(rightUpper,rightLower,rightHand,rightShoulder,qu,qf,upperLen,lowerLen);arm(leftUpper,leftLower,leftHand,leftShoulder,new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),-.05),new T.Quaternion(),.3,.26);}
 pose(new T.Quaternion(),new T.Quaternion());
 return {root,body,head,rightUpper,rightLower,leftUpper,leftLower,rightHand,leftHand,pose};
}

export function createLobbyAvatar(renderer,anchor){
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(34,1,.02,20),avatar=createAvatar();scene.add(avatar.root);avatar.root.rotation.y=Math.PI-.12;
 scene.add(new T.HemisphereLight('#fff2da','#4f6868',2.5));const key=new T.DirectionalLight('#fff1d0',3.5);key.position.set(-2,4,4);scene.add(key);const rim=new T.DirectionalLight('#92deef',2.8);rim.position.set(3,3,-2);scene.add(rim);
 const platform=new T.Mesh(new T.CylinderGeometry(.51,.55,.055,64),new T.MeshStandardMaterial({color:'#28383d',metalness:.45,roughness:.45}));platform.position.y=-.025;scene.add(platform);
 const ring=new T.Mesh(new T.TorusGeometry(.5,.008,6,64),new T.MeshBasicMaterial({color:'#eec489'}));ring.rotation.x=Math.PI/2;ring.position.y=.008;scene.add(ring);
 const downQ=new T.Quaternion(),tQ=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),Math.PI/2),u=new T.Quaternion(),f=new T.Quaternion();
 return {render(now,tracking){
  const stage=anchor.getBoundingClientRect(),screen=renderer.domElement.getBoundingClientRect();if(!stage.width||!stage.height)return;
  const fresh=tracking.connected&&tracking.last&&now-tracking.last<500,live=fresh&&(tracking.flags&1)&&!(tracking.flags&6)&&!tracking.calPending;
  const reference=(tracking.flags&16)?tQ:downQ;
  if(live||tracking.demo){u.copy(tracking.qu);f.copy(tracking.qf);}else if(!tracking.connected||!(tracking.flags&1)){u.slerp(reference,.13);f.slerp(reference,.13);}
  avatar.pose(u,f,tracking.upperLen,tracking.lowerLen);
  avatar.head.rotation.y=Math.sin(now*.00045)*.035;
  const label=document.getElementById('avatarLabel');const text=tracking.demo?'Demo':tracking.connected&&!fresh?'Tracking paused':'';if(label.textContent!==text)label.textContent=text;
  ring.material.color.set(live?'#a9dfb2':'#eec489');
  const x=stage.left-screen.left,y=screen.bottom-stage.bottom;
  camera.aspect=stage.width/stage.height;camera.position.set(0,1.04,camera.aspect<.65?3.8:3.2);camera.lookAt(0,.86,0);camera.updateProjectionMatrix();
  renderer.autoClear=false;renderer.setViewport(x,y,stage.width,stage.height);renderer.setScissor(x,y,stage.width,stage.height);renderer.setScissorTest(true);renderer.clearDepth();renderer.render(scene,camera);renderer.setScissorTest(false);renderer.setViewport(0,0,screen.width,screen.height);renderer.autoClear=true;
 }};
}
