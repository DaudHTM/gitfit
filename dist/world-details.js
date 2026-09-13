import * as T from 'three';

export function createWorldDetails(scene){
 const groups={};for(const name of ['shield']){groups[name]=new T.Group();scene.add(groups[name]);}
 const materials={};const material=(c,glow=false)=>materials[c+glow]??=(glow?new T.MeshBasicMaterial({color:c}):new T.MeshStandardMaterial({color:c,roughness:.85}));
 const box=new T.BoxGeometry(1,1,1),sphere=new T.SphereGeometry(1,24,16);
 function add(parent,geo,c,p,s,glow=false){const m=new T.Mesh(geo,material(c,glow));m.position.set(...p);m.scale.set(...s);parent.add(m);return m;}
 const space=groups.shield;const planet=add(space,sphere,'#9d9ba9',[1.4,6,-17],[3,3,3]);
 const planetRing=new T.Mesh(new T.TorusGeometry(4.2,.14,8,80),material('#c0a485'));planetRing.position.copy(planet.position);planetRing.rotation.set(.9,.2,.2);space.add(planetRing);
 const points=[];for(let i=0;i<140;i++)points.push(Math.sin(i*76.1)*24,2+(i%17)*.7,-6-(i%29));
 const stars=new T.BufferGeometry();stars.setAttribute('position',new T.Float32BufferAttribute(points,3));space.add(new T.Points(stars,new T.PointsMaterial({color:'#dfedf4',size:.055,sizeAttenuation:true})));
 return {select(mode){for(const [name,g] of Object.entries(groups))g.visible=name===mode;},tick(dt){planet.rotation.y+=dt*.015;}};
}
