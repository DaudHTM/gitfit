import test from 'node:test';import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three/three.module.min.js';
import {batchStaticMeshes} from '../dist/scene-batch.js';

test('static batching preserves nested world transforms while reducing draws',()=>{
 const root=new T.Group(),parent=new T.Group();root.position.set(3,1,-2);root.rotation.y=.7;parent.position.set(-2,0,1);parent.rotation.z=.3;root.add(parent);
 const geo=new T.BoxGeometry(),material=new T.MeshStandardMaterial(),original=[];
 for(let i=0;i<24;i++){const m=new T.Mesh(geo,material);m.position.set(i*.5,Math.sin(i),-i);m.rotation.y=i*.13;m.scale.set(1+i*.1,.5,1);parent.add(m);original.push(m);}
 root.updateMatrixWorld(true);const before=original.map(m=>m.matrixWorld.clone()),report=batchStaticMeshes(T,root);assert.deepEqual(report,{replaced:24,batches:1,savedDrawCalls:23});
 root.updateMatrixWorld(true);const batch=root.children.find(m=>m.isInstancedMesh),instance=new T.Matrix4();
 for(let i=0;i<24;i++){batch.getMatrixAt(i,instance);instance.premultiply(batch.matrixWorld);for(let j=0;j<16;j++)assert.ok(Math.abs(instance.elements[j]-before[i].elements[j])<2e-6);}
 assert.ok(batch.boundingSphere.radius>1);assert.equal(batch.geometry,geo);assert.equal(batch.material,material);
});
test('animated exclusions, transparent objects, mirrors and visibility are retained',()=>{
 const root=new T.Group(),geo=new T.BoxGeometry(),mat=new T.MeshStandardMaterial(),moving=new T.Group(),transparent=new T.MeshBasicMaterial({transparent:true}),keep=[];root.add(moving);
 for(let i=0;i<3;i++){const m=new T.Mesh(geo,mat);moving.add(m);keep.push(m);const glass=new T.Mesh(geo,transparent);root.add(glass);keep.push(glass);const mirror=new T.Mesh(geo,mat);mirror.scale.x=-1;root.add(mirror);keep.push(mirror);const hidden=new T.Mesh(geo,mat);hidden.visible=false;root.add(hidden);keep.push(hidden);}
 assert.equal(batchStaticMeshes(T,root,{exclude:[moving]}).batches,0);assert.ok(keep.every(m=>m.parent));
 root.visible=false;for(let i=0;i<3;i++)root.add(new T.Mesh(geo,mat));assert.equal(batchStaticMeshes(T,root,{exclude:[moving]}).batches,1);
});
