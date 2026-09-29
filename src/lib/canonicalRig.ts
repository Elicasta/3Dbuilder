import type { CharacterState } from '../types/character';

export type JointName =
  | 'root' | 'pelvis' | 'spine01' | 'spine02' | 'chest' | 'neck' | 'head'
  | 'clavicleL' | 'upperArmL' | 'lowerArmL' | 'handL'
  | 'clavicleR' | 'upperArmR' | 'lowerArmR' | 'handR'
  | 'upperLegL' | 'lowerLegL' | 'footL' | 'toeL'
  | 'upperLegR' | 'lowerLegR' | 'footR' | 'toeR';

export type JointPoint = { name: JointName; parent: JointName | null; position: [number, number, number] };

export function canonicalJoints(character: CharacterState): JointPoint[] {
  const m = character.morphs;
  const h = m.height;
  const build = m.build;
  const floor = -1.92;
  const footY = floor + 0.13 * h;
  const hipY = 0.62 * h;
  const legSpan = Math.max(1.25, hipY - footY) * m.legLength;
  const kneeY = hipY - legSpan * 0.52;
  const ankleY = footY + 0.18;
  const shoulderY = 2.02 * h * m.torsoLength;
  const neckY = 2.31 * h * m.torsoLength;
  const headY = 2.72 * h * m.torsoLength + (m.neckLength - 1) * 0.18;
  const hipX = 0.34 * m.hips * build;
  const shoulderX = 0.70 * m.shoulders * build;
  const elbowX = shoulderX + 0.72 * m.armLength;
  const wristX = elbowX + 0.68 * m.armLength;

  const j = (name: JointName, parent: JointName | null, x:number,y:number,z=0): JointPoint =>
    ({ name, parent, position:[x,y,z] });

  return [
    j('root',null,0,floor,0), j('pelvis','root',0,hipY,0),
    j('spine01','pelvis',0,1.02*h*m.torsoLength,0),
    j('spine02','spine01',0,1.48*h*m.torsoLength,0),
    j('chest','spine02',0,1.86*h*m.torsoLength,0),
    j('neck','chest',0,neckY,0), j('head','neck',0,headY,0),
    j('clavicleL','chest',-shoulderX*.58,shoulderY,0),
    j('upperArmL','clavicleL',-shoulderX,shoulderY,0),
    j('lowerArmL','upperArmL',-elbowX,shoulderY,0),
    j('handL','lowerArmL',-wristX,shoulderY,0),
    j('clavicleR','chest',shoulderX*.58,shoulderY,0),
    j('upperArmR','clavicleR',shoulderX,shoulderY,0),
    j('lowerArmR','upperArmR',elbowX,shoulderY,0),
    j('handR','lowerArmR',wristX,shoulderY,0),
    j('upperLegL','pelvis',-hipX,hipY,0), j('lowerLegL','upperLegL',-hipX,kneeY,0),
    j('footL','lowerLegL',-hipX,ankleY,0), j('toeL','footL',-hipX,footY,0.48*m.footSize),
    j('upperLegR','pelvis',hipX,hipY,0), j('lowerLegR','upperLegR',hipX,kneeY,0),
    j('footR','lowerLegR',hipX,ankleY,0), j('toeR','footR',hipX,footY,0.48*m.footSize)
  ];
}

export function jointMap(character: CharacterState) {
  return new Map(canonicalJoints(character).map(joint => [joint.name, joint]));
}
