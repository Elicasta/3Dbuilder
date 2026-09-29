import { Vector3 } from 'three';
import type { CharacterState } from '../types/character';
import { canonicalJoints, type JointName } from './canonicalRig';
import type { PoseState } from './pose';

export interface PosedJoint {
  name: JointName;
  parent: JointName | null;
  position: [number, number, number];
}

function rotateZ(point: Vector3, pivot: Vector3, angle:number) {
  point.sub(pivot);
  const x=point.x, y=point.y, c=Math.cos(angle), s=Math.sin(angle);
  point.x=x*c-y*s; point.y=x*s+y*c;
  return point.add(pivot);
}
function rotateX(point: Vector3, pivot: Vector3, angle:number) {
  point.sub(pivot);
  const y=point.y, z=point.z, c=Math.cos(angle), s=Math.sin(angle);
  point.y=y*c-z*s; point.z=y*s+z*c;
  return point.add(pivot);
}

export function posedJoints(character:CharacterState, pose:PoseState):PosedJoint[] {
  const base=canonicalJoints(character);
  const map=new Map(base.map(j=>[j.name,new Vector3(...j.position)]));
  const arm=(side:'L'|'R', shoulder:number, elbow:number)=>{
    const upper=map.get(`upperArm${side}`)!;
    const lower=map.get(`lowerArm${side}`)!;
    const hand=map.get(`hand${side}`)!;
    rotateZ(lower,upper,shoulder); rotateZ(hand,upper,shoulder);
    rotateZ(hand,lower,elbow);
  };
  arm('L',pose.leftShoulderZ,pose.leftElbowZ); arm('R',pose.rightShoulderZ,pose.rightElbowZ);
  const leg=(side:'L'|'R', hip:number, knee:number)=>{
    const upper=map.get(`upperLeg${side}`)!;
    const lower=map.get(`lowerLeg${side}`)!;
    const foot=map.get(`foot${side}`)!;
    const toe=map.get(`toe${side}`)!;
    rotateX(lower,upper,hip); rotateX(foot,upper,hip); rotateX(toe,upper,hip);
    rotateX(foot,lower,knee); rotateX(toe,lower,knee);
  };
  leg('L',pose.leftHipX,pose.leftKneeX); leg('R',pose.rightHipX,pose.rightKneeX);
  return base.map(j=>({name:j.name,parent:j.parent,position:map.get(j.name)!.toArray() as [number,number,number]}));
}
