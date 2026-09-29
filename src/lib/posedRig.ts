import type { CharacterState } from '../types/character';
import { canonicalJoints, type JointName } from './canonicalRig';
import type { PoseState } from './pose';

export interface PosedJoint {
  name: JointName;
  parent: JointName | null;
  position: [number, number, number];
}
type P=[number,number,number];

function rotateZ(point:P,pivot:P,angle:number):P {
  const x=point[0]-pivot[0],y=point[1]-pivot[1],c=Math.cos(angle),s=Math.sin(angle);
  return [pivot[0]+x*c-y*s,pivot[1]+x*s+y*c,point[2]];
}
function rotateX(point:P,pivot:P,angle:number):P {
  const y=point[1]-pivot[1],z=point[2]-pivot[2],c=Math.cos(angle),s=Math.sin(angle);
  return [point[0],pivot[1]+y*c-z*s,pivot[2]+y*s+z*c];
}

export function posedJoints(character:CharacterState, pose:PoseState):PosedJoint[] {
  const base=canonicalJoints(character);
  const map=new Map<JointName,P>(base.map(j=>[j.name,[...j.position] as P]));
  const arm=(side:'L'|'R',shoulder:number,elbow:number)=>{
    const upper=map.get(`upperArm${side}` as JointName)!;
    const lowerName=`lowerArm${side}` as JointName, handName=`hand${side}` as JointName;
    const lower=rotateZ(map.get(lowerName)!,upper,shoulder);
    const handAfterShoulder=rotateZ(map.get(handName)!,upper,shoulder);
    map.set(lowerName,lower); map.set(handName,rotateZ(handAfterShoulder,lower,elbow));
  };
  arm('L',pose.leftShoulderZ,pose.leftElbowZ); arm('R',pose.rightShoulderZ,pose.rightElbowZ);
  const leg=(side:'L'|'R',hip:number,knee:number)=>{
    const upper=map.get(`upperLeg${side}` as JointName)!;
    const lowerName=`lowerLeg${side}` as JointName,footName=`foot${side}` as JointName,toeName=`toe${side}` as JointName;
    const lower=rotateX(map.get(lowerName)!,upper,hip);
    const foot=rotateX(map.get(footName)!,upper,hip);
    const toe=rotateX(map.get(toeName)!,upper,hip);
    map.set(lowerName,lower); map.set(footName,rotateX(foot,lower,knee)); map.set(toeName,rotateX(toe,lower,knee));
  };
  leg('L',pose.leftHipX,pose.leftKneeX); leg('R',pose.rightHipX,pose.rightKneeX);
  return base.map(j=>({name:j.name,parent:j.parent,position:map.get(j.name)!}));
}
