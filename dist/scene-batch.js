// Only call for scenery whose child transforms stay fixed. Root transforms may move.
export function batchStaticMeshes(T,root,{exclude=[],minimum=3}={}){
 const skipped=new Set(exclude),buckets=new Map();root.updateMatrixWorld(true);
 function visit(node){
  if(skipped.has(node)||!node.visible)return;
  if(node.isMesh&&!node.isInstancedMesh&&!node.isSkinnedMesh&&!node.morphTargetInfluences&&!Array.isArray(node.material)&&!node.material.transparent&&node.matrixWorld.determinant()>0){
   const key=[node.geometry.uuid,node.material.uuid,node.castShadow,node.receiveShadow,node.renderOrder,node.layers.mask].join(':');
   if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(node);
  }
  for(const child of node.children)visit(child);
 }
 for(const child of root.children)visit(child);
 const inverse=root.matrixWorld.clone().invert(),matrix=new T.Matrix4();let replaced=0,batches=0;
 for(const members of buckets.values()){
  if(members.length<minimum)continue;
  const first=members[0],batch=new T.InstancedMesh(first.geometry,first.material,members.length);batch.name='Static scenery';batch.castShadow=first.castShadow;batch.receiveShadow=first.receiveShadow;batch.renderOrder=first.renderOrder;batch.layers.mask=first.layers.mask;
  members.forEach((m,i)=>{matrix.multiplyMatrices(inverse,m.matrixWorld);batch.setMatrixAt(i,matrix);m.removeFromParent();});
  batch.computeBoundingBox();batch.computeBoundingSphere();root.add(batch);replaced+=members.length;batches++;
 }
 return {replaced,batches,savedDrawCalls:replaced-batches};
}
