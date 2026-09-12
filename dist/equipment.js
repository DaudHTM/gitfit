import * as T from 'three';

export function createSword(){
 const root=new T.Group(),steel=new T.Group(),neon=new T.Group();root.add(steel,neon);
 const mat=(c,m=.6)=>new T.MeshStandardMaterial({color:c,metalness:m,roughness:.3});
 const silver=mat('#c6dfe5'),edge=mat('#efffff'),gold=mat('#bf9757'),leather=mat('#273c45',.1);
 function add(parent,geo,material,p){const m=new T.Mesh(geo,material);m.position.set(...p);parent.add(m);return m;}
 // Diamond-section steel with a tapered point, modeled around the collision axis.
 const vertices=[],colors=[];const rings=[[.03,.042,.011],[.52,.033,.009],[.72,0,0]];
 for(let r=0;r<2;r++)for(let side=0;side<4;side++){
  const cross=(ring,j)=>{const [y,w,d]=ring;return [[w,y,0],[0,y,d],[-w,y,0],[0,y,-d]][j%4];};
  const a=cross(rings[r],side),b=cross(rings[r],side+1),c=cross(rings[r+1],side),d=cross(rings[r+1],side+1);
  for(const p of [a,b,c,b,d,c]){vertices.push(...p);const color=new T.Color(side%2?'#7897a9':'#e6f4f7');colors.push(color.r,color.g,color.b);}
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();add(steel,geometry,new T.MeshStandardMaterial({vertexColors:true,metalness:.8,roughness:.24,side:T.DoubleSide}),[0,0,0]);
 add(steel,new T.BoxGeometry(.009,.43,.005),gold,[0,.265,.013]);
 const guardPath=new T.CatmullRomCurve3([new T.Vector3(-.145,-.015,0),new T.Vector3(-.09,.016,0),new T.Vector3(0,.027,0),new T.Vector3(.09,.016,0),new T.Vector3(.145,-.015,0)]);
 add(steel,new T.TubeGeometry(guardPath,20,.018,8,false),gold,[0,0,0]);
 const jewel=add(steel,new T.OctahedronGeometry(.027),new T.MeshStandardMaterial({color:'#78b4b2',emissive:'#285552',emissiveIntensity:.4,metalness:.4,roughness:.18}),[0,.017,.017]);jewel.scale.z=.5;
 add(root,new T.CylinderGeometry(.024,.026,.15,12),leather,[0,-.085,0]);
 for(let i=0;i<7;i++){const wrap=add(root,new T.TorusGeometry(.024,.0035,5,16),gold,[0,-.024-i*.018,0]);wrap.rotation.x=Math.PI/2;}
 add(root,new T.CylinderGeometry(.03,.022,.035,10),silver,[0,-.17,0]);add(steel,new T.OctahedronGeometry(.035),gold,[0,-.195,0]);
 add(neon,new T.CylinderGeometry(.03,.027,.09,12),silver,[0,-.018,0]);
 const core=add(neon,new T.CylinderGeometry(.009,.014,.69,12),new T.MeshBasicMaterial({color:'#ecfffe'}),[0,.36,0]);
 add(neon,new T.CapsuleGeometry(.021,.65,5,12),new T.MeshBasicMaterial({color:'#6cfde4',transparent:true,opacity:.55,depthWrite:false}),[0,.36,0]);
 for(let i=0;i<3;i++){const ring=add(neon,new T.TorusGeometry(.032,.004,5,20),new T.MeshBasicMaterial({color:'#83ffee'}),[0,-.012-i*.021,0]);ring.rotation.x=Math.PI/2;}
 const setMode=mode=>{steel.visible=mode!=='saber';neon.visible=mode==='saber';};setMode('sword');return {root,setMode};
}

export function createBird(){
 const root=new T.Group(),body=new T.Group();root.add(body);const mats={};
 const mat=c=>mats[c]??=new T.MeshStandardMaterial({color:c,roughness:.82});
 const ell=(parent,c,p,s)=>{const m=new T.Mesh(new T.SphereGeometry(1,16,10),mat(c));m.position.set(...p);m.scale.set(...s);parent.add(m);return m;};
 ell(body,'#856245',[0,-.03,.02],[.15,.14,.33]);ell(body,'#d7be87',[0,-.10,-.02],[.12,.087,.28]);
 ell(body,'#f2e7cd',[0,.053,-.23],[.098,.113,.13]);ell(body,'#f7edd7',[0,.004,-.29],[.082,.072,.12]);
 const beak=new T.Mesh(new T.ConeGeometry(.036,.13,7),mat('#d79e42'));beak.rotation.x=-Math.PI/2;beak.position.set(0,.005,-.398);body.add(beak);
 ell(body,'#b97a2f',[0,-.018,-.432],[.02,.027,.035]);
 for(const side of [-1,1]){
  ell(body,'#30281d',[side*.078,.066,-.298],[.015,.018,.022]);ell(body,'#e9a644',[side*.09,.064,-.30],[.006,.011,.012]);ell(body,'#101713',[side*.094,.064,-.306],[.004,.008,.008]);
  ell(body,'#f4e9cd',[side*.074,.087,-.301],[.022,.011,.031]);
  const foot=ell(body,'#cc9651',[side*.07,-.137,.10],[.021,.022,.07]);foot.rotation.y=side*.15;
 }
 // Layered, swept flight feathers give the silhouette a tapered, articulated wing.
 const featherGeometry=()=>{const shape=new T.Shape();shape.moveTo(0,0);shape.bezierCurveTo(-.035,-.04,-.045,-.22,0,-.34);shape.bezierCurveTo(.045,-.22,.035,-.04,0,0);const g=new T.ExtrudeGeometry(shape,{depth:.008,bevelEnabled:true,bevelSize:.003,bevelThickness:.003,bevelSegments:1,steps:1});g.rotateX(-Math.PI/2);return g;};
 const feather=featherGeometry();
 const wings=[-1,1].map(side=>{const pivot=new T.Group();pivot.position.set(side*.12,-.11,-.14);root.add(pivot);
  ell(pivot,'#92734d',[side*.26,0,.03],[.31,.043,.145]);ell(pivot,'#b59561',[side*.20,.025,.005],[.23,.025,.098]);
  for(let i=0;i<9;i++){const m=new T.Mesh(feather,mat(i>5?'#493d30':i%2?'#d8bc84':'#b1935f'));m.position.set(side*(.10+i*.071),-.008,.045+i*.016);m.rotation.y=side*(-.18+i*.075);m.scale.set(1.05-i*.03,1,i>5?1.15:1);pivot.add(m);}
  for(let i=0;i<6;i++){const covert=ell(pivot,'#c7a771',[side*(.11+i*.07),.034,.074],[.055,.016,.11]);covert.rotation.y=side*.3;}
  return pivot;
 });
 for(let i=0;i<5;i++){const tail=new T.Mesh(feather,mat(i%2?'#d0b37c':'#785b3e'));tail.position.set((i-2)*.033,-.025,.255);tail.rotation.y=(i-2)*.18;tail.scale.set(.9,1,.78);body.add(tail);}
 return {root,body,wings};
}
