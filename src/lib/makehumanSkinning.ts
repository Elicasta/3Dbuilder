import { Bone, BufferAttribute, BufferGeometry, Matrix4, Quaternion, Skeleton, SkinnedMesh, Vector3 } from 'three';
import type { MakeHumanBone } from './makehumanRig';

export interface MakeHumanPose {
  rotations:Record<string,[number,number,number]>;
}
export const MAKEHUMAN_POSES:Record<string,MakeHumanPose>={
  bind:{rotations:{}},
  aPose:{rotations:{'upperarm01.L':[0,0,.42],'upperarm01.R':[0,0,-.42]}},
  relaxed:{rotations:{'upperarm01.L':[0,0,1.18],'upperarm01.R':[0,0,-1.18]}},
  shoulderTest:{rotations:{'upperarm01.L':[0,0,.88],'upperarm01.R':[0,0,-.88]}},
  elbowTest:{rotations:{'upperarm01.L':[0,0,.32],'upperarm01.R':[0,0,-.32],'lowerarm01.L':[0,0,-1.18],'lowerarm01.R':[0,0,1.18]}},
  kneeTest:{rotations:{'upperleg01.L':[-.12,0,0],'upperleg01.R':[.12,0,0],'lowerleg01.L':[.72,0,0],'lowerleg01.R':[.72,0,0]}},
  shoulderRaise:{rotations:{'upperarm01.L':[0,0,-1.35],'upperarm01.R':[0,0,1.35]}},
  elbowFlex:{rotations:{'upperarm01.L':[0,0,-.35],'upperarm01.R':[0,0,.35],'lowerarm01.L':[0,0,-2.15],'lowerarm01.R':[0,0,2.15]}},
  hipFlex:{rotations:{'upperleg01.L':[-1.65,0,0],'upperleg01.R':[-1.65,0,0]}},
  kneeFlex:{rotations:{'upperleg01.L':[-.55,0,0],'upperleg01.R':[-.55,0,0],'lowerleg01.L':[1.9,0,0],'lowerleg01.R':[1.9,0,0]}},
  spineBend:{rotations:{'spine02':[.35,0,0],'spine03':[.35,0,0],'spine04':[.28,0,0]}},
  spineTwist:{rotations:{'spine02':[0,.25,0],'spine03':[0,.30,0],'spine04':[0,.30,0]}},
  neckExtreme:{rotations:{'neck01':[.35,.35,0],'neck02':[.25,.25,0]}}
};

function makeHierarchy(defs:MakeHumanBone[]){
  const byName=new Map<string,Bone>();
  for(const d of defs){const b=new Bone();b.name=d.name;byName.set(d.name,b)}
  for(const d of defs){
    const b=byName.get(d.name)!;
    const parent=d.parent?byName.get(d.parent):null;
    const origin=new Vector3(...d.head);
    if(parent){
      const pd=defs.find(x=>x.name===d.parent)!;
      origin.sub(new Vector3(...pd.head));parent.add(b);
    }
    b.position.copy(origin);
  }
  const roots=defs.filter(d=>!d.parent).map(d=>byName.get(d.name)!);
  return {bones:defs.map(d=>byName.get(d.name)!),roots};
}

export function skinMakeHumanGeometry(geometry:BufferGeometry,defs:MakeHumanBone[],weights:ReturnType<typeof import('./makehumanRig').makeHumanSkinWeights>){
  const boneIndex=new Map(defs.map((d,i)=>[d.name,i]));
  const indices=new Uint16Array(weights.length*4),values=new Float32Array(weights.length*4);
  for(const skin of weights)for(let i=0;i<Math.min(4,skin.influences.length);i++){
    indices[skin.vertex*4+i]=boneIndex.get(skin.influences[i].joint)??0;
    values[skin.vertex*4+i]=skin.influences[i].weight;
  }
  geometry.setAttribute('skinIndex',new BufferAttribute(indices,4));
  geometry.setAttribute('skinWeight',new BufferAttribute(values,4));
  const {bones,roots}=makeHierarchy(defs),skeleton=new Skeleton(bones);
  const mesh=new SkinnedMesh(geometry);
  for(const root of roots)mesh.add(root);
  mesh.bind(skeleton,new Matrix4());
  return {mesh,skeleton,bones};
}

export function applyMakeHumanPose(bones:Bone[],pose:MakeHumanPose){
  for(const bone of bones)bone.quaternion.identity();
  const byName=new Map(bones.map(b=>[b.name,b]));
  for(const [name,euler] of Object.entries(pose.rotations)){
    const bone=byName.get(name);if(!bone)continue;
    const qx=new Quaternion().setFromAxisAngle(new Vector3(1,0,0),euler[0]);
    const qy=new Quaternion().setFromAxisAngle(new Vector3(0,1,0),euler[1]);
    const qz=new Quaternion().setFromAxisAngle(new Vector3(0,0,1),euler[2]);
    bone.quaternion.copy(qx.multiply(qy).multiply(qz));
  }
  bones[0]?.updateWorldMatrix(true,true);
}
